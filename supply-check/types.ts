/**
 * The public types of the supply check: what it reads and what it answers.
 *
 * Entry, Staged, PathKind: a path of the index or a tree, a staged file, and what a path holds.
 * SupplyHit: a form the check refuses.
 * Fetch: the caller's port to GitHub's API.
 * Supply, GitHub, FormOnly: the input of supplyHits, with GitHub's API or without it.
 *
 * @example import type { Supply, SupplyHit } from '@honeyglass/actions/supply-check'
 */

/** An entry of the index or a tree: its path and git mode. */
export type Entry = { path: string; mode: string };

/** A staged file the check reads, with its git mode, '120000' for a symlink, whose text is its target. */
export type Staged = { path: string; mode: string; text: string };

/** What the tree holds at a path. */
export type PathKind = 'file' | 'link' | 'folder';

/** A form the check refuses: the file, the field in it ('' for the whole file), its value and why. */
export type SupplyHit = { file: string; field: string; value: string; reason: string };

/**
 * A GET through the caller's fetch port.
 *
 * It answers status, headers by lower-case name, and text; the check reads the answer as unknown
 * input. The signal aborts a request past FETCH_MS where the caller's fetch honors it.
 */
export type Fetch = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<unknown>;

/**
 * What the check reads: the staged files, the deleted ones, the tree they land in, the repository.
 *
 * Only CI lends GitHub's API, since a fetch in lean-code's hooks process would be a second way to
 * the network beside the sandbox manager's planned proxy (lean-code's TODO.md #425). lean-code's
 * commit tool and make-repo pass formOnly instead, so a CI call that loses its fetch fails tsc
 * rather than skip the question.
 */
export type Supply = {
  staged: readonly Staged[];
  // the listed files the tree no longer holds, deleted or renamed away
  deleted: readonly string[];
  // what the tree holds at a path below the top level, which a link: or a symlink lands on
  kindOf: (path: string) => Promise<PathKind | undefined>;
  // the owner/name the exceptions are approved for; undefined gets none
  repository: string | undefined;
} & (GitHub | FormOnly);

/** The local call's marker: a pin passes on its form alone, and CI asks GitHub after the push. */
export type FormOnly = { formOnly: true; fetch?: never; sleep?: never; token?: never };

/** GitHub's API as CI lends it: its fetch, the clock of the deadline, and the job's token. */
export type GitHub = {
  // asks GitHub's API whether a pinned commit of honeyglass/utils lies on its main branch
  fetch: Fetch;
  // waits the given milliseconds, the clock of the deadline on GitHub's answer
  sleep: (ms: number) => Promise<void>;
  // CI's GITHUB_TOKEN, past the 60 requests an hour GitHub allows an address without one
  token: string | undefined;
};
