/**
 * The fields of each dependency file that the checks read by name.
 *
 * DEPENDENCY_FIELDS, SETTING_FIELDS: a package.json's dependency sources, and its pnpm settings.
 * IMPORTED: a lockfile importer's dependencies pnpm installs.
 * STRUCTURE: the keys of pnpm-workspace.yaml that are its structure, not settings.
 *
 * @example const values = DEPENDENCY_FIELDS.flatMap(field => Object.entries(manifest[field] ?? {}));
 */

// The fields of a package.json whose values name a dependency's source.
export const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'resolutions',
] as const;
// The fields of a package.json pnpm reads settings from, which the template holds none of.
export const SETTING_FIELDS = ['pnpm', 'devEngines', 'dependenciesMeta'];
// The fields of a lockfile importer whose entries pnpm installs.
export const IMPORTED = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'packageManagerDependencies',
] as const;
// The keys of pnpm-workspace.yaml that are its structure, with rules of their own, not settings.
export const STRUCTURE = ['packages', 'catalog', 'catalogs'];
