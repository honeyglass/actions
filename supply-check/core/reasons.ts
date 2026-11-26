/**
 * The reasons a hit gives for a refused form, which more than one check names.
 *
 * UNKNOWN_FORM: a dependency value or version of no form the check allows.
 * offMain, otherCommit: a pin GitHub does not place on main, a version naming another commit.
 * foreignTarball, STRAY_GITHOSTED, strayVersion: a package's tarball, gitHosted and version.
 * UNKNOWN_PEER, UNKNOWN_NAME, WEAK_INTEGRITY: a peer range, a name and a hash pnpm acts on.
 * UNKNOWN_SETTING, UNALLOWED_VALUE: a pnpm setting the template lacks, and a value it does not allow.
 * LINKED_FILE: a dependency file tracked as a symlink.
 * NPMRC_KEY: a key of a .npmrc.
 * CONVERTED: an attribute by which git converts a supply file in the worktree.
 *
 * Each is the exact text a hit carries, which CI prints and lean-code's commit tool shows.
 * One that names a repository names the one the value is about, or every repository of
 * REPOSITORIES where the value names none.
 *
 * @example return [hitOf(file, [key], value, UNKNOWN_SETTING)];
 */
import { REPOSITORIES } from './grammar.ts';

const LISTED = REPOSITORIES.join(' or ');

export const UNKNOWN_FORM = `neither a registry version or range, an npm: alias, workspace:, catalog:, a link: inside the repository nor a full commit of ${REPOSITORIES.map(name => `github:${name}`).join(' or ')}`;
export const offMain = (repository: string) =>
  `a commit GitHub's API does not place on the main branch of ${repository}, such as a fork's, which GitHub serves under the repository's URL too`;
export const otherCommit = (repository: string) =>
  `a version and a specifier that do not name the same commit of github:${repository}`;
export const foreignTarball = (repository = LISTED) =>
  `a tarball other than the GitHub-hosted ${repository} at the commit its key names, or none where its key names one`;
export const STRAY_GITHOSTED = 'gitHosted on a package without a tarball';
export const UNKNOWN_PEER = `neither registry ranges and dist-tags, an npm: alias to a registry range nor a full commit of ${REPOSITORIES.map(name => `github:${name}`).join(' or ')}`;
export const UNKNOWN_NAME = 'no npm package name, of which pnpm makes a folder below node_modules';
export const WEAK_INTEGRITY = 'no sha512 integrity, by which pnpm checks the bytes it fetched';
export const strayVersion = (repository = LISTED) =>
  `a package version, which only the GitHub-hosted ${repository} holds, as major.minor.patch`;
export const UNKNOWN_SETTING = 'a pnpm setting the template does not hold';
export const UNALLOWED_VALUE = 'a value the template does not allow';
export const LINKED_FILE = 'a dependency file as a symlink, whose target the check does not read';
export const NPMRC_KEY =
  'a .npmrc key, shown without its value, which may be a token; the template holds no .npmrc, so a setting belongs in pnpm-workspace.yaml and the .npmrc goes';
export const CONVERTED =
  'an attribute by which git writes other bytes into the worktree, which pnpm reads, than the check read';
