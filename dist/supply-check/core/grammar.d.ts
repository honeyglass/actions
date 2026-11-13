/**
 * The grammars of a dependency value, a resolved version and the one git source that passes.
 *
 * RANGE, ALIAS, WORKSPACE, CATALOG: a registry range, an npm: alias, workspace: and catalog:.
 * RESOLVED, PEER, isResolved: a lockfile's resolved version with its peer suffixes.
 * PINNED, TARBALL, GITHOSTED_KEY, EXACT_VERSION: honeyglass/utils at a full commit sha.
 *
 * Each is an allow-list: a value of any other form fails the check that reads it.
 *
 * @example const pinned = PINNED.exec(value)?.[1];
 */
/**
 * Whether `text` is a resolved version of the lockfile's grammar, such as
 * '8.71.0(eslint@10.12.0(jiti@2.6.1))': `head` at its start, then peer suffixes nested to any depth.
 *
 * It walks the text with a depth count, so no nesting a file holds runs the stack out.
 */
export declare const isResolved: (text: string, head: RegExp) => boolean;
export declare const RANGE: RegExp;
export declare const ALIAS: RegExp;
export declare const WORKSPACE: RegExp;
export declare const CATALOG: RegExp;
export declare const RESOLVED: RegExp;
export declare const PEER: RegExp;
export declare const PINNED: RegExp;
export declare const TARBALL: RegExp;
export declare const GITHOSTED_KEY: RegExp;
export declare const EXACT_VERSION: RegExp;
