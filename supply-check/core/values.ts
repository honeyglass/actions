/**
 * The kinds of a parsed value, and whether two values are the same.
 *
 * isMap, isList: a plain object, or an array.
 * isSame: two values equal as JSON.
 *
 * @example if (isMap(value) === false) return [hitOf(file, [field], value, UNKNOWN_SETTING)];
 */

export const isMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

export const isList = (value: unknown): value is unknown[] => Array.isArray(value);

export const isSame = (one: unknown, other: unknown) =>
  JSON.stringify(one) === JSON.stringify(other);
