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
import type { Check, Context } from './types.ts';
export declare const LINK_MODE = "120000";
export declare const hitsIn: (file: Staged, context: Context) => Promise<import("../types.ts").SupplyHit[]>;
export declare const checkOf: (path: string) => Check | undefined;
/**
 * Whether a path has a segment named node_modules, folded as APFS folds a name.
 *
 * A narrowing beside the check's allow-lists, the person's decision of 2026-11-12: Node loads a
 * package from a folder of this name (nodejs.org/api/modules.html, "Loading from node_modules
 * folders"), so a tracked file there runs in place of a package the lockfile names.
 */
export declare const isInModules: (path: string) => boolean;
