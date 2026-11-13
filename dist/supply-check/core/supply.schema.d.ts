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
export declare const JsonValueSchema: z.ZodUnknown;
/** A package.json, as far as pnpm reads dependencies and settings from it. */
export declare const ManifestSchema: z.ZodObject<{
    dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    devDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    optionalDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    peerDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    resolutions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    packageManager: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/** A pnpm-workspace.yaml: its structure keys; every other key is a setting. */
export declare const WorkspaceSchema: z.ZodObject<{
    packages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    catalog: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    catalogs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>>>;
}, z.core.$loose>;
declare const PackageSchema: z.ZodObject<{
    resolution: z.ZodObject<{
        integrity: z.ZodString;
        tarball: z.ZodOptional<z.ZodString>;
        gitHosted: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>;
    version: z.ZodOptional<z.ZodString>;
    engines: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cpu: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    os: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    libc: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    hasBin: z.ZodOptional<z.ZodBoolean>;
    deprecated: z.ZodOptional<z.ZodString>;
    peerDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    peerDependenciesMeta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        optional: z.ZodBoolean;
    }, z.core.$strict>>>;
    bundledDependencies: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodBoolean]>>;
}, z.core.$strict>;
export type Package = z.output<typeof PackageSchema>;
/**
 * What the caller's fetch answers, as far as the check reads it.
 *
 * The caller's fetch port may hand back any shape, so it is checked like any other input.
 */
export declare const AnswerSchema: z.ZodObject<{
    status: z.ZodNumber;
    headers: z.ZodRecord<z.ZodString, z.ZodString>;
    text: z.ZodString;
}, z.core.$loose>;
export type Answer = z.output<typeof AnswerSchema>;
/** GitHub's compare of two commits: how the second stands to the first. */
export declare const CompareSchema: z.ZodObject<{
    status: z.ZodEnum<{
        ahead: "ahead";
        behind: "behind";
        identical: "identical";
        diverged: "diverged";
    }>;
}, z.core.$loose>;
/** One document of a pnpm 12 lockfile, with packageManager set its first holds pnpm itself. */
export declare const LockfileSchema: z.ZodObject<{
    lockfileVersion: z.ZodLiteral<"9.0">;
    settings: z.ZodOptional<z.ZodObject<{
        autoInstallPeers: z.ZodOptional<z.ZodLiteral<true>>;
        excludeLinksFromLockfile: z.ZodOptional<z.ZodLiteral<false>>;
    }, z.core.$strict>>;
    importers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            specifier: z.ZodString;
            version: z.ZodString;
        }, z.core.$strict>>>;
        devDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            specifier: z.ZodString;
            version: z.ZodString;
        }, z.core.$strict>>>;
        optionalDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            specifier: z.ZodString;
            version: z.ZodString;
        }, z.core.$strict>>>;
        packageManagerDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            specifier: z.ZodString;
            version: z.ZodString;
        }, z.core.$strict>>>;
        configDependencies: z.ZodOptional<z.ZodObject<{}, z.core.$strict>>;
    }, z.core.$strict>>>;
    catalogs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodObject<{
        specifier: z.ZodString;
        version: z.ZodString;
    }, z.core.$strict>>>>;
    packages: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        resolution: z.ZodObject<{
            integrity: z.ZodString;
            tarball: z.ZodOptional<z.ZodString>;
            gitHosted: z.ZodOptional<z.ZodLiteral<true>>;
        }, z.core.$strict>;
        version: z.ZodOptional<z.ZodString>;
        engines: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        cpu: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
        os: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
        libc: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
        hasBin: z.ZodOptional<z.ZodBoolean>;
        deprecated: z.ZodOptional<z.ZodString>;
        peerDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        peerDependenciesMeta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            optional: z.ZodBoolean;
        }, z.core.$strict>>>;
        bundledDependencies: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodBoolean]>>;
    }, z.core.$strict>>>;
    snapshots: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        optionalDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        transitivePeerDependencies: z.ZodOptional<z.ZodArray<z.ZodString>>;
        optional: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type Issues = z.ZodError['issues'];
export {};
