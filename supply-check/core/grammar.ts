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
export const isResolved = (text: string, head: RegExp) => {
  let at = 0;
  let depth = 0;
  for (let pattern = head; ; pattern = PEER) {
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
// An npm package name, scoped or not; old names may hold capitals.
const NAME = '(?:@[A-Za-z0-9._~-]+\\/)?[A-Za-z0-9._~-]+';
export const ALIAS = new RegExp(`^npm:${NAME}@${RANGE_SET}$`);
export const WORKSPACE = new RegExp(`^(?:[\\^~]|${RANGE_SET})$`);
export const CATALOG = /^catalog:[A-Za-z0-9._-]*$/;
const VERSION = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?';
// A resolved version, as an alias's 'name@version' too; inside a peer suffix the name is required.
export const RESOLVED = new RegExp(`^(?:${NAME}@)?${VERSION}`);
export const PEER = new RegExp(`^${NAME}@${VERSION}`);
// The one git source that passes: honeyglass/utils at a full commit sha, as the manifest names it
// and as the codeload tarball pnpm 12 resolves it to, which a package's key holds after its name.
const SHA = '([0-9a-f]{40})';
export const PINNED = new RegExp(`^github:honeyglass/utils#${SHA}$`);
const CODELOAD = 'https://codeload\\.github\\.com/honeyglass/utils/tar\\.gz/';
export const TARBALL = new RegExp(`^${CODELOAD}${SHA}$`);
// A git-hosted key: the name, then the tarball's URL and its sha as the two groups.
export const GITHOSTED_KEY = new RegExp(`^${NAME}@(${CODELOAD}${SHA})$`);
// The version a git-hosted package holds, without a range or a peer suffix.
export const EXACT_VERSION = new RegExp(`^${VERSION}$`);
