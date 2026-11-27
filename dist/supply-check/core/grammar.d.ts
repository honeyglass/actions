/**
 * The grammars of a dependency value, a resolved version and the git sources that pass.
 *
 * RANGE, ALIAS, WORKSPACE, CATALOG: a registry range, an npm: alias, workspace: and catalog:.
 * RESOLVED, PEER, PINNED_PEER, ALONE, isResolved: a resolved version with its peer suffixes.
 * GIT_SOURCES, sourcesOf: per checked repository, each package name and the repository it
 * may pin.
 * PINNED, HOSTED, GITHOSTED_KEY, EXACT_VERSION: a repository of them at a full commit sha.
 * VERSION_HEADS, KEY_HEADS: the heads of a resolved version and of a snapshot key.
 * PACKAGE_NAME, PEER_RANGE, INTEGRITY: a dependency's name, a package's peer range, its hash.
 * pinsOf: the commits a resolved version or key names by their tarballs, each with its name.
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
 * The git sources each checked repository may use: a package name, and the GitHub repository
 * whose full commit it may pin under that name, each named in full and matched as written.
 *
 * The checked repository is the one the caller names, as for the template's exceptions. One the
 * list does not name may use no git source, nor may a check without a repository. The person
 * approves this list; only the person adds to it.
 */
export declare const GIT_SOURCES: ReadonlyMap<string, ReadonlyMap<string, string>>;
export declare const sourcesOf: (repository: string | undefined) => ReadonlyMap<string, string>;
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
 * or a repository of GIT_SOURCES at a full commit sha, as adx names utils.
 *
 * The person approves this list; every other form is refused.
 */
export declare const PEER_RANGE: RegExp;
export declare const INTEGRITY: RegExp;
/**
 * The commits a resolved version or key names by their tarballs, at its head and in its peers,
 * each with the name it stands under: the one before it in the text, or `head` at a version's
 * head, which names none.
 *
 * Only a text of the lockfile's grammar may be asked, where a tarball stands nowhere but
 * there.
 */
export declare const pinsOf: (text: string, head: string) => {
    name: string;
    repository: string;
    sha: string;
}[];
