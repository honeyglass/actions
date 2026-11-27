/**
 * The internal types of the supply check, shared by the checks of each file.
 *
 * Context, Where: what a check reads beside a file's text.
 * Pin, Fault, Found: a pinned commit, why a value fails or the commits it pins, and their hit.
 * Check, Field, Locked: a file's check, a field's path, and a lockfile's locked dependencies.
 *
 * @example import type { Check, Found } from './types.ts';
 */
import type { Staged, Supply, SupplyHit } from '../types.ts';

// The settings a workspace may hold, and what a path of the tree is.
export type Context = { settings: Record<string, unknown>; kindOf: Supply['kindOf'] };
// A commit of a repository of GIT_SOURCES that a field pins under a package name, which passes
// once the checked repository's entry binds the name to that repository and GitHub places the
// commit on its main.
export type Pin = { name: string; repository: string; sha: string };
// Why a value does not pass, or the commits it pins; undefined when it passes.
export type Fault = string | { pins: Pin[] } | undefined;
// A hit, or a field that pins commits, which the check settles once every field is read.
export type Found = SupplyHit & { pins?: Pin[] };
export type Check = (file: Staged, context: Context) => Found[] | Promise<Found[]>;
export type Field = (string | number)[];

// Where a dependency resolves its link: from, the folder of its manifest or lockfile importer, and
// what the tree holds at a path.
export type Where = { base: string; kindOf: Supply['kindOf'] };
export type Locked = Record<string, { specifier: string; version: string }>;
