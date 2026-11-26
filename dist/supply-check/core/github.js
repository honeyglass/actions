/**
 * Whether GitHub's API places each pinned commit on the main branch of the repository it pins.
 *
 * FETCH_MS: how long the check waits for GitHub's answer.
 * settledHits: the hits once GitHub answered, or why it left a pin unchecked.
 *
 * GitHub serves a fork's commit under the URL of the repository too, so only main's history
 * proves a pin. Every answer but "on main" or "unknown commit" refuses, so none passes unasked.
 *
 * @example return settledHits([...removed, ...hits.flat()], github);
 */
import { $try, isRefusal, parseJson } from '@honeyglass/utils/ts';
import { AnswerSchema, CompareSchema } from "./supply.schema.js";
import { offMain } from "./reasons.js";
/** Thirty seconds for GitHub's answer, so an API that hangs refuses the check instead of holding it. */
export const FETCH_MS = 30_000;
const STEP = 'supply check';
/**
 * The hits once GitHub placed each pinned commit on main or not: a field drops when main holds
 * every commit it names.
 *
 * A check passes one commit per repository, so a repository pinned at two is refused before
 * GitHub is asked about it, and the requests stay one per repository. GitHub's refusal stands
 * only where no other hit does, so those come first. With formOnly the pins' fields drop
 * unasked, as their form passed; a fetch beside it is asked.
 */
export const settledHits = async (found, github) => {
    const commits = commitsOf(found.flatMap(({ pins = [] }) => pins));
    const verdicts = new Map(await Promise.all([...commits].map(async ([repository, shas]) => [repository, await verdictOf(repository, shas, github)])));
    const hits = found.flatMap(hit => settled(hit, verdicts));
    const [unchecked] = [...verdicts.values()].filter(isRefusal);
    return hits.length === 0 && unchecked !== undefined ? unchecked : hits;
};
// Each repository's distinct commits; a set looks each up once.
const commitsOf = (pins) => {
    const commits = new Map();
    for (const { repository, sha } of pins)
        commits.set(repository, (commits.get(repository) ?? new Set()).add(sha));
    return commits;
};
// A repository pinned at several commits, refused by them all, as one lockfile pins one; else
// GitHub's word on its one commit.
const verdictOf = async (repository, shas, github) => {
    // the count alone, as every field it refuses shows its own commit, so a reason stays short
    if (shas.size > 1)
        return `one of ${shas.size} commits of ${repository} pinned at once, and a check passes one per repository`;
    const [sha = ''] = shas;
    if ('formOnly' in github && github.fetch === undefined)
        return true;
    const answer = await mainAnswer(repository, sha, github);
    if (isRefusal(answer))
        return answer;
    return answer ? true : offMain(repository);
};
// A field as the verdicts of its repositories leave it: a hit with the first reason, if
// any, and gone once each passed or went unchecked.
const settled = ({ file, field, value, reason, pins }, verdicts) => {
    if (pins === undefined)
        return [{ file, field, value, reason }];
    const failed = pins
        .map(({ repository }) => verdicts.get(repository))
        .find(verdict => typeof verdict === 'string');
    return failed === undefined ? [] : [{ file, field, value, reason: failed }];
};
/**
 * Whether GitHub's compare of the repository's main with `sha` says main holds it, or why
 * GitHub did not say.
 *
 * GitHub serves a fork's commit under the repository's URL too, so owner and sha prove
 * nothing; only main's history does: "identical" for its head, "behind" for a commit below it.
 * A commit GitHub does not know answers 404. Every other answer refuses, so none passes unasked,
 * and an answer past FETCH_MS refuses too, its request aborted where the fetch honors the signal.
 */
