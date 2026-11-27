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
export const isResolved = (text: string, head: RegExp, first = PEER) => {
  let at = 0;
  let depth = 0;
  for (let pattern = head; ; pattern = depth === 1 ? first : PEER) {
    const found = pattern.exec(text.slice(at));
    if (found === null) return false;
    at += found[0].length;
    while (text[at] === ')' && depth > 0) {
      depth -= 1;
      at += 1;
    }
    if (at === text.length) return depth === 0;
    if (text[at] !== '(') return false;
    depth += 1;
    at += 1;
  }
};

// The grammar of a version range, after node-semver: comparators such as '^1.2.3' or '>=1 <2',
// hyphen ranges and '||'. An operator alone takes the space after it, so no run of spaces splits
// two ways and a long value backtracks no more than once per comparator.
const PART = '(?:[xX*]|\\d+)';
const PARTIAL = `${PART}(?:\\.${PART}(?:\\.${PART}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?)?)?`;
const COMPARATOR = `(?:(?:[<>]=?|=|~|\\^)\\s*)?${PARTIAL}`;
const SIMPLE = `(?:${PARTIAL}\\s+-\\s+${PARTIAL}|${COMPARATOR}(?:\\s+${COMPARATOR})*)`;
const RANGE_SET = `\\s*${SIMPLE}(?:\\s*\\|\\|\\s*${SIMPLE})*\\s*`;
export const RANGE = new RegExp(`^${RANGE_SET}$`);
// An npm package name, scoped or not; old names may hold capitals. No part starts with a dot,
// so none is '.' or '..', and the folder pnpm makes of it stays below node_modules.
const NAME = '(?:@[A-Za-z0-9_~-][A-Za-z0-9._~-]*\\/)?[A-Za-z0-9_~-][A-Za-z0-9._~-]*';
// An npm: alias: a package's name, then a registry range, in a manifest as in a peer range.
const ALIASED = `npm:${NAME}@${RANGE_SET}`;
export const ALIAS = new RegExp(`^${ALIASED}$`);
export const WORKSPACE = new RegExp(`^(?:[\\^~]|${RANGE_SET})$`);
export const CATALOG = /^catalog:[A-Za-z0-9._-]*$/;
const VERSION = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?';
// A resolved version, as an alias's 'name@version' too; inside a peer suffix the name is required.
export const RESOLVED = new RegExp(`^(?:${NAME}@)?${VERSION}`);
export const PEER = new RegExp(`^${NAME}@${VERSION}`);
/**
 * The git sources each checked repository may use: a package name, and the GitHub repository
 * whose full commit it may pin under that name, each named in full and matched as written.
 *
 * The checked repository is the one the caller names, as for the template's exceptions. One the
 * list does not name may use no git source, nor may a check without a repository. The person
 * approves this list; only the person adds to it.
 */
export const GIT_SOURCES: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
  [
    'honeyglass/lean-code',
    new Map([
      ['@honeyglass/utils', 'honeyglass/utils'],
      ['@honeyglass/actions', 'honeyglass/actions'],
    ]),
  ],
  [
    'honeyglass/oriko',
    new Map([
      ['@honeyglass/utils', 'honeyglass/utils'],
      ['@honeyglass/adx', 'honeyglass/adx'],
    ]),
  ],
  ['honeyglass/adx', new Map([['@honeyglass/utils', 'honeyglass/utils']])],
  ['honeyglass/actions', new Map([['@honeyglass/utils', 'honeyglass/utils']])],
]);
// The git sources of a checked repository: none for one the list does not name, or none named.
export const sourcesOf = (repository: string | undefined) =>
  (repository === undefined ? undefined : GIT_SOURCES.get(repository)) ?? new Map<string, string>();
// Every repository a git source of the list pins, as a group, its dots escaped. The grammar
// reads a pin of any of them; the checked repository's entry decides the name it stands under.
const REPOSITORY = `(${[
  ...new Set([...GIT_SOURCES.values()].flatMap(sources => [...sources.values()])),
]
  .map(name => name.replaceAll('.', '\\.'))
  .join('|')})`;
