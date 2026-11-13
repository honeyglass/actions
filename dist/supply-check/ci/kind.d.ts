/**
 * What the index or a tree holds at a path, read from the entries git listed there.
 *
 * LINK_MODE: git's mode of a symlink.
 * kindIn: a folder, a symlink, a file, or none.
 *
 * @example const kind = kindIn(entries, 'packages/a');
 */
import type { Entry, PathKind } from '../index.ts';
export declare const LINK_MODE = "120000";
export declare const kindIn: (entries: readonly Entry[], path: string) => PathKind | undefined;