const mainAnswer = async (repository, sha, { fetch, sleep, token }) => {
    const url = `${API}${repository}/compare/main...${sha}`;
    const stop = new AbortController();
    const asked = { headers: headersOf(token), signal: stop.signal };
    const { data, error } = await $try(() => Promise.race([fetch(url, asked), lateAfter(sleep)]));
    stop.abort();
    if (error !== null) {
        return {
            kind: 'ask',
            step: STEP,
            reason: `GitHub's API at ${url} could not be reached, so whether main holds the commit went unchecked`,
            next: 'ask the user whether the CI runner reaches api.github.com; the CI job stays red until it does',
            cause: error,
        };
    }
    if (data === LATE)
        return lateRefusal(url);
    const answer = AnswerSchema.safeParse(data);
    if (answer.success === false)
        return malformedRefusal(url, answer.error);
    if (answer.data.status === 404)
        return false;
    if (answer.data.status === 200)
        return compareAnswer(url, answer.data.text);
    return statusRefusal(url, answer.data);
};
// LATE once FETCH_MS passed, so a fetch that hangs loses the race.
const lateAfter = async (sleep) => {
    await sleep(FETCH_MS);
    return LATE;
};
const lateRefusal = (url) => ({
    kind: 'retry',
    step: STEP,
    reason: `GitHub's API at ${url} did not answer within ${FETCH_MS / 1000} s, so whether main holds the commit went unchecked`,
    next: 're-run the CI job in a few minutes',
});
// An answer without a number status, headers and text, which no fetch port should hand back.
const malformedRefusal = (url, cause) => ({
    kind: 'ask',
    step: STEP,
    reason: `the fetch port answered ${url} without a status, headers and text, so whether main holds the commit went unchecked`,
    next: "ask the user to look at the caller's fetch port, supply-check/ci/tracked.ts in CI; the CI job stays red until it answers",
    cause,
});
// GitHub's JSON in the API version the check reads; GitHub refuses a request without a User-Agent.
const headersOf = (token) => ({
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'honeyglass-supply-check',
    ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
});
// Whether a compare's status places the commit on main, or why the answer says nothing.
const compareAnswer = async (url, text) => {
    const compared = await parseJson(text, CompareSchema);
    if (isRefusal(compared)) {
        return {
            kind: 'ask',
            step: STEP,
            reason: `GitHub's API at ${url} answered 200 without the status of a compare, so whether main holds the commit went unchecked`,
            next: "ask the user to look at GitHub's answer; the CI job stays red until it names a status",
            cause: compared.cause,
        };
    }
    return ON_MAIN.includes(compared.status);
};
// A status beside 200 and 404: GitHub's limit or failure to wait out, or the person's to look at.
const statusRefusal = (url, { status, headers, text }) => {
    const reason = `GitHub's API answered ${status} at ${url}, so whether main holds the commit went unchecked`;
    if (isLimited(status, headers)) {
        return {
            kind: 'retry',
            step: STEP,
            reason: `${reason}, as its limit of requests is used up`,
            next: `re-run the CI job ${resetOf(headers)}`,
            cause: text,
        };
    }
    if (status >= 500) {
        return {
            kind: 'retry',
            step: STEP,
            reason,
            next: 're-run the CI job in a few minutes',
            cause: text,
        };
    }
    return {
        kind: 'ask',
        step: STEP,
        reason,
        next: "ask the user why GitHub's API refuses the compare; the CI job stays red until it answers",
        cause: text,
    };
};
// GitHub's rate limit: 429, or 403 with no request left or a time to wait.
const isLimited = (status, headers) => {
    const isUsedUp = headers['x-ratelimit-remaining'] === '0' || 'retry-after' in headers;
    return status === 429 || (status === 403 && isUsedUp);
};
// When GitHub lets the next request through, as its headers name it: a time or a wait in seconds.
const resetOf = (headers) => {
    const reset = headers['x-ratelimit-reset'] ?? '';
    if (/^\d{1,12}$/.test(reset))
        return `after ${new Date(Number(reset) * 1000).toISOString()}`;
    const wait = headers['retry-after'] ?? '';
    return /^\d{1,6}$/.test(wait) ? `in ${wait} seconds` : 'in an hour';
};
// What lateAfter answers once the deadline passed, which no fetch answers.
const LATE = Symbol('late');
// GitHub's API of a repository, whose compare of main with a commit the check asks, and the
// statuses by which main holds it. The repository comes from the grammar's allow-list alone.
const API = 'https://api.github.com/repos/';
const ON_MAIN = ['identical', 'behind'];
