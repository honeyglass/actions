/**
 * The check of a pnpm-lock.yaml: each key, version, name, peer range and hash pnpm acts on.
 *
 * lockfileHits: the hits of a lockfile's documents, one or two with packageManager set.
 *
 * pnpm installs from a package's tarball, so a tarball passes only as a GitHub-hosted
 * repository of GIT_SOURCES at the commit its key names, which settledHits binds to the name the
 * key gives it and then asks GitHub about.
 *
 * The other fields pass by the schema's shape alone. pnpm decides by engines, cpu, os and libc
 * whether to skip or fail a package, by hasBin whether to link its bins, by optional and
 * peerDependenciesMeta whether a missing package fails the install, but fetches nothing, runs
 * nothing and names no folder by them; deprecated, bundledDependencies,
 * transitivePeerDependencies and a catalog's names it shows or keeps. Unverified for pnpm 12:
 * its source was not read, only its documentation.
 *
 * @example const hits = await lockfileHits(file, context);
 */
import { IMPORTED } from "./fields.js";
import { ALONE, EXACT_VERSION, GITHOSTED_KEY, INTEGRITY, isResolved, KEY_HEADS, PACKAGE_NAME, PEER, PINNED_PEER, VERSION_HEADS, } from "./grammar.js";
import { faultHits, hitOf, schemaHits, valueHits, wholeHit } from "./hits.js";
import { yamlOf } from "./parse.js";
import { folderOf, landing } from "./paths.js";
import { foreignTarball, STRAY_GITHOSTED, strayVersion, UNKNOWN_FORM, UNKNOWN_NAME, WEAK_INTEGRITY, } from "./reasons.js";
import { peerRangeFault, resolvedFault, specifierFault, versionFault } from "./specifier.js";
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
// A name pnpm makes a folder of, below an importer or a snapshot, passes as PACKAGE_NAME alone.
// A tarball takes peers only in an importer's version and a snapshot key, as adx's does; a
// catalog's version and a snapshot dependency name one alone.
const documentHits = async (file, document, where) => {
    const parsed = LockfileSchema.safeParse(document);
    if (parsed.success === false)
        return schemaHits(file, parsed.error.issues, document);
    const { importers = {}, catalogs = {}, packages = {}, snapshots = {} } = parsed.data;
    const imported = await Promise.all(Object.entries(importers).map(([importer, kinds]) => importerHits(file, importer, kinds, where)));
    const catalogued = await Promise.all(Object.entries(catalogs).map(([group, locked]) => lockedHits(file, ['catalogs', group], locked, where, ALONE)));
    const packaged = Object.entries(packages).flatMap(([key, held]) => packageHits(file, key, held));
    const snapshotKeys = Object.keys(snapshots).flatMap(key => faultHits(file, ['snapshots', key], key, resolvedFault(key, KEY_HEADS, PINNED_PEER)));
    const snapped = Object.entries(snapshots).flatMap(([key, snapshot]) => ['dependencies', 'optionalDependencies'].flatMap(kind => Object.entries(snapshot[kind] ?? {}).flatMap(([name, version]) => [
        ...nameHits(file, ['snapshots', key, kind], name),
        ...faultHits(file, ['snapshots', key, kind, name], version, resolvedFault(version, VERSION_HEADS, ALONE, name)),
    ])));
    return [...imported.flat(), ...catalogued.flat(), ...packaged, ...snapshotKeys, ...snapped];
};
// An importer's dependencies, read from its own folder, which must lie in the repository.
const importerHits = async (file, importer, kinds, where) => {
    const folder = landing(where.base, importer);
    if (folder === undefined)
        return [hitOf(file, ['importers', importer], importer, 'an importer outside the repository')];
    const hits = await Promise.all(IMPORTED.map(kind => lockedHits(file, ['importers', importer, kind], kinds[kind] ?? {}, { ...where, base: folder }, PINNED_PEER)));
    const named = IMPORTED.flatMap(kind => Object.keys(kinds[kind] ?? {}).flatMap(name => nameHits(file, ['importers', importer, kind], name)));
    return [...named, ...hits.flat()];
};
// A dependency's name, which pnpm makes a folder of, as PACKAGE_NAME.
const nameHits = (file, field, name) => faultHits(file, [...field, name], name, PACKAGE_NAME.test(name) ? undefined : UNKNOWN_NAME);
// An importer's or catalog's dependencies: each specifier of the manifest's grammar, each
// version resolved, a pinned tarball's first-level peers of the grammar `tarballPeers`.
const lockedHits = (file, field, locked, where, tarballPeers) => valueHits(file, Object.entries(locked).flatMap(([name, { specifier, version }]) => [
    {
        field: [...field, name, 'specifier'],
        value: specifier,
        fault: (value) => specifierFault(value, where, name),
    },
    {
        field: [...field, name, 'version'],
        value: version,
        fault: (value) => versionFault(value, specifier, where, tarballPeers, name),
    },
]));
// A package's key, its resolution's tarball and hash, its own version, if any, and its peers,
// which pnpm installs from where they are missing.
const packageHits = (file, key, { resolution, version, peerDependencies = {} }) => [
    ...faultHits(file, ['packages', key], key, packageKeyFault(key)),
    ...resolutionHits(file, ['packages', key, 'resolution'], key, resolution),
    ...faultHits(file, ['packages', key, 'resolution', 'integrity'], resolution.integrity, INTEGRITY.test(resolution.integrity) ? undefined : WEAK_INTEGRITY),
    ...versionHits(file, key, version),
    ...Object.entries(peerDependencies).flatMap(([name, range]) => [
        ...nameHits(file, ['packages', key, 'peerDependencies'], name),
        ...faultHits(file, ['packages', key, 'peerDependencies', name], range, peerRangeFault(range, name)),
    ]),
];
/**
 * A package key: 'name@version', or the name at a pinned commit's tarball alone.
 *
 * resolutionHits then binds a key of the second form to its tarball. pnpm writes peer
 * suffixes on a snapshot's key alone; on a package key one passes only as a registry one, so
 * no suffix slips a tarball past resolutionHits.
 */
