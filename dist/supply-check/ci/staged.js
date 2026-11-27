/**
 * The staged command: the paths a commit stages, checked on their form alone, with no network.
 *
 * stagedMain: runs the command on its arguments and answers the exit code.
 *
 * Each path is one the commit stages, as git names it from the top level; one the index, or the
 * tree the caller names, does not list counts as deleted, and a folder stands for every file
 * below it. A staged .gitattributes has git asked about every tracked supply file, since a new
 * line there may convert one the commit leaves as it is. A path in a node_modules folder fails by
 * its path, its blob unread. A pinned commit of a git source the repository may use passes on its
 * form alone, and CI asks GitHub after the push. Each answer is one JSON line on stdout, a
 * SupplyHit or the Refusal, and a throw is a refusal of kind bug, so exit 1 without a line comes
 * only from a Node that failed before the program ran.
 *
 * @example process.exitCode = await stagedMain(['honeyglass/blog', '--', 'package.json']);
 */
import { $try, causeText, isRefusal } from '@honeyglass/utils/ts';
import { conversionHits, isAttributesFile, isInModules, isSupplyFile, supplyHits, } from "../index.js";
import { attributesOf, entriesIn, indexedFiles, topOf } from "./git.js";
import { kindsIn, LINK_MODE } from "./kind.js";
import { STEP } from "./constants.js";
import { usageRefusal } from "./usage.js";
// The exit code of a refusal, apart from 1 for hits, so a caller tells the two apart.
const REFUSED = 2;
// The caller's word that no repository's exceptions apply, so none is ever assumed.
const NO_REPOSITORY = '--no-repository';
/**
 * Runs the staged command and answers its exit code: 2 for a refusal, 1 for a hit, else 0.
 *
 * Every throw becomes a refusal of kind bug, as a caller reads exit 1 as hits, and a crash that
 * printed none would read as a check that found nothing it could name.
 *
 * @param args - the arguments after 'staged'
 * @returns the exit code
 */
export const stagedMain = async (args) => {
    const { data: hits, error } = await $try(hitsOf(args));
    const answer = error === null ? hits : bugRefusal(error);
    if (isRefusal(answer)) {
        process.stdout.write(`${JSON.stringify(withCauseText(answer))}\n`);
        return REFUSED;
    }
    for (const hit of answer)
        process.stdout.write(`${JSON.stringify(hit)}\n`);
    return answer.length === 0 ? 0 : 1;
};
// The maintainer's to fix: the check threw, so the paths went unchecked.
const bugRefusal = (cause) => ({
    kind: 'bug',
    step: STEP,
    reason: 'the supply check threw while it read the given paths, so their dependency forms went unchecked',
    next: 'tell the user, who reports it at honeyglass/actions with the cause',
    cause,
});
// The hits of the paths the arguments name, in the checkout around the working folder.
const hitsOf = async (args) => {
    const request = requestOf(args);
    if (request === undefined)
        return usageRefusal(['staged', ...args]);
    const top = await topOf();
    if (isRefusal(top))
        return top;
    return stagedHits(top, request);
};
// The repository or --no-repository, a tree after --tree, then '--' and the paths; undefined for
// any other list. A name or tree that starts with '-' fails, so git reads none as an option.
const requestOf = (args) => {
    const [named = '', ...rest] = args;
    const tree = rest[0] === '--tree' ? (rest[1] ?? '') : undefined;
    const [separator, ...paths] = rest.slice(tree === undefined ? 0 : 2);
    const isNamed = named === NO_REPOSITORY || isPlain(named);
    const isRequest = isNamed && (tree === undefined || isPlain(tree)) && separator === '--';
    if (isRequest === false)
        return undefined;
    return { repository: named === NO_REPOSITORY ? undefined : named, tree, paths };
};
const isPlain = (value) => value !== '' && value.startsWith('-') === false;
/**
 * The hits of the given paths and of the attributes that convert them, or why git could not
 * list or read them whole.
 */
const stagedHits = async (top, request) => {
    const { tree, paths, repository } = request;
    // git lists the whole index for no path, as for an amend that only drops files
    if (paths.length === 0)
        return [];
    const listed = await entriesIn(top, request);
    if (isRefusal(listed))
        return listed;
    const present = new Set(listed.map(({ path }) => path));
    const read = listed.filter(({ path, mode }) => isSupplyFile(path, mode));
    const converting = paths.some(isAttributesFile) ? await trackedSupplyFiles(top, tree) : read;
    if (isRefusal(converting))
        return converting;
    // a path in node_modules fails by its path alone, so its blob, which git may not even hold as
    // one, is never read
    const files = await indexedFiles(top, read.filter(({ path }) => isInModules(path) === false), tree);
    if (isRefusal(files))
        return files;
    const unread = read.filter(({ path }) => isInModules(path));
    const converted = await conversionsIn(top, tree, converting);
    if (isRefusal(converted))
        return converted;
    const looked = { tree, top, kinds: undefined, failed: [] };
    const hits = await supplyHits({
        staged: [
            ...files.map(({ path, mode, bytes }) => ({ path, mode, text: bytes.toString() })),
            ...unread.map(({ path, mode }) => ({ path, mode, text: '' })),
        ],
        deleted: paths.filter(path => present.has(path) === false),
        kindOf: path => kindAt(looked, path),
        repository,
        formOnly: true,
    });
    const [failed] = looked.failed;
    if (failed !== undefined)
        return failed;
    if (isRefusal(hits))
        return hits;
    return [...hits, ...converted];
};
// Every supply file the index or the tree holds, for a staged .gitattributes to be checked against.
const trackedSupplyFiles = async (top, tree) => {
    const tracked = await entriesIn(top, { tree, paths: [] });
    if (isRefusal(tracked))
        return tracked;
    return tracked.filter(({ path, mode }) => isSupplyFile(path, mode));
};
// The hits of the attributes by which git converts the files; git writes a symlink's target as
// it is, so only regular files are asked about.
const conversionsIn = async (top, tree, entries) => {
    const paths = entries.filter(({ mode }) => mode !== LINK_MODE).map(({ path }) => path);
    if (paths.length === 0)
        return [];
    const listing = await attributesOf(top, { tree, paths });
    return isRefusal(listing) ? listing : conversionHits(listing);
};
// What the index or the tree holds at a path, answered from one listing of it per run, which
// git is asked for at the first path; a failure waits in `failed`, as kindOf answers a kind and
// no refusal.
const kindAt = async (looked, path) => {
    looked.kinds ??= listedKinds(looked);
    return (await looked.kinds)?.(path);
};
const listedKinds = async ({ top, tree, failed }) => {
    const listed = await entriesIn(top, { tree, paths: [] });
    if (isRefusal(listed)) {
        failed.push(listed);
        return undefined;
    }
    return kindsIn(listed);
};
// A refusal as JSON, its cause as text, since an error object writes as {}.
const withCauseText = (r) => ({
    ...r,
    cause: r.cause === undefined ? undefined : causeText(r.cause),
});
