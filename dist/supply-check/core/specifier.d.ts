import type { Fault, Where } from './types.ts';
export declare const specifierFault: (value: string, where: Where) => Promise<Fault>;
export declare const registryFault: (value: string) => "neither a registry version or range, an npm: alias, workspace:, catalog:, a link: inside the repository nor a full commit of github:honeyglass/utils" | undefined;
/**
 * A lockfile's resolved version: a registry version, aliased or not, with its peers, an in-repo
 * link, or the tarball of the pinned commit its specifier names.
 *
 * The pin binds both ways: a pinned specifier takes that tarball alone, and the tarball no other
 * specifier, so no registry version slips in under the pin.
 */
export declare const versionFault: (value: string, specifier: string, where: Where) => Promise<Fault>;
