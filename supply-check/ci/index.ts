#!/usr/bin/env node
/**
 * The supply check as a program, the package's bin supply-check: CI runs it around `pnpm install`
 * and a commit tool on the paths it stages.
 *
 * `check <owner/name>` runs before the install: every tracked dependency file and symlink is read
 * as if a commit staged it, the exceptions of that repository apply, and the worktree, which pnpm
 * reads, must hold each file as the index does; it asks GitHub's API with the caller's GITHUB_TOKEN.
 * `links` runs after the install: every symlink in the checkout must resolve inside it.
 * `staged <owner/name>|--no-repository [--tree <tree>] -- <path>...` reads the given paths alone,
 * from the index or the tree, on their form alone: no network and no token.
 *
 * check and links print a hit as one line and exit 1, a refusal too, fenced off from GitHub's
 * workflow commands. staged prints one JSON line per hit, or the refusal, and exits 1 for hits and
 * 2 for a refusal. Any other argument list is refused, a missing repository too, so the exceptions
 * never follow a value the caller did not name.
 *
 * @example node dist/supply-check/ci/index.js staged honeyglass/blog -- package.json
 */
import { isRefusal } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { hitLine } from '../index.ts';
import type { SupplyHit } from '../index.ts';
import { fenced } from './fence.ts';
import { topOf } from './git.ts';
import { linkHits } from './links.ts';
import { stagedMain } from './staged.ts';
import { trackedHits } from './tracked.ts';
import { usageRefusal } from './usage.ts';

/**
 * Runs check or links and answers the exit code: 1 for a hit or a failed read, else 0.
 *
 * @param args - 'check' and the repository's owner/name, or 'links' alone
 * @param token - the job's GITHUB_TOKEN, if the caller sets it
 * @returns the exit code
 */
const main = async (args: readonly string[], token: string | undefined) => {
  const hits = await hitsOf(args, token);
  if (isRefusal(hits)) {
    process.stderr.write(fenced(hits));
    return 1;
  }
  for (const hit of hits) process.stdout.write(`${hitLine(hit)}\n`);
  return hits.length === 0 ? 0 : 1;
};

// The hits of the check the arguments name, in the checkout around the working folder.
const hitsOf = async (
  args: readonly string[],
  token: string | undefined,
): Promise<SupplyHit[] | Refusal> => {
  const [command, repository = '', ...extra] = args;
  const isCheck = command === 'check' && repository !== '' && extra.length === 0;
  const isLinks = command === 'links' && args.length === 1;
  if (isCheck === false && isLinks === false) return usageRefusal(args);
  const top = await topOf();
  if (isRefusal(top)) return top;
  return isLinks ? linkHits(top) : trackedHits(top, repository, token);
};

// staged reads no GITHUB_TOKEN, so only check and links get it.
const args = process.argv.slice(2);
process.exitCode =
  args[0] === 'staged'
    ? await stagedMain(args.slice(1))
    : await main(args, process.env.GITHUB_TOKEN || undefined);
