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
export type Context = {
    settings: Record<string, unknown>;
    kindOf: Supply['kindOf'];
};
export type Pin = {
    name: string;
    repository: string;
    sha: string;
};
export type Fault = string | {
    pins: Pin[];
} | undefined;
export type Found = SupplyHit & {
    pins?: Pin[];
};
export type Check = (file: Staged, context: Context) => Found[] | Promise<Found[]>;
export type Field = (string | number)[];
export type Where = {
    base: string;
    kindOf: Supply['kindOf'];
};
export type Locked = Record<string, {
    specifier: string;
    version: string;
}>;
