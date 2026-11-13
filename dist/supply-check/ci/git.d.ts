import type { Refusal } from '@honeyglass/utils/ts';
import type { Entry } from '../index.ts';
import type { Indexed, Listed } from './types.ts';
export declare const topOf: () => Promise<string | Refusal>;
/**
 * The entries of the index, or of `tree`, at `paths`, a folder's with all below it; every entry
 * for no path.
 *
 * ls-tree takes -r, as without it a folder lists as its own entry and none below it, where
 * ls-files lists every file. --literal-pathspecs keeps a path such as ':(glob)*' from naming
 * other files, and -z a path with a tab or a newline whole.
 */
export declare const entriesIn: (top: string, { tree, paths }: Listed) => Promise<Entry[] | Refusal>;
export declare const indexedFiles: (top: string, entries: readonly Entry[], tree?: string) => Promise<Indexed[] | Refusal>;
/**
 * The CONVERSIONS git sets on each path, as `git check-attr -z` lists them, from the index's
 * .gitattributes or the tree's, and from the repository's and the person's own attribute files.
 */
export declare const attributesOf: (top: string, { tree, paths }: Listed) => Promise<string | Refusal>;
