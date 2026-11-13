/**
 * The dependency files the supply check reads, and GitHub's answer, in Zod.
 *
 * JsonValueSchema: any value, for JSON whose shape the next schema checks with paths.
 * ManifestSchema, WorkspaceSchema, LockfileSchema: a package.json, a pnpm-workspace.yaml, a lockfile.
 * AnswerSchema, CompareSchema: the caller's fetch answer, and GitHub's compare in it.
 * Package, Answer, Issues: a lockfile's package, the fetch answer, and a failed check's issues.
 *
 * A lockfile is a strict allow-list down to each package's fields, so a key pnpm 12 never writes
 * for a registry, in-repo or GitHub-hosted source, such as a directory or a git resolution by
 * repository and commit, fails here by name; './lockfile.ts' decides which tarball passes.
 * A manifest and pnpm-workspace.yaml are loose: their settings are checked key by key in
 * './manifest.ts' and './workspace.ts', against lean-code's template.
 *
 * @example const parsed = LockfileSchema.safeParse(document);
 */
import { z } from 'zod';

/** Any value, for JSON whose shape the next schema checks with paths. */
export const JsonValueSchema = z.unknown();

const SpecifiersSchema = z.record(z.string(), z.string());

/** A package.json, as far as pnpm reads dependencies and settings from it. */
export const ManifestSchema = z.looseObject({
  dependencies: SpecifiersSchema.optional(),
  devDependencies: SpecifiersSchema.optional(),
  optionalDependencies: SpecifiersSchema.optional(),
  peerDependencies: SpecifiersSchema.optional(),
  resolutions: SpecifiersSchema.optional(),
  packageManager: z.string().optional(),
});

/** A pnpm-workspace.yaml: its structure keys; every other key is a setting. */
export const WorkspaceSchema = z.looseObject({
  packages: z.array(z.string()).optional(),
  catalog: SpecifiersSchema.optional(),
  catalogs: z.record(z.string(), SpecifiersSchema).optional(),
});

const LockedSchema = z.record(
  z.string(),
  z.strictObject({ specifier: z.string(), version: z.string() }),
);

// configDependencies run before every install and can bring a pnpmfile, so only none passes.
const ImporterSchema = z.strictObject({
  dependencies: LockedSchema.optional(),
  devDependencies: LockedSchema.optional(),
  optionalDependencies: LockedSchema.optional(),
  packageManagerDependencies: LockedSchema.optional(),
  configDependencies: z.strictObject({}).optional(),
});

// The platforms a package names, as a list or, where its own manifest wrote one, as a string.
const PlatformsSchema = z.union([z.array(z.string()), z.string()]);

// A registry package has its integrity alone, a GitHub-hosted one its tarball beside it, marked
// gitHosted, and its own version, which its key holds no more; a git or directory source names more.
// './lockfile.ts' decides which package may hold a tarball, gitHosted or a version.
const PackageSchema = z.strictObject({
  resolution: z.strictObject({
    integrity: z.string(),
    tarball: z.string().optional(),
    gitHosted: z.literal(true).optional(),
  }),
  version: z.string().optional(),
  engines: z.record(z.string(), z.string()).optional(),
  cpu: PlatformsSchema.optional(),
  os: PlatformsSchema.optional(),
  libc: PlatformsSchema.optional(),
  hasBin: z.boolean().optional(),
  deprecated: z.string().optional(),
  peerDependencies: SpecifiersSchema.optional(),
  peerDependenciesMeta: z.record(z.string(), z.strictObject({ optional: z.boolean() })).optional(),
  bundledDependencies: z.union([z.array(z.string()), z.boolean()]).optional(),
});

export type Package = z.output<typeof PackageSchema>;

const SnapshotSchema = z.strictObject({
  dependencies: SpecifiersSchema.optional(),
  optionalDependencies: SpecifiersSchema.optional(),
  transitivePeerDependencies: z.array(z.string()).optional(),
  optional: z.boolean().optional(),
});

/**
 * What the caller's fetch answers, as far as the check reads it.
 *
 * The caller's fetch port may hand back any shape, so it is checked like any other input.
 */
export const AnswerSchema = z.looseObject({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  text: z.string(),
});

export type Answer = z.output<typeof AnswerSchema>;

/** GitHub's compare of two commits: how the second stands to the first. */
export const CompareSchema = z.looseObject({
  status: z.enum(['ahead', 'behind', 'identical', 'diverged']),
});

/** One document of a pnpm 12 lockfile, with packageManager set its first holds pnpm itself. */
export const LockfileSchema = z.strictObject({
  lockfileVersion: z.literal('9.0'),
  settings: z
    .strictObject({
      autoInstallPeers: z.literal(true).optional(),
      excludeLinksFromLockfile: z.literal(false).optional(),
    })
    .optional(),
  importers: z.record(z.string(), ImporterSchema).optional(),
  catalogs: z.record(z.string(), LockedSchema).optional(),
  packages: z.record(z.string(), PackageSchema).optional(),
  snapshots: z.record(z.string(), SnapshotSchema).optional(),
});

export type Issues = z.ZodError['issues'];
