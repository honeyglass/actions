import type { Fault, Where } from './types.ts';
export declare const specifierFault: (value: string, where: Where) => Promise<Fault>;
export declare const registryFault: (value: string) => string | undefined;
/**
 * A lockfile's resolved version: a registry version, aliased or not, with its peers, an in-repo
 * link, or the tarball of the pinned commit its specifier names, with `tarballPeers`.
 *
 * The pin binds both ways: a pinned specifier takes the tarball of that repository and commit
 * alone, and the tarball no other specifier, so no registry version and no other repository's
 * tarball slips in under the pin.
 */
export declare const versionFault: (value: string, specifier: string, where: Where, tarballPeers: RegExp) => Promise<Fault>;
export declare const peerRangeFault: (value: string) => Fault;
/**
 * A resolved version or snapshot key of the lockfile's grammar, with the commits it names.
 *
 * Its head is one of `heads`. A tarball peer stands only behind a tarball head, on the first
 * level as `tarballPeers` allows; behind a registry head every peer is a registry one. The
 * commits pass once GitHub places each on main.
 */
export declare const resolvedFault: (value: string, heads: {
    hosted: RegExp;
    registry: RegExp;
}, tarballPeers: RegExp) => Fault;
