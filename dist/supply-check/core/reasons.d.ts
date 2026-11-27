/**
 * The reasons a hit gives for a refused form, which more than one check names.
 *
 * UNKNOWN_FORM: a dependency value or version of no form the check allows.
 * unboundSource: a git source the checked repository may not use under its name.
 * offMain, otherCommit: a pin GitHub does not place on main, a version naming another commit.
 * foreignTarball, STRAY_GITHOSTED, strayVersion: a package's tarball, gitHosted and version.
 * UNKNOWN_PEER, UNKNOWN_NAME, WEAK_INTEGRITY: a peer range, a name and a hash pnpm acts on.
 * UNKNOWN_SETTING, UNALLOWED_VALUE: a pnpm setting the template lacks, and a value it does not allow.
 * LINKED_FILE: a dependency file tracked as a symlink.
 * NPMRC_KEY: a key of a .npmrc.
 * CONVERTED: an attribute by which git converts a supply file in the worktree.
 *
 * Each is the exact text a hit carries, which CI prints and lean-code's commit tool shows.
 * One that names a repository names the one the value is about, or none where the value names
 * none; none names a caller's input, only the list's names.
 *
 * @example return [hitOf(file, [key], value, UNKNOWN_SETTING)];
 */
export declare const UNKNOWN_FORM = "neither a registry version or range, an npm: alias, workspace:, catalog:, a link: inside the repository nor a full commit of a git source";
export declare const unboundSource: (sources: ReadonlyMap<string, string>) => string;
export declare const offMain: (repository: string) => string;
export declare const otherCommit: (repository: string) => string;
export declare const foreignTarball: (repository?: string) => string;
export declare const STRAY_GITHOSTED = "gitHosted on a package without a tarball";
export declare const UNKNOWN_PEER = "neither registry ranges and dist-tags, an npm: alias to a registry range nor a full commit of a git source";
export declare const UNKNOWN_NAME = "no npm package name, of which pnpm makes a folder below node_modules";
export declare const WEAK_INTEGRITY = "no sha512 integrity, by which pnpm checks the bytes it fetched";
export declare const strayVersion: (repository?: string) => string;
export declare const UNKNOWN_SETTING = "a pnpm setting the template does not hold";
export declare const UNALLOWED_VALUE = "a value the template does not allow";
export declare const LINKED_FILE = "a dependency file as a symlink, whose target the check does not read";
export declare const NPMRC_KEY = "a .npmrc key, shown without its value, which may be a token; the template holds no .npmrc, so a setting belongs in pnpm-workspace.yaml and the .npmrc goes";
export declare const CONVERTED = "an attribute by which git writes other bytes into the worktree, which pnpm reads, than the check read";
