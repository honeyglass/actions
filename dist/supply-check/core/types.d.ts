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
export type Context = {
    settings: Record<string, unknown>;
    kindOf: Supply['kindOf'];
};
export type Pin = {
    pin: string;
};
export type Fault = string | Pin | undefined;
export type Found = SupplyHit & {
    pin?: string;
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
