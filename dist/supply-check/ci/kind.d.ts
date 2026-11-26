/**
 * What the index or a tree holds at a path, read from the entries git listed there.
 *
 * LINK_MODE: git's mode of a symlink.
 * kindsIn: what each path holds, answered from one index of the entries.
 *
 * @example const kindOf = kindsIn(entries); const kind = kindOf('packages/a');
 */
import type { Entry, PathKind } from '../index.ts';
export declare const LINK_MODE = "120000";
/**
 * What each path holds: a folder where an entry lies below it, as git lists files and no
 * folder of its own; 120000 a symlink and a blob's mode a file. A submodule, mode 160000, is
 * none, as the repository tracks nothing in it.
 *
 * The entries are sorted once, and a path's first entry from `${path}/` on is found by binary
 * search, so many paths asked of a large tree cost one sort and a log each; each caller lists
 * the index or the tree once per run and asks every path of it.
 */
export declare const kindsIn: (entries: readonly Entry[]) => (path: string) => PathKind | undefined;
