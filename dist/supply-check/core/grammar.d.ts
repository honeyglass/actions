/**
 * The grammars of a dependency value, a resolved version and the git sources that pass.
 *
 * RANGE, ALIAS, WORKSPACE, CATALOG: a registry range, an npm: alias, workspace: and catalog:.
 * RESOLVED, PEER, PINNED_PEER, ALONE, isResolved: a resolved version with its peer suffixes.
 * REPOSITORIES: the GitHub repositories a git source may name, each in full.
 * PINNED, HOSTED, GITHOSTED_KEY, EXACT_VERSION: one of them at a full commit sha.
 * VERSION_HEADS, KEY_HEADS: the heads of a resolved version and of a snapshot key.
 * PACKAGE_NAME, PEER_RANGE, INTEGRITY: a dependency's name, a package's peer range, its hash.
 * pinsOf: the commits a resolved version or key names by their tarballs.
 *
 * Each is an allow-list: a value of any other form fails the check that reads it.
 *
 * @example const [, repository, sha] = PINNED.exec(value) ?? [];
 */
/**
 * Whether `text` is `head`, then peer suffixes whose first level is of the grammar `first`.
 *
 * The suffixes nest to any depth, as in '8.71.0(eslint@10.12.0(jiti@2.6.1))'; below the
 * first level each is a registry one.
 *
 * It walks the text with a depth count, so no nesting a file holds runs the stack out.
 */
export declare const isResolved: (text: string, head: RegExp, first?: RegExp) => boolean;
export declare const RANGE: RegExp;
export declare const ALIAS: RegExp;
export declare const WORKSPACE: RegExp;
export declare const CATALOG: RegExp;
export declare const RESOLVED: RegExp;
export declare const PEER: RegExp;
/**
 * The GitHub repositories whose commits a git source may pin, each named in full.
 *
 * No owner and no pattern opens a third; only the person adds one.
 */
export declare const REPOSITORIES: string[];
export declare const PINNED: RegExp;
export declare const HOSTED: RegExp;
export declare const GITHOSTED_KEY: RegExp;
export declare const PINNED_PEER: RegExp;
export declare const ALONE: RegExp;
export declare const VERSION_HEADS: {
    hosted: RegExp;
    registry: RegExp;
};
export declare const KEY_HEADS: {
    hosted: RegExp;
    registry: RegExp;
};
export declare const EXACT_VERSION: RegExp;
export declare const PACKAGE_NAME: RegExp;
/**
 * A package's own peer range as the lockfile holds it, which pnpm installs from where the peer
 * is missing: registry ranges and dist-tags joined by '||', an npm: alias to a registry range,
 * or one of REPOSITORIES at a full commit sha, as adx names utils.
 *
 * The person approves this list; every other form is refused.
 */
export declare const PEER_RANGE: RegExp;
export declare const INTEGRITY: RegExp;
/**
 * The commits a resolved version or key names by their tarballs, at its head and in its peers.
 *
 * Only a text of the lockfile's grammar may be asked, where a tarball stands nowhere but
 * there.
 */
export declare const pinsOf: (text: string) => {
    repository: string;
    sha: string;
}[];