const packageKeyFault = (key) => {
    const [, name, , repository, sha] = GITHOSTED_KEY.exec(key) ?? [];
    if (name !== undefined && repository !== undefined && sha !== undefined)
        return { pins: [{ name, repository, sha }] };
    return isResolved(key, PEER) ? undefined : UNKNOWN_FORM;
};
/**
 * A resolution's tarball, which passes only as the GitHub-hosted repository and commit the
 * package's key names; a key of that form needs it, and gitHosted never stands without it.
 *
 * pnpm installs from the tarball, so a key that names a commit without it installs from elsewhere.
 */
const resolutionHits = (file, field, key, { tarball, gitHosted }) => {
    const [, name = '', url, repository, sha] = GITHOSTED_KEY.exec(key) ?? [];
    if (url === undefined && tarball === undefined) {
        const fault = gitHosted === undefined ? undefined : STRAY_GITHOSTED;
        return faultHits(file, [...field, 'gitHosted'], gitHosted, fault);
    }
    const isOwn = tarball === url && gitHosted === true && sha !== undefined;
    const fault = isOwn ? { pins: [{ name, repository, sha }] } : foreignTarball(repository);
    return faultHits(file, [...field, 'tarball'], tarball, fault);
};
// A package's own version, which pnpm writes beside a GitHub-hosted key alone, as its keys hold
// every other package's.
const versionHits = (file, key, version) => {
    if (version === undefined)
        return [];
    const [, , url, repository] = GITHOSTED_KEY.exec(key) ?? [];
    const isOwn = url !== undefined && EXACT_VERSION.test(version);
    return faultHits(file, ['packages', key, 'version'], version, isOwn ? undefined : strayVersion(repository));
};
