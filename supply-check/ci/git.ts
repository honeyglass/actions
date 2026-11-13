/**
 * What git answers about the checkout around the working folder: its top level, index and trees.
 *
 * topOf: the top level, from which git names every path.
 * entriesIn, indexedFiles: the entries of the index or a tree, and each entry's bytes there.
 * attributesOf: the attributes by which git converts files in the worktree, as check-attr lists them.
 *
 * A git that fails refuses as `ask`, so a check that could not read its input never passes.
 *
 * @example const entries = await entriesIn(top, { tree: undefined, paths: [] });
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { $try } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { CONVERSIONS, entriesOf, shownPath } from '../index.ts';
import type { Entry } from '../index.ts';
import { STEP } from './constants.ts';
import type { Indexed, Listed } from './types.ts';

const exec = promisify(execFile);
// A lockfile of a large monorepo runs past execFile's 1 MiB default; a larger output fails the
// read, and with it the check.
const MAX_BUFFER = 64 * 1024 * 1024;

// The top level of the checkout, from which git names every path.
export const topOf = async (): Promise<string | Refusal> => {
  const { data, error } = await $try(git(['rev-parse', '--show-toplevel']));
  if (error !== null) {
    return {
      ...GIT_FAILED,
      reason: 'git found no checkout around the working folder, so nothing was checked',
      cause: error,
    };
  }
  return data.toString().replace(/\n$/, '');
};

/**
 * The entries of the index, or of `tree`, at `paths`, a folder's with all below it; every entry
 * for no path.
 *
 * ls-tree takes -r, as without it a folder lists as its own entry and none below it, where
 * ls-files lists every file. --literal-pathspecs keeps a path such as ':(glob)*' from naming
 * other files, and -z a path with a tab or a newline whole.
 */
export const entriesIn = async (
  top: string,
  { tree, paths }: Listed,
): Promise<Entry[] | Refusal> => {
  const listing = tree === undefined ? ['ls-files', '-s', '-z'] : ['ls-tree', '-r', '-z', tree];
  const { data, error } = await $try(git(['--literal-pathspecs', ...listing, '--', ...paths], top));
  if (error !== null) {
    const named = paths.length === 0 ? 'the tracked files' : paths.map(shownPath).join(', ');
    return {
      ...GIT_FAILED,
      reason: `git ${listing[0] ?? ''} could not list ${named}, so their dependency forms went unchecked`,
      cause: error,
    };
  }
  return entriesOf(data.toString());
};

// Each entry's bytes as the index holds them, or `tree` where the caller names one; ':0:' names
// the index's entry, whatever digits the path starts with.
export const indexedFiles = async (
  top: string,
  entries: readonly Entry[],
  tree?: string,
): Promise<Indexed[] | Refusal> => {
  const files: Indexed[] = [];
  for (const entry of entries) {
    const object = `${tree ?? ':0'}:${entry.path}`;
    const { data, error } = await $try(git(['cat-file', 'blob', object], top));
    if (error !== null) {
      return {
        ...GIT_FAILED,
        reason: `git cat-file could not read ${shownPath(entry.path)} whole, so its dependency forms went unchecked`,
        cause: error,
      };
    }
    files.push({ ...entry, bytes: data });
  }
  return files;
};

/**
 * The CONVERSIONS git sets on each path, as `git check-attr -z` lists them, from the index's
 * .gitattributes or the tree's, and from the repository's and the person's own attribute files.
 */
export const attributesOf = async (
  top: string,
  { tree, paths }: Listed,
): Promise<string | Refusal> => {
  const source = tree === undefined ? '--cached' : `--source=${tree}`;
  const argv = ['check-attr', '-z', source, ...CONVERSIONS, '--', ...paths];
  const { data, error } = await $try(git(argv, top));
  if (error !== null) {
    return {
      ...GIT_FAILED,
      reason: `git check-attr could not name the attributes of ${paths.map(shownPath).join(', ')}, so whether git converts them in the worktree went unchecked`,
      cause: error,
    };
  }
  return data.toString();
};

// What git prints for `args`, as bytes; a non-zero exit throws with git's exit code and stderr.
const git = async (args: readonly string[], cwd?: string) => {
  const { stdout } = await exec('git', ['--no-optional-locks', ...args], {
    cwd,
    maxBuffer: MAX_BUFFER,
    encoding: 'buffer',
  });
  return stdout;
};

// The person's to look at, as git could not answer.
const GIT_FAILED = {
  kind: 'ask',
  step: STEP,
  next: 'ask the user why git fails in this checkout',
} as const;
