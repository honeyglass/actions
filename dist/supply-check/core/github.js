/**
 * Whether GitHub's API places the pinned commit of honeyglass/utils on its main branch.
 *
 * FETCH_MS: how long the check waits for GitHub's answer.
 * settledHits: the hits once GitHub answered, or why it left the pin unchecked.
 *
 * GitHub serves a fork's commit under the URL of honeyglass/utils too, so only main's history
 * proves a pin. Every answer but "on main" or "unknown commit" refuses, so none passes unasked.
 *
 * @example return settledHits([...removed, ...hits.flat()], github);
 */
import { $try, isRefusal, parseJson } from '@honeyglass/utils/ts';
import { AnswerSchema, CompareSchema } from "./supply.schema.js";
/** Thirty seconds for GitHub's answer, so an API that hangs refuses the check instead of holding it. */
export const FETCH_MS = 30_000;
const STEP = 'supply check';
/**
 * The hits once GitHub placed the pinned commit on main or not: its fields drop when main holds it.
 *
 * One check passes one commit, so two are refused before GitHub is asked, and the requests stay
 * one per check. GitHub's refusal stands only where no other hit does, so those come first.
 * With formOnly the pin's fields drop unasked, as its form passed; a fetch beside it is asked.
 */
export const settledHits = async (found, github) => {
    const pins = [...new Set(found.flatMap(({ pin }) => (pin === undefined ? [] : [pin])))];
    const others = found.filter(({ pin }) => pin === undefined).map(withoutPin);
    if (pins.length > 1)
        return found.map(hit => pinsHit(hit, pins));
    const [sha] = pins;
    if (sha === undefined || ('formOnly' in github && github.fetch === undefined))
        return others;
    const answer = await mainAnswer(sha, github);
    if (isRefusal(answer))
        return others.length > 0 ? others : answer;
    return answer ? others : found.map(withoutPin);
};
// A field that pins one of several commits, refused by them all, as one lockfile pins one.
const pinsHit = (hit, pins) => hit.pin === undefined
    ? withoutPin(hit)
    : {
        ...withoutPin(hit),
        reason: `one of ${pins.length} commits of honeyglass/utils pinned at once (${pins.join(', ')}), and a check passes one`,
    };
const withoutPin = ({ file, field, value, reason }) => ({
    file,
    field,
    value,
    reason,
});
/**
 * Whether GitHub's compare of main with `sha` says main holds it, or why GitHub did not say.
 *
 * GitHub serves a fork's commit under the URL of honeyglass/utils too, so owner and sha prove
 * nothing; only main's history does: "identical" for its head, "behind" for a commit below it.
 * A commit GitHub does not know answers 404. Every other answer refuses, so none passes unasked,
 * and an answer past FETCH_MS refuses too, its request aborted where the fetch honors the signal.
 */
const mainAnswer = async (sha, { fetch, sleep, token }) => {
    const url = `${COMPARE}${sha}`;
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
// GitHub's compare of main with a commit, and the statuses by which main holds it.
const COMPARE = 'https://api.github.com/repos/honeyglass/utils/compare/main...';
const ON_MAIN = ['identical', 'behind'];
