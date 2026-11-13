/**
 * The check each staged file gets, by its name and git mode.
 *
 * LINK_MODE: git's mode of a symlink.
 * checkOf: the check of a file by its name, folded as APFS folds it; undefined for one not read.
 * isInModules: whether a path lies in a node_modules folder, its segments folded the same way.
 * hitsIn: the hits of one staged file or symlink.
 *
 * @example const hits = await Promise.all(staged.map(file => hitsIn(file, context)));
 */
import type { Staged } from '../types.ts';
import { wholeHit } from './hits.ts';
import { lockfileHits } from './lockfile.ts';
import { manifestHits } from './manifest.ts';
import { npmrcHits } from './npmrc.ts';
import { folded, nameOf } from './paths.ts';
import { LINKED_FILE } from './reasons.ts';
import { symlinkHits } from './symlink.ts';
import type { Check, Context } from './types.ts';
import { workspaceHits } from './workspace.ts';

export const LINK_MODE = '120000';

const IN_MODULES =
  'a path in a node_modules folder, from which Node loads packages and which only the install may fill';

// A path in node_modules fails by its path alone, whatever its name and mode. A symlink under a
// dependency file's name hands pnpm a text the check never read, so its name alone decides.
export const hitsIn = async (file: Staged, context: Context) => {
  if (isInModules(file.path)) return [wholeHit(file.path, IN_MODULES)];
  const check = checkOf(file.path);
  const isLink = file.mode === LINK_MODE;
  if (isLink && check !== undefined) return [wholeHit(file.path, LINKED_FILE)];
  if (isLink) return symlinkHits(file, context);
  return (await check?.(file, context)) ?? [];
};

// The check of a file by its name; a branch lockfile, another manifest form and a pnpmfile never pass.
export const checkOf = (path: string): Check | undefined => {
  const name = nameOf(path);
  if (name === 'package.json') return manifestHits;
  if (name === 'pnpm-workspace.yaml') return workspaceHits;
  if (name === 'pnpm-lock.yaml') return lockfileHits;
  if (name === '.npmrc') return npmrcHits;
  if (/^pnpm-lock\..+\.yaml$/.test(name))
    return refusedFile('a branch lockfile, which only the refused gitBranchLockfile writes');
  if (/^package\.(yaml|json5)$/.test(name))
    return refusedFile(
      'a manifest form pnpm reads in place of package.json, which this check does not read',
    );
  if (/^\.?pnpmfile\.[cm]?js$/.test(name))
    return refusedFile('a pnpmfile, whose code runs at every install');
  return undefined;
};

/**
 * Whether a path has a segment named node_modules, folded as APFS folds a name.
 *
 * A narrowing beside the check's allow-lists, the person's decision of 2026-11-12: Node loads a
 * package from a folder of this name (nodejs.org/api/modules.html, "Loading from node_modules
 * folders"), so a tracked file there runs in place of a package the lockfile names.
 */
export const isInModules = (path: string) =>
  path.split('/').some(segment => folded(segment) === 'node_modules');

const refusedFile =
  (reason: string): Check =>
  ({ path }) => [wholeHit(path, reason)];
