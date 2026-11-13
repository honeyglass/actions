/**
 * Why a dependency value or a resolved version is no source the check allows.
 *
 * specifierFault: a manifest's or lockfile's specifier.
 * registryFault: a registry range or an npm: alias, as a catalog holds it.
 * versionFault: a lockfile's resolved version, bound to its specifier's pin.
 *
 * A value passes only as a registry version or range, an npm: alias, workspace:, catalog:, a
 * link: to a folder the repository tracks, or a full commit of github:honeyglass/utils.
 *
 * @example const fault = await specifierFault(value, { base: folderOf(path), kindOf });
 */
import { ALIAS, CATALOG, isResolved, PINNED, RANGE, RESOLVED, TARBALL, WORKSPACE, } from "./grammar.js";
import { landing } from "./paths.js";
import { OTHER_COMMIT, UNKNOWN_FORM } from "./reasons.js";
// Why a dependency value is no registry, workspace, catalog, in-repo or pinned source; undefined
// when it is one.
export const specifierFault = async (value, where) => {
    const pinned = PINNED.exec(value)?.[1];
    if (pinned !== undefined)
        return { pin: pinned };
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
 * link, or the tarball of the pinned commit its specifier names.
 *
 * The pin binds both ways: a pinned specifier takes that tarball alone, and the tarball no other
 * specifier, so no registry version slips in under the pin.
 */
export const versionFault = async (value, specifier, where) => {
    const pinned = PINNED.exec(specifier)?.[1];
    const tarball = TARBALL.exec(value)?.[1];
    if (pinned !== undefined || tarball !== undefined)
        return pinned !== undefined && pinned === tarball ? { pin: pinned } : OTHER_COMMIT;
    if (value.startsWith('link:'))
        return linkFault(value.slice('link:'.length), where);
    return isResolved(value, RESOLVED) ? undefined : UNKNOWN_FORM;
};
// A link: passes only to a folder the repository tracks, read from the folder that names it.
const linkFault = async (target, { base, kindOf }) => {
    const path = landing(base, target);
    if (path === undefined)
        return 'a link: that leaves the repository';
    const kind = path === '' ? 'folder' : await kindOf(path);
    return kind === 'folder' ? undefined : 'a link: to no folder the repository tracks';
};
