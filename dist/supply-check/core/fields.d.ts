/**
 * The fields of each dependency file that the checks read by name.
 *
 * DEPENDENCY_FIELDS, SETTING_FIELDS: a package.json's dependency sources, and its pnpm settings.
 * IMPORTED: a lockfile importer's dependencies pnpm installs.
 * STRUCTURE: the keys of pnpm-workspace.yaml that are its structure, not settings.
 *
 * @example const values = DEPENDENCY_FIELDS.flatMap(field => Object.entries(manifest[field] ?? {}));
 */
export declare const DEPENDENCY_FIELDS: readonly ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "resolutions"];
export declare const SETTING_FIELDS: string[];
export declare const IMPORTED: readonly ["dependencies", "devDependencies", "optionalDependencies", "packageManagerDependencies"];
export declare const STRUCTURE: string[];
