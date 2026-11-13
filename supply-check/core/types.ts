/**
 * The internal types of the supply check, shared by the checks of each file.
 *
 * Context, Where: what a check reads beside a file's text.
 * Pin, Fault, Found: why a value fails, or the commit it pins, and the hit that carries it.
 * Check, Field, Locked: a file's check, a field's path, and a lockfile's locked dependencies.
 *
 * @example import type { Check, Found } from './types.ts';
 */
import type { Staged, Supply, SupplyHit } from '../types.ts';

// The settings a workspace may hold, and what a path of the tree is.
export type Context = { settings: Record<string, unknown>; kindOf: Supply['kindOf'] };
// A commit of honeyglass/utils that a field pins, which passes once GitHub places it on main.
export type Pin = { pin: string };
// Why a value does not pass, or the commit it pins; undefined when it passes.
export type Fault = string | Pin | undefined;
// A hit, or a field that pins a commit, which the check settles once every field is read.
export type Found = SupplyHit & { pin?: string };
export type Check = (file: Staged, context: Context) => Found[] | Promise<Found[]>;
export type Field = (string | number)[];

// Where a dependency resolves its link: from, the folder of its manifest or lockfile importer, and
// what the tree holds at a path.
export type Where = { base: string; kindOf: Supply['kindOf'] };
export type Locked = Record<string, { specifier: string; version: string }>;
