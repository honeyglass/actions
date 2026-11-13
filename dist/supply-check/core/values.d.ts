/**
 * The kinds of a parsed value, and whether two values are the same.
 *
 * isMap, isList: a plain object, or an array.
 * isSame: two values equal as JSON.
 *
 * @example if (isMap(value) === false) return [hitOf(file, [field], value, UNKNOWN_SETTING)];
 */
export declare const isMap: (value: unknown) => value is Record<string, unknown>;
export declare const isList: (value: unknown) => value is unknown[];
export declare const isSame: (one: unknown, other: unknown) => boolean;
