/**
 * The check of a pnpm-lock.yaml: each key, specifier, resolved version and tarball of its grammar.
 *
 * lockfileHits: the hits of a lockfile's documents, one or two with packageManager set.
 *
 * pnpm installs from a package's tarball, so a tarball passes only as the GitHub-hosted
 * honeyglass/utils at the commit its key names, which settledHits then asks GitHub about.
 *
 * @example const hits = await lockfileHits(file, context);
 */
import { IMPORTED } from "./fields.js";
import { EXACT_VERSION, GITHOSTED_KEY, isResolved, PEER, RESOLVED } from "./grammar.js";
import { faultHits, hitOf, schemaHits, valueHits, wholeHit } from "./hits.js";
import { yamlOf } from "./parse.js";
import { folderOf, landing } from "./paths.js";
import { FOREIGN_TARBALL, STRAY_GITHOSTED, STRAY_VERSION, UNKNOWN_FORM } from "./reasons.js";
import { specifierFault, versionFault } from "./specifier.js";
import { LockfileSchema } from "./supply.schema.js";
/**
 * A pnpm-lock.yaml, in one document or, with packageManager set, two: each key one a registry or
 * in-repo source gives, and each specifier and resolved version of its grammar.
 */
export const lockfileHits = async ({ path, text }, { kindOf }) => {
    const documents = await yamlOf(text);
    if (typeof documents === 'string')
        return [wholeHit(path, documents)];
    if (documents.length === 0 || documents.length > 2)
        return [wholeHit(path, `${documents.length} YAML documents, and pnpm writes one or two`)];
    const where = { base: folderOf(path), kindOf };
    const hits = await Promise.all(documents.map(document => documentHits(path, document, where)));
    return hits.flat();
};
// One lockfile document: its importers, catalogs, packages, snapshot keys and snapshot dependencies.
const documentHits = async (file, document, where) => {
    const parsed = LockfileSchema.safeParse(document);
    if (parsed.success === false)
        return schemaHits(file, parsed.error.issues, document);
    const { importers = {}, catalogs = {}, packages = {}, snapshots = {} } = parsed.data;
    const imported = await Promise.all(Object.entries(importers).map(([importer, kinds]) => importerHits(file, importer, kinds, where)));
    const catalogued = await Promise.all(Object.entries(catalogs).map(([group, locked]) => lockedHits(file, ['catalogs', group], locked, where)));
    const packaged = Object.entries(packages).flatMap(([key, held]) => packageHits(file, key, held));
    const snapshotKeys = Object.keys(snapshots).flatMap(key => keyHits(file, 'snapshots', key));
    const snapped = Object.entries(snapshots).flatMap(([key, snapshot]) => ['dependencies', 'optionalDependencies'].flatMap(kind => Object.entries(snapshot[kind] ?? {}).flatMap(([name, version]) => faultHits(file, ['snapshots', key, kind, name], version, isResolved(version, RESOLVED) ? undefined : UNKNOWN_FORM))));
    return [...imported.flat(), ...catalogued.flat(), ...packaged, ...snapshotKeys, ...snapped];
};
// An importer's dependencies, read from its own folder, which must lie in the repository.
const importerHits = async (file, importer, kinds, where) => {
    const folder = landing(where.base, importer);
    if (folder === undefined)
        return [hitOf(file, ['importers', importer], importer, 'an importer outside the repository')];
    const hits = await Promise.all(IMPORTED.map(kind => lockedHits(file, ['importers', importer, kind], kinds[kind] ?? {}, {
        ...where,
        base: folder,
    })));
    return hits.flat();
};
// An importer's or catalog's dependencies: each specifier of the manifest's grammar, each version resolved.
const lockedHits = (file, field, locked, where) => valueHits(file, Object.entries(locked).flatMap(([name, { specifier, version }]) => [
    {
        field: [...field, name, 'specifier'],
        value: specifier,
        fault: (value) => specifierFault(value, where),
    },
    {
        field: [...field, name, 'version'],
        value: version,
        fault: (value) => versionFault(value, specifier, where),
    },
]));
// A package's key, the tarball its resolution names, if any, and its own version, if any.
const packageHits = (file, key, { resolution, version }) => [
    ...keyHits(file, 'packages', key),
    ...resolutionHits(file, ['packages', key, 'resolution'], key, resolution),
    ...versionHits(file, key, version),
];
/**
 * A package or snapshot key: 'name@version', a snapshot's with its peer suffixes, or the name at
 * the tarball of a pinned commit of honeyglass/utils.
 */
const keyHits = (file, section, key) => {
    const [, , pinned] = GITHOSTED_KEY.exec(key) ?? [];
    if (pinned !== undefined)
        return faultHits(file, [section, key], key, { pin: pinned });
    return faultHits(file, [section, key], key, isResolved(key, PEER) ? undefined : UNKNOWN_FORM);
};
/**
 * A resolution's tarball, which passes only as GitHub-hosted honeyglass/utils at the commit the
 * package's key names; a key of that form needs it, and gitHosted never stands without it.
 *
 * pnpm installs from the tarball, so a key that names a commit without it installs from elsewhere.
 */
const resolutionHits = (file, field, key, { tarball, gitHosted }) => {
    const [, url, pinned] = GITHOSTED_KEY.exec(key) ?? [];
    if (url === undefined && tarball === undefined) {
        const fault = gitHosted === undefined ? undefined : STRAY_GITHOSTED;
        return faultHits(file, [...field, 'gitHosted'], gitHosted, fault);
    }
    const isOwn = tarball === url && gitHosted === true && pinned !== undefined;
    return faultHits(file, [...field, 'tarball'], tarball, isOwn ? { pin: pinned } : FOREIGN_TARBALL);
};
// A package's own version, which pnpm writes beside a GitHub-hosted key alone, as its keys hold
// every other package's.
const versionHits = (file, key, version) => {
    if (version === undefined)
        return [];
    const isOwn = GITHOSTED_KEY.test(key) && EXACT_VERSION.test(version);
    return faultHits(file, ['packages', key, 'version'], version, isOwn ? undefined : STRAY_VERSION);
};