// A git source the grammar reads: such a repository at a full commit sha, as the manifest
// names it and as the codeload tarball pnpm 12 resolves it to, with the repository and the sha
// as its groups.
const SHA = '([0-9a-f]{40})';
export const PINNED = new RegExp(`^github:${REPOSITORY}#${SHA}$`);
const CODELOAD = `https://codeload\\.github\\.com/${REPOSITORY}/tar\\.gz/${SHA}`;
// A resolved version that starts with such a tarball, which peer suffixes may follow.
export const HOSTED = new RegExp(`^${CODELOAD}`);
// A git-hosted package key: its name, then the tarball's URL, its repository and its sha as
// groups.
export const GITHOSTED_KEY = new RegExp(`^(${NAME})@(${CODELOAD})$`);
// A peer on the first level behind such a tarball: the name at a registry version, or at
// such a tarball with no peer of its own, as pnpm writes adx's peer on utils.
export const PINNED_PEER = new RegExp(`^${NAME}@(?:${VERSION}|${CODELOAD}(?=\\)))`);
// No peer at all, as no text matches: the peers of a tarball pnpm writes alone.
export const ALONE = /(?!)/;
// The heads of a resolved version: such a tarball, or a registry version, aliased or not.
export const VERSION_HEADS = { hosted: HOSTED, registry: RESOLVED };
// The heads of a snapshot key: the name at such a tarball, or at a registry version.
export const KEY_HEADS = { hosted: new RegExp(`^${NAME}@${CODELOAD}`), registry: PEER };
// A tarball at a value's head, or a peer's or a key's after its name, with the name as a group
// where the text holds one.
const TARBALLS = new RegExp(`(?:^|\\()(?:(${NAME})@)?${CODELOAD}`, 'g');
// The version a git-hosted package holds, without a range or a peer suffix.
export const EXACT_VERSION = new RegExp(`^${VERSION}$`);
// A dependency's name, of which pnpm makes a folder below node_modules and asks the registry.
export const PACKAGE_NAME = new RegExp(`^${NAME}$`);
// A dist-tag that a peer range names beside its ranges, such as 'insiders' in
// '>=3.0.0 || >=4.0.0 || insiders'; it holds no dot, so no tag reads as a tarball's file name.
// A lone x or X is the range's wildcard, so no text reads as both, and none backtracks twice.
const TAG = '(?![xX](?![A-Za-z0-9-]))[A-Za-z][A-Za-z0-9-]*';
/**
 * A package's own peer range as the lockfile holds it, which pnpm installs from where the peer
 * is missing: registry ranges and dist-tags joined by '||', an npm: alias to a registry range,
 * or a repository of GIT_SOURCES at a full commit sha, as adx names utils.
 *
 * The person approves this list; every other form is refused.
 */
export const PEER_RANGE = new RegExp(
  `^(?:\\s*(?:${SIMPLE}|${TAG})(?:\\s*\\|\\|\\s*(?:${SIMPLE}|${TAG}))*\\s*|${ALIASED}|github:${REPOSITORY}#${SHA})$`,
);
// A package's sha512 in SRI form, the hash pnpm checks the fetched bytes against; no weaker one.
export const INTEGRITY = /^sha512-[A-Za-z0-9+/]{86}==$/;

/**
 * The commits a resolved version or key names by their tarballs, at its head and in its peers,
 * each with the name it stands under: the one before it in the text, or `head` at a version's
 * head, which names none.
 *
 * Only a text of the lockfile's grammar may be asked, where a tarball stands nowhere but
 * there.
 */
export const pinsOf = (text: string, head: string) =>
  [...text.matchAll(TARBALLS)].map(([, name = head, repository = '', sha = '']) => ({
    name,
    repository,
    sha,
  }));
