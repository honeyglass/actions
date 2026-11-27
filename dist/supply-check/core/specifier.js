/**
 * Why a dependency value or a resolved version is no source the check allows.
 *
 * specifierFault: a manifest's or lockfile's specifier.
 * registryFault: a registry range or an npm: alias, as a catalog holds it.
 * versionFault: a lockfile's resolved version, bound to its specifier's pin.
 * resolvedFault: a resolved version or snapshot key, with the commits it names.
 * peerRangeFault: a package's own peer range, with the commit it pins.
 *
 * A value passes only as a registry version or range, an npm: alias, workspace:, catalog:, a
 * link: to a folder the repository tracks, or a full commit of a repository of GIT_SOURCES; each
 * pin carries the name it stands under, which settledHits binds to the checked repository's entry.
 *
 * @example const fault = await specifierFault(value, { base: folderOf(path), kindOf }, name);
 */
import { ALIAS, CATALOG, HOSTED, isResolved, PEER_RANGE, PINNED, pinsOf, RANGE, VERSION_HEADS, WORKSPACE, } from "./grammar.js";
import { landing } from "./paths.js";
import { otherCommit, UNKNOWN_FORM, UNKNOWN_PEER } from "./reasons.js";
// Why a dependency value is no registry, workspace, catalog, in-repo or pinned source; undefined
// when it is one.
export const specifierFault = async (value, where, name) => {
    const [, repository, sha] = PINNED.exec(value) ?? [];
    if (repository !== undefined && sha !== undefined)
        return { pins: [{ name, repository, sha }] };
    if (value.startsWith('link:'))
        return linkFault(value.slice('link:'.length), where);
    if (value.startsWith('workspace:'))
        return WORKSPACE.test(value.slice('workspace:'.length)) ? undefined : UNKNOWN_FORM;
    if (value.startsWith('catalog:'))
        return CATALOG.test(value) ? undefined : UNKNOWN_FORM;
    return registryFault(value);
};
// A registry source: a version range, or an npm: alias with one; a dist-tag names no version at all.
export const registryFault = (value) => RANGE.test(value) || ALIAS.test(value) ? undefined : UNKNOWN_FORM;
/**
 * A lockfile's resolved version: a registry version, aliased or not, with its peers, an in-repo
 * link, or the tarball of the pinned commit its specifier names, with `tarballPeers`.
 *
 * The pin binds both ways: a pinned specifier takes the tarball of that repository and commit
 * alone, and the tarball no other specifier, so no registry version and no other repository's
 * tarball slips in under the pin.
 */
export const versionFault = async (value, specifier, where, tarballPeers, name) => {
    const pinned = PINNED.exec(specifier);
    const hosted = HOSTED.exec(value);
    if (pinned !== null || hosted !== null) {
        // one of the two is set here, so one left unset never matches the other
        const isSamePin = pinned?.[1] === hosted?.[1] && pinned?.[2] === hosted?.[2];
        if (isSamePin)
            return resolvedFault(value, VERSION_HEADS, tarballPeers, name);
        return otherCommit(pinned?.[1] ?? hosted?.[1] ?? '');
    }
    if (value.startsWith('link:'))
        return linkFault(value.slice('link:'.length), where);
    return resolvedFault(value, VERSION_HEADS, tarballPeers, name);
};
// A package's own peer range of PEER_RANGE, with the commit it pins under the peer's name, if any.
export const peerRangeFault = (value, name) => {
    if (PEER_RANGE.test(value) === false)
        return UNKNOWN_PEER;
    const [, repository, sha] = PINNED.exec(value) ?? [];
    if (repository === undefined || sha === undefined)
        return undefined;
    return { pins: [{ name, repository, sha }] };
};
/**
 * A resolved version or snapshot key of the lockfile's grammar, with the commits it names.
 *
 * Its head is one of `heads`. A tarball peer stands only behind a tarball head, on the first
 * level as `tarballPeers` allows; behind a registry head every peer is a registry one. The
 * commits pass once GitHub places each on main. `head` is the name of a version's head, which
 * the version does not hold; a key names its own.
 */
export const resolvedFault = (value, heads, tarballPeers, head = '') => {
    const isHosted = heads.hosted.test(value);
    const fits = isHosted
        ? isResolved(value, heads.hosted, tarballPeers)
        : isResolved(value, heads.registry);
    if (fits === false)
        return UNKNOWN_FORM;
    const pins = pinsOf(value, head);
    return pins.length === 0 ? undefined : { pins };
};
// A link: passes only to a folder the repository tracks, read from the folder that names it.
const linkFault = async (target, { base, kindOf }) => {
    const path = landing(base, target);
    if (path === undefined)
        return 'a link: that leaves the repository';
    const kind = path === '' ? 'folder' : await kindOf(path);
    return kind === 'folder' ? undefined : 'a link: to no folder the repository tracks';
};
