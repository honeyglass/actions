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
import type { Refusal } from '@honeyglass/utils/ts';
import type { Entry, Supply, SupplyHit } from './types.ts';
export { FETCH_MS } from './core/github.ts';
export { TEMPLATE } from './core/template.ts';
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
export declare const isSupplyFile: (path: string, mode: string) => boolean;
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
export declare const isAttributesFile: (path: string) => boolean;
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
export declare const supplyHits: ({ staged, deleted, kindOf, repository, ...github }: Supply) => Promise<SupplyHit[] | Refusal>;
/**
 * The attributes by which git writes other bytes into the worktree than the blob holds.
 *
 * pnpm reads the worktree, so a file one of them converts installs from a text the check never
 * read: a filter's smudge, an ident's $Id$, another encoding or other line ends; crlf is text's old
 * name, which git still reads.
 */
export declare const CONVERSIONS: string[];
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
export declare const conversionHits: (listing: string) => SupplyHit[];
/**
 * The entries of a `git ls-files -s -z` or `git ls-tree -z` listing, by path and git mode.
 *
 * Both print the mode first and the path after a tab; -z keeps a path with a tab or newline whole.
 *
 * @param listing - what git printed
 * @returns each entry, in git's order
 * @example const entries = entriesOf(listed.stdout)
 */
export declare const entriesOf: (listing: string) => Entry[];
/**
 * A hit as one line: its file as shownPath writes it, field and value, then its reason in parentheses.
 *
 * @param hit - the hit
 * @returns the line, without a newline
 * @example const lines = hits.map(hitLine)
 */
export declare const hitLine: ({ file, field, value, reason }: SupplyHit) => string;
export { shownPath };
