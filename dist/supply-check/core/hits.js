/**
 * A hit as the check writes it: the file, the field's path, the value as shown, and the reason.
 *
 * hitOf, wholeHit: a hit at a field, or one for the whole file.
 * faultHits, valueHits: the hit of a field's fault, a pin's marked for settledHits.
 * schemaHits: the hits of a failed schema check, each at its issue's path.
 * fieldOf: a field's path as one line.
 *
 * A hit reaches CI's log and the commit tool's refusal, so a value that may be a credential is
 * masked, and every character outside UNSAFE_CHAR's allow-list is escaped onto one line.
 *
 * @example return [hitOf(file, [field], value, UNKNOWN_SETTING)];
 */
import { quoted, trySync$, UNSAFE_RUN } from '@honeyglass/utils/ts';
import { DEPENDENCY_FIELDS, STRUCTURE } from "./fields.js";
import { nameOf } from "./paths.js";
import { OFF_MAIN } from "./reasons.js";
import { isList, isMap } from "./values.js";
// What a hit shows in place of a value that may be a credential.
const MASKED = '***';
// What a hit shows in place of a value nested past the stack of JSON.stringify.
const TOO_DEEP = 'nested too deep to show';
// The sections of each file whose keys a dependency, a folder or a catalog names, where a name
// such as next-auth or jsonwebtoken masks nothing; every other key is pnpm's own.
const NAMED_SECTIONS = new Map([
    ['package.json', DEPENDENCY_FIELDS],
    ['pnpm-workspace.yaml', STRUCTURE],
    ['pnpm-lock.yaml', ['importers', 'catalogs', 'packages', 'snapshots']],
]);
// The hits of values whose fault, asked of each, names one.
export const valueHits = async (file, values) => {
    const hits = await Promise.all(values.map(async ({ field, value, fault }) => faultHits(file, field, value, await fault(value))));
    return hits.flat();
};
// The hits of a failed schema check, each at its issue's path; an unknown key is named itself.
export const schemaHits = (file, issues, value) => issues.flatMap(issue => {
    const path = issue.path.map(part => typeof part === 'symbol' ? (part.description ?? '') : part);
    if (issue.code === 'unrecognized_keys') {
        return issue.keys.map(key => hitOf(file, [...path, key], valueAt(value, [...path, key]), 'a key the check does not know'));
    }
    return [hitOf(file, path, valueAt(value, path), 'a value of a form the check does not know')];
});
// A field's hit for its fault; a pin's stands as off main until settledHits settles it.
export const faultHits = (file, field, value, fault) => {
    if (fault === undefined)
        return [];
    if (typeof fault === 'string')
        return [hitOf(file, field, value, fault)];
    return [{ ...hitOf(file, field, value, OFF_MAIN), pin: fault.pin }];
};
export const hitOf = (file, field, value, reason) => ({
    file,
    field: fieldOf(field),
    value: shown(value, file, field),
    reason,
});
export const wholeHit = (file, reason) => ({
    file,
    field: '',
    value: '',
    reason,
});
// A field's path as 'importers.".".dependencies.zod.version': a key with a dot or space quoted, an index in brackets.
export const fieldOf = (path) => path
    .map(part => typeof part === 'number' ? `[${part}]` : `.${/^[\w@/-]+$/.test(part) ? part : quoted(part)}`)
    .join('')
    .replace(/^\./, '');
/**
 * A value as JSON, cut so a long one keeps the reason readable; 'missing' for none.
 *
 * The value under one of pnpm's keys that names a credential, its own or one below it, and a
 * URL's user info never reach the answer, as the secret scan runs on added lines and not on a
 * hit's text. A dependency's name masks nothing, so the refused value of next-auth stays in sight.
 * JSON escapes only the controls below U+0020, so the cut text escapes every character outside
 * UNSAFE_CHAR's allow-list as well, half of a pair the cut split included. A value nested past
 * the stack, which JSON.parse reads and JSON.stringify cannot write, shows as TOO_DEEP, so its
 * hit and every other one still stand.
 */
const shown = (value, file, field) => {
    const isMasking = masksByKey(file, field);
    if (isMasking && field.some(isCredential))
        return MASKED;
    const { data: json, error } = trySync$(() => JSON.stringify(value, (key, item) => (isMasking && isCredential(key) ? MASKED : item)));
    // a value parsed from JSON or YAML holds no cycle and no BigInt, so the stack is the one failure
    if (error !== null)
        return TOO_DEEP;
    const text = json ?? 'missing';
    const masked = text.replace(USER_INFO, `$1${MASKED}@`);
    const cut = masked.length > 80 ? `${masked.slice(0, 77)}...` : masked;
    // quoted() escapes a run as it escapes any text; its own two quotes go
    return cut.replace(UNSAFE_RUN, run => quoted(run).slice(1, -1));
};
// Whether a field lies under pnpm's own keys, such as a setting, and not in a section whose keys
// a dependency, a folder or a catalog names.
const masksByKey = (file, [section]) => {
    const named = NAMED_SECTIONS.get(nameOf(file));
    return named !== undefined && typeof section === 'string' && named.includes(section) === false;
};
const isCredential = (key) => typeof key === 'string' && CREDENTIAL.test(key);
const valueAt = (value, path) => path.reduce((at, key) => {
    if (isList(at) && typeof key === 'number')
        return at[key];
    return isMap(at) ? at[key] : undefined;
}, value);
// The keys whose value may be a credential, such as _authToken or a password.
const CREDENTIAL = /auth|token|password|secret/i;
// A URL's user info, such as 'me:pass@' in 'https://me:pass@host/'.
const USER_INFO = /([a-z][a-z0-9+.-]*:\/\/)[^/@\s"]*@/gi;
