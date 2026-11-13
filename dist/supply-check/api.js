/**
 * The supply check, which keeps local links and unsafe pnpm settings out of a commit.
 *
 * supplyHits: the forms the staged dependency files and symlinks hold that the check refuses.
 * isSupplyFile, isAttributesFile: whether the check reads a file, and whether git reads attributes from it.
 * CONVERSIONS, conversionHits: the attributes that convert a file in the worktree, and their hits.
 * entriesOf, hitLine, shownPath: git's listing as entries, a hit as one line, a path as shown.
 * TEMPLATE, FETCH_MS: lean-code's template, and how long GitHub's answer may take.
 *
 * Functions over the texts of the files a commit stages; the caller reads them from git, answers
 * what a path of the tree is and, in CI alone, lends its network. It is an allow-list: a dependency
 * value passes only as a registry version or range, an npm: alias, workspace:, catalog:, a link: to
 * a folder the repository tracks, or a full commit of github:honeyglass/utils on its main branch,
 * and a pnpm setting only as lean-code's template sets it, widened by the exceptions the person
 * approved for the repository. Every other form fails, so one pnpm adds later is refused.
 *
 * @example const hits = await supplyHits({ staged, deleted: [], kindOf, repository, formOnly: true })
 */
import { shown as shownPath } from '@honeyglass/utils/ts';
import { checkOf, hitsIn, isInModules, LINK_MODE } from "./core/files.js";
import { settledHits } from "./core/github.js";
import { hitOf, wholeHit } from "./core/hits.js";
import { nameOf } from "./core/paths.js";
import { CONVERTED } from "./core/reasons.js";
import { EXCEPTIONS, TEMPLATE, widened } from "./core/template.js";
export { FETCH_MS } from "./core/github.js";
export { TEMPLATE } from "./core/template.js";
/**
 * Whether the check reads a staged file: a symlink, a path in a node_modules folder, or a file pnpm
 * reads as a manifest, a workspace, a lockfile, a pnpmfile or a .npmrc, its name folded as APFS
 * folds it.
 *
 * @param path - the file, as git names it from the top level
 * @param mode - its git mode
 * @returns true when the caller passes its text to supplyHits
 * @example const read = entries.filter(({ path, mode }) => isSupplyFile(path, mode))
 */
export const isSupplyFile = (path, mode) => mode === LINK_MODE || isInModules(path) || checkOf(path) !== undefined;
/**
 * Whether git reads attributes from a staged file: a .gitattributes, its name folded as APFS folds it.
 *
 * A new line there may convert a supply file the commit leaves as it is, so the caller asks git
 * about every tracked one.
 *
 * @param path - the file, as git names it from the top level
 * @returns true for a .gitattributes at any depth
 * @example const isWhole = files.some(isAttributesFile)
 */
export const isAttributesFile = (path) => nameOf(path) === '.gitattributes';
/**
 * The forms the staged dependency files and symlinks hold that the check refuses.
 *
 * Given GitHub's API, a pinned commit of honeyglass/utils passes only on GitHub's word, so an
 * answer that says nothing, such as at the rate limit or without a network, refuses the check
 * where no other hit stands. With formOnly the pin passes on its form alone, and CI asks after the
 * push.
 *
 * @param supply - the staged and deleted files, what a path of the tree is, the repository, and GitHub or formOnly
 * @returns each hit, none when the files may be committed; or why GitHub left a pinned commit unchecked
 * @example const hits = await supplyHits({ staged, deleted: [], kindOf, repository: 'honeyglass/blog', formOnly: true })
 * @example const hits = await supplyHits({ staged, deleted: [], kindOf, repository, fetch, sleep, token })
 */
export const supplyHits = async ({ staged, deleted, kindOf, repository, ...github }) => {
    const exceptions = (repository === undefined ? undefined : EXCEPTIONS.get(repository)) ?? {};
    const context = { settings: widened(TEMPLATE.settings, exceptions), kindOf };
    const hits = await Promise.all(staged.map(file => hitsIn(file, context)));
    const removed = deleted
        .filter(path => nameOf(path) === 'pnpm-workspace.yaml')
        .map(path => wholeHit(path, 'a pnpm-workspace.yaml deleted or renamed away, so pnpm reads none of its settings'));
    return settledHits([...removed, ...hits.flat()], github);
};
/**
 * The attributes by which git writes other bytes into the worktree than the blob holds.
 *
 * pnpm reads the worktree, so a file one of them converts installs from a text the check never
 * read: a filter's smudge, an ident's $Id$, another encoding or other line ends; crlf is text's old
 * name, which git still reads.
 */
export const CONVERSIONS = ['working-tree-encoding', 'filter', 'ident', 'eol', 'text', 'crlf'];
/**
 * The hits of a `git check-attr -z` listing of CONVERSIONS: each attribute a file has set.
 *
 * Only unspecified and unset write the blob as it is. Any other value fails, text=auto too, as it
 * converts on a machine whose git writes CRLF.
 *
 * @param listing - what `git check-attr -z <CONVERSIONS> -- <paths>` printed
 * @returns a hit for each attribute set, by file, attribute and value
 * @example const hits = conversionHits(listed.stdout)
 */
export const conversionHits = (listing) => {
    const parts = listing.split('\0');
    const triples = Array.from({ length: Math.floor(parts.length / 3) }, (_, i) => parts.slice(i * 3, i * 3 + 3));
    return triples.flatMap(([file = '', attribute = '', value = '']) => value === 'unspecified' || value === 'unset'
        ? []
        : [hitOf(file, [attribute], value, CONVERTED)]);
};
/**
 * The entries of a `git ls-files -s -z` or `git ls-tree -z` listing, by path and git mode.
 *
 * Both print the mode first and the path after a tab; -z keeps a path with a tab or newline whole.
 *
 * @param listing - what git printed
 * @returns each entry, in git's order
 * @example const entries = entriesOf(listed.stdout)
 */
export const entriesOf = (listing) => listing
    .split('\0')
    .filter(Boolean)
    .map(line => {
    const [info = '', ...path] = line.split('\t');
    return { path: path.join('\t'), mode: info.split(' ')[0] ?? '' };
});
/**
 * A hit as one line: its file as shownPath writes it, field and value, then its reason in parentheses.
 *
 * @param hit - the hit
 * @returns the line, without a newline
 * @example const lines = hits.map(hitLine)
 */
export const hitLine = ({ file, field, value, reason }) => `${[shownPath(file), field, value].filter(Boolean).join(' ')} (${reason})`;
// A path as '@honeyglass/utils' shown() writes it: bare when of A-Z a-z 0-9 _ @ . / + - alone, any
// other quoted with each unsafe character escaped. The quotes keep a line that names the path on
// one line, and keep it from starting with '::', which GitHub's runner reads as a workflow command.
export { shownPath };
