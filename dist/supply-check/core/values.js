/**
 * The kinds of a parsed value, and whether two values are the same.
 *
 * isMap, isList: a plain object, or an array.
 * isSame: two values equal as JSON.
 *
 * @example if (isMap(value) === false) return [hitOf(file, [field], value, UNKNOWN_SETTING)];
 */
export const isMap = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
export const isList = (value) => Array.isArray(value);
export const isSame = (one, other) => JSON.stringify(one) === JSON.stringify(other);
