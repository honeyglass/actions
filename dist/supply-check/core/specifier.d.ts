import type { Fault, Where } from './types.ts';
export declare const specifierFault: (value: string, where: Where, name: string) => Promise<Fault>;
export declare const registryFault: (value: string) => "neither a registry version or range, an npm: alias, workspace:, catalog:, a link: inside the repository nor a full commit of a git source" | undefined;
/**
 * A lockfile's resolved version: a registry version, aliased or not, with its peers, an in-repo
 * link, or the tarball of the pinned commit its specifier names, with `tarballPeers`.
 *
 * The pin binds both ways: a pinned specifier takes the tarball of that repository and commit
 * alone, and the tarball no other specifier, so no registry version and no other repository's
 * tarball slips in under the pin.
 */
export declare const versionFault: (value: string, specifier: string, where: Where, tarballPeers: RegExp, name: string) => Promise<Fault>;
export declare const peerRangeFault: (value: string, name: string) => Fault;
/**
 * A resolved version or snapshot key of the lockfile's grammar, with the commits it names.
 *
 * Its head is one of `heads`. A tarball peer stands only behind a tarball head, on the first
 * level as `tarballPeers` allows; behind a registry head every peer is a registry one. The
 * commits pass once GitHub places each on main. `head` is the name of a version's head, which
 * the version does not hold; a key names its own.
 */
export declare const resolvedFault: (value: string, heads: {
    hosted: RegExp;
    registry: RegExp;
}, tarballPeers: RegExp, head?: string) => Fault;
