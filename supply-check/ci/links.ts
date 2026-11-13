/**
 * The check after the install: every symlink in the checkout must resolve inside it.
 *
 * linkHits: the hits of each symlink that resolves to no path or to one outside the checkout.
 *
 * Only where a link resolves counts, so a chain that leaves and comes back passes. Every link
 * counts, not only those in a folder named node_modules, which APFS also finds as Node_Modules.
 *
 * @example const hits = await linkHits(top);
 */
import { readdir, readlink, realpath } from 'node:fs/promises';
import { $try, anyError, quoted } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { shownPath } from '../index.ts';
import type { SupplyHit } from '../index.ts';
import { STEP } from './constants.ts';

// The hits of every symlink in the checkout that resolves to no path or to one outside it.
export const linkHits = async (top: string): Promise<SupplyHit[] | Refusal> => {
  const { data, error } = await $try(async () => {
    const root = await realpath(top);
    const links = await symlinksIn(top, '');
    return Promise.all(links.map(link => linkHit(root, top, link)));
  });
  if (error !== null) {
    return {
      kind: 'ask',
      step: STEP,
      reason: `the folders of ${shownPath(top)} could not be read whole, so their symlinks went unchecked`,
      next: 'ask the user why the checkout cannot be read',
      cause: error,
    };
  }
  return data.flat();
};

// The symlinks at `folder` and below, as paths from the top; .git holds none of the checkout's.
const symlinksIn = async (top: string, folder: string): Promise<string[]> => {
  const entries = await readdir(`${top}/${folder}`, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(entry => {
      const path = folder === '' ? entry.name : `${folder}/${entry.name}`;
      if (entry.isSymbolicLink()) return [path];
      if (entry.isDirectory() && path !== '.git') return symlinksIn(top, path);
      return [];
    }),
  );
  return found.flat();
};

// A link's hit, with its target as written; none when it resolves inside the checkout.
const linkHit = async (root: string, top: string, path: string): Promise<SupplyHit[]> => {
  const reason = await linkFault(root, `${top}/${path}`);
  if (reason === undefined) return [];
  const target = await readlink(`${top}/${path}`);
  return [{ file: path, field: '', value: quoted(target), reason }];
};

// Every failure to resolve, such as a missing target or a loop, counts as dangling, so the check
// fails closed.
const linkFault = async (root: string, link: string) => {
  const landed = await $try(realpath(link), { or: undefined, expected: anyError });
  if (landed === undefined) return 'a symlink that dangles';
  const isInside = landed === root || landed.startsWith(`${root}/`);
  return isInside ? undefined : 'a symlink that leaves the checkout';
};
