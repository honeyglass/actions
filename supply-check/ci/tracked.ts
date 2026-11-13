/**
 * The check before the install: every tracked dependency file and symlink, read as the index holds it.
 *
 * trackedHits: the hits of the tracked files, and of each file the worktree holds otherwise.
 *
 * The check asks GitHub's API through Node's fetch, so this file alone lends the network.
 *
 * @example const hits = await trackedHits(top, 'honeyglass/blog', process.env.GITHUB_TOKEN);
 */
import { lstat, readFile, readlink } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';
import { $try, anyError, isRefusal } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { isSupplyFile, supplyHits } from '../index.ts';
import type { Fetch, SupplyHit } from '../index.ts';
import { entriesIn, indexedFiles } from './git.ts';
import { kindIn, LINK_MODE } from './kind.ts';
import type { Indexed } from './types.ts';

// The root workspace pnpm reads its settings from; the check refuses a tree without it.
const WORKSPACE = 'pnpm-workspace.yaml';
const DRIFT =
  'the worktree, which pnpm reads, holds other bytes here than the index, as a .gitattributes conversion or a local change writes them';

/**
 * The hits of every tracked dependency file and symlink, read as the index holds it.
 *
 * Every tracked file counts as staged, so the check sees the whole tree that a commit outside
 * lean-code may have changed, and a root pnpm-workspace.yaml the index lacks counts as deleted.
 */
export const trackedHits = async (
  top: string,
  repository: string,
  token: string | undefined,
): Promise<SupplyHit[] | Refusal> => {
  const entries = await entriesIn(top, { tree: undefined, paths: [] });
  if (isRefusal(entries)) return entries;
  const read = entries.filter(({ path, mode }) => isSupplyFile(path, mode));
  const files = await indexedFiles(top, read);
  if (isRefusal(files)) return files;
  const hits = await supplyHits({
    staged: files.map(({ path, mode, bytes }) => ({ path, mode, text: bytes.toString() })),
    deleted: entries.some(({ path }) => path === WORKSPACE) ? [] : [WORKSPACE],
    kindOf: async path => kindIn(entries, path),
    repository,
    fetch: nodeFetch,
    sleep: unrefSleep,
    token,
  });
  if (isRefusal(hits)) return hits;
  return [...(await driftHits(top, files)), ...hits];
};

// GitHub's answer through Node's fetch, its header names in lower case as Headers gives them.
const nodeFetch: Fetch = async (url, init) => {
  const answer = await fetch(url, init);
  const text = await answer.text();
  return { status: answer.status, headers: Object.fromEntries(answer.headers), text };
};

// A wait that holds no exit, so the deadline of a fetch that answered keeps the job no longer.
const unrefSleep = (ms: number) => wait(ms, undefined, { ref: false });

/**
 * A hit for each file the worktree holds otherwise than the index.
 *
 * pnpm reads the worktree, and a .gitattributes conversion, such as working-tree-encoding, eol,
 * ident or a filter, writes other bytes there than the check read. Any difference fails, a file
 * missing or of another type too, so no conversion passes unseen.
 */
const driftHits = async (top: string, files: readonly Indexed[]) => {
  const held = await Promise.all(files.map(file => isAsIndexed(top, file)));
  return files
    .filter((_, i) => held[i] === false)
    .map(({ path }): SupplyHit => ({ file: path, field: '', value: '', reason: DRIFT }));
};

// Every failure to read the worktree counts as a difference, so the check fails closed.
const isAsIndexed = async (top: string, { path, mode, bytes }: Indexed) => {
  const worktree = await $try(worktreeBytes(`${top}/${path}`, mode === LINK_MODE), {
    or: undefined,
    expected: anyError,
  });
  return worktree?.equals(bytes) === true;
};

// A symlink's target or a regular file's content; undefined when the path holds the other type.
const worktreeBytes = async (path: string, isLink: boolean) => {
  const stats = await lstat(path);
  if (isLink) return stats.isSymbolicLink() ? readlink(path, { encoding: 'buffer' }) : undefined;
  return stats.isFile() ? readFile(path) : undefined;
};
