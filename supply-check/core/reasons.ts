/**
 * The reasons a hit gives for a refused form, which more than one check names.
 *
 * UNKNOWN_FORM: a dependency value or version of no form the check allows.
 * OFF_MAIN, OTHER_COMMIT: a pin GitHub does not place on main, and a version naming another commit.
 * FOREIGN_TARBALL, STRAY_GITHOSTED, STRAY_VERSION: a lockfile package's tarball, gitHosted, version.
 * UNKNOWN_SETTING, UNALLOWED_VALUE: a pnpm setting the template lacks, and a value it does not allow.
 * LINKED_FILE: a dependency file tracked as a symlink.
 * NPMRC_KEY: a key of a .npmrc.
 * CONVERTED: an attribute by which git converts a supply file in the worktree.
 *
 * Each is the exact text a hit carries, which CI prints and lean-code's commit tool shows.
 *
 * @example return [hitOf(file, [key], value, UNKNOWN_SETTING)];
 */

export const UNKNOWN_FORM =
  'neither a registry version or range, an npm: alias, workspace:, catalog:, a link: inside the repository nor a full commit of github:honeyglass/utils';
export const OFF_MAIN =
  "a commit GitHub's API does not place on the main branch of honeyglass/utils, such as a fork's, which GitHub serves under the repository's URL too";
export const OTHER_COMMIT =
  'a version and a specifier that do not name the same commit of github:honeyglass/utils';
export const FOREIGN_TARBALL =
  'a tarball other than the GitHub-hosted honeyglass/utils at the commit its key names, or none where its key names one';
export const STRAY_GITHOSTED = 'gitHosted on a package without a tarball';
export const STRAY_VERSION =
  'a package version, which only the GitHub-hosted honeyglass/utils holds, as major.minor.patch';
export const UNKNOWN_SETTING = 'a pnpm setting the template does not hold';
export const UNALLOWED_VALUE = 'a value the template does not allow';
export const LINKED_FILE = 'a dependency file as a symlink, whose target the check does not read';
export const NPMRC_KEY =
  'a .npmrc key, shown without its value, which may be a token; the template holds no .npmrc, so a setting belongs in pnpm-workspace.yaml and the .npmrc goes';
export const CONVERTED =
  'an attribute by which git writes other bytes into the worktree, which pnpm reads, than the check read';
