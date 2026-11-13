/**
 * The supply check through '@honeyglass/actions/supply-check': every allowed and refused form of a
 * dependency file as one row, against excerpts of real lockfiles and of lean-code's templates/repo.
 *
 * The rows came from lean-code's 'tests/api/supply.api.test.ts', whose check moved here whole, so
 * each hit's file, field, value and reason stays as lean-code asserted it.
 * Run with `pnpm test`, which runs the committed build in 'dist/' through the package's own name.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isRefusal } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import type { Fetch, PathKind, SupplyHit } from '@honeyglass/actions/supply-check';
import {
  CONVERSIONS,
  conversionHits,
  hitLine,
  isAttributesFile,
  isSupplyFile,
  supplyHits,
} from '@honeyglass/actions/supply-check';

const PNPM =
  'pnpm@12.9.0+sha512.8f64efa0b792986ca98ae568791bcd7722807e274c4f0c1d9853c62116495c584119db98762a2a5343b1684d361b9ae26fdd16d551666d7635346d3fae830ddd';
// lean-code's templates/repo/pnpm-workspace.yaml as that repository holds it, with the
// ignorePnpmfile it takes on in A2
const TEMPLATE_WORKSPACE = `# pnpm reads its settings from this file, not from package.json. Every rule here is
# also explained in SECURITY.md.

# A version has to be three days old before pnpm resolves it. A compromised release is
# usually found and pulled within hours, so a fresh one never reaches this repository.
# Dependabot waits the same three days before it opens a pull request, see
# .github/dependabot.yml.
minimumReleaseAge: 4320

# No dependency runs an install script. pnpm blocks them unless a package is approved
# under allowBuilds, and the list stays empty on purpose. strictDepBuilds turns a script
# that would have been skipped into an install that fails, so nothing is silently ignored.
allowBuilds: {}
strictDepBuilds: true

# Only a dependency named in package.json may come from a git repository or a tarball URL.
# Every package below it comes from the registry, so no package deep in the tree can fetch
# code from a host nobody chose.
blockExoticSubdeps: true

# A version published with weaker proof of its origin than the versions before it fails the
# install. A package that came from its project's CI through trusted publishing and suddenly
# comes from a plain token is what a stolen npm token looks like.
trustPolicy: no-downgrade

# pnpm loads no .pnpmfile.cjs, whose code would run at every install.
ignorePnpmfile: true
`;
// lean-code's templates/repo/package.json as that repository holds it
const TEMPLATE_MANIFEST = JSON.stringify(
  {
    private: true,
    packageManager: PNPM,
    scripts: { format: 'prettier --write .', 'format:check': 'prettier --check .' },
    devDependencies: { 'lint-staged': '17.6.0', prettier: '3.9.10' },
    'lint-staged': { '*': 'prettier --write --ignore-unknown' },
  },
  null,
  2,
);
// the template's settings without its comments, which a row widens or cuts
const SETTINGS = `minimumReleaseAge: 4320
allowBuilds: {}
strictDepBuilds: true
blockExoticSubdeps: true
trustPolicy: no-downgrade
ignorePnpmfile: true
`;
// a path in a node_modules folder, refused by its path alone
const IN_MODULES =
  'a path in a node_modules folder, from which Node loads packages and which only the install may fill';
// lean-code's own pnpm-workspace.yaml: its two workspace packages above the template's settings
const OWN_WORKSPACE = `packages:\n  - sandbox-manager\n  - permission-manager\n${SETTINGS}`;
// lean-code's own pnpm-lock.yaml, cut: the document pnpm keeps for itself with packageManager set,
// then the project's, with an npm: alias and peer suffixes nested two deep
const OWN_LOCKFILE = `---
lockfileVersion: '9.0'

importers:

  .:
    configDependencies: {}
    packageManagerDependencies:
      pnpm:
        specifier: 12.9.0
        version: 12.9.0

packages:

  '@pnpm/exe.darwin-arm64@12.9.0':
    resolution: {integrity: sha512-AAAA==}
    cpu: [arm64]
    os: [darwin]

  pnpm@12.9.0:
    resolution: {integrity: sha512-BBBB==}
    engines: {node: '>=18.*'}
    hasBin: true

snapshots:

  '@pnpm/exe.darwin-arm64@12.9.0':
    optional: true

  pnpm@12.9.0:
    optionalDependencies:
      '@pnpm/exe.darwin-arm64': 12.9.0

---
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      zod:
        specifier: 4.6.5
        version: 4.6.5
    devDependencies:
      eslint-plugin-zod:
        specifier: 5.0.0
        version: 5.0.0(@typescript/typescript6@6.0.2)(eslint@10.12.0(jiti@2.6.1)(supports-color@10.2.2))(supports-color@10.2.2)(zod@4.6.5)
      typescript:
        specifier: npm:@typescript/typescript6@6.0.2
        version: '@typescript/typescript6@6.0.2'

  sandbox-manager:
    dependencies:
      zod:
        specifier: 4.6.5
        version: 4.6.5

packages:

  '@typescript/typescript6@6.0.2':
    resolution: {integrity: sha512-CCCC==}
    hasBin: true

  eslint-plugin-zod@5.0.0:
    resolution: {integrity: sha512-DDDD==}
    engines: {node: ^20.19 || ^22.12 || >=24}
    peerDependencies:
      eslint: ^9 || ^10
      zod: ^4
    peerDependenciesMeta:
      eslint:
        optional: true

  typescript@6.0.3:
    resolution: {integrity: sha512-EEEE==}
    engines: {node: '>=14.17'}
    hasBin: true

snapshots:

  '@typescript/typescript6@6.0.2':
    dependencies:
      '@typescript/old': typescript@6.0.3

  eslint-plugin-zod@5.0.0(@typescript/typescript6@6.0.2)(eslint@10.12.0(jiti@2.6.1)(supports-color@10.2.2))(supports-color@10.2.2)(zod@4.6.5):
    optionalDependencies:
      eslint: 10.12.0(jiti@2.6.1)(supports-color@10.2.2)
      zod: 4.6.5
    transitivePeerDependencies:
      - supports-color

  typescript@6.0.3: {}

  zod@4.6.5: {}
`;
// blog's pnpm-lock.yaml, cut: ranges as specifiers, a bundled and a deprecated package, a libc string
const BLOG_LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      astro:
        specifier: ^7.3.8
        version: 7.3.8(@astrojs/markdown-remark@7.3.2(supports-color@10.2.2))(@types/node@26.6.5)(esbuild@0.28.2)(jiti@2.7.0)(yaml@2.9.1)
      '@tailwindcss/vite':
        specifier: ^4.3.3
        version: 4.3.3(vite@8.3.4(@types/node@26.6.5)(esbuild@0.28.2)(jiti@2.7.0)(yaml@2.9.1))

packages:

  '@tailwindcss/oxide-wasm32-wasi@4.3.3':
    resolution: {integrity: sha512-FFFF==}
    engines: {node: '>=14.0.0'}
    cpu: [wasm32]
    bundledDependencies:
      - '@napi-rs/wasm-runtime'

  glob@10.5.0:
    resolution: {integrity: sha512-GGGG==}
    deprecated: Old versions of glob are not supported.

  sass-embedded-linux-x64@1.93.2:
    resolution: {integrity: sha512-HHHH==}
    os: [linux]
    libc: glibc
`;
// a lockfile of one importer at packages/a, its `kind` of dependencies holding the entry's lines
const lockfileWith = (entry: string, kind = 'dependencies') => `lockfileVersion: '9.0'

importers:

  packages/a:
    ${kind}:
${entry}
`;
// a lockfile entry whose specifier and version are the two values
const entryOf = (specifier: string, version: string) =>
  `      x:\n        specifier: ${specifier}\n        version: ${version}`;
// a package.json whose dependency 'x' of `field` has the value
const manifestWith = (value: string, field = 'dependencies') =>
  JSON.stringify({ [field]: { x: value } });
// The paths the tree holds beside the staged files, by their git mode: two workspace packages, a
// folder of scripts, a symlink 'up' that leads back to the top level, and a folder eslint-config.
const TRACKED: Record<string, string> = {
  'packages/a/index.ts': '100644',
  'packages/b/index.ts': '100644',
  'plugins/astro/scripts/port-check.sh': '100755',
  up: '120000',
  'eslint-config/index.js': '100644',
};
// a token's shape, built at run time, so no secret scanner meets one in this file
const TOKEN = `npm_${'x'.repeat(36)}`;

type Row = {
  what: string;
  files: Record<string, string>;
  modes?: Record<string, string>;
  deleted?: string[];
  repository?: string;
  fetch?: Fetch;
  sleep?: (ms: number) => Promise<void>;
  token?: string;
  hits: Partial<SupplyHit>[];
};

// What the tree holds at a path: TRACKED's file or symlink, or a folder that holds one.
const kindOf = async (path: string): Promise<PathKind | undefined> => {
  const mode = TRACKED[path];
  if (mode !== undefined) return mode === '120000' ? 'link' : 'file';
  return Object.keys(TRACKED).some(tracked => tracked.startsWith(`${path}/`))
    ? 'folder'
    : undefined;
};

// Commits of honeyglass/utils: main's head, one main holds below it, a fork's that GitHub serves
// under the repository's URL too, a fork's made on main's head, and one GitHub does not know.
const HEAD = '2'.repeat(40);
const BEHIND = '1'.repeat(40);
const FORK = 'f'.repeat(40);
const AHEAD = 'a'.repeat(40);
const UNKNOWN = 'e'.repeat(40);
const CODELOAD = 'https://codeload.github.com/honeyglass/utils/tar.gz/';
const COMPARE = 'https://api.github.com/repos/honeyglass/utils/compare/main...';
// GitHub's compare of main with each commit, as its API answers without a token: main's head and
// an unknown commit as the person measured them on 2026-11-10, the others as GitHub documents them.
const COMPARED: Record<string, string> = {
  [HEAD]: '{"status":"identical","ahead_by":0,"behind_by":0}',
  [BEHIND]: '{"status":"behind","ahead_by":0,"behind_by":3}',
  [FORK]: '{"status":"diverged","ahead_by":1,"behind_by":2}',
  [AHEAD]: '{"status":"ahead","ahead_by":1,"behind_by":0}',
};
// a wait that never ends, so every fetch answers before the deadline
const idle = () => new Promise<void>(() => {});
const github: Fetch = async url => {
  const text = COMPARED[url.slice(COMPARE.length)];
  return text === undefined
    ? { status: 404, headers: {}, text: '{"message":"Not Found","status":"404"}' }
    : { status: 200, headers: {}, text };
};
// a lockfile whose root depends on honeyglass/utils at `sha`, as pnpm 12.9.0 wrote one for the
// person on 2026-11-10
const pinnedLockfile = (sha: string) => `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@honeyglass/utils':
        specifier: github:honeyglass/utils#${sha}
        version: ${CODELOAD}${sha}

packages:

  '@honeyglass/utils@${CODELOAD}${sha}':
    resolution: {gitHosted: true, integrity: sha512-IIII==, tarball: ${CODELOAD}${sha}}
    version: 0.0.0

snapshots:

  '@honeyglass/utils@${CODELOAD}${sha}': {}
`;
// the fields of pinnedLockfile that name the commit, in the order the check reports them
const pinnedFields = (sha: string, url = `${CODELOAD}${sha}`) => [
  'importers.".".dependencies.@honeyglass/utils.specifier',
  'importers.".".dependencies.@honeyglass/utils.version',
  `packages.${JSON.stringify(`@honeyglass/utils@${url}`)}`,
  `packages.${JSON.stringify(`@honeyglass/utils@${url}`)}.resolution.tarball`,
  `snapshots.${JSON.stringify(`@honeyglass/utils@${url}`)}`,
];

const hitsOf = ({
  files,
  modes = {},
  deleted = [],
  repository,
  fetch = github,
  sleep = idle,
  token,
}: Omit<Row, 'what' | 'hits'>) =>
  supplyHits({
    staged: Object.entries(files).map(([path, text]) => ({
      path,
      mode: modes[path] ?? '100644',
      text,
    })),
    deleted,
    kindOf,
    repository,
    fetch,
    sleep,
    token,
  });

// the hits as lean-code's commit tool and make-repo ask them, without GitHub's API
const localHitsOf = (files: Record<string, string>) =>
  supplyHits({
    staged: Object.entries(files).map(([path, text]) => ({ path, mode: '100644', text })),
    deleted: [],
    kindOf,
    repository: undefined,
    formOnly: true,
  });

// a staged symlink at `path`, whose text is its target
const symlinked = (path: string, target: string) => ({
  files: { [path]: target },
  modes: { [path]: '120000' },
});

/**
 * Asserts the hits in number and order, each by the fields its expected hit names.
 *
 * A refusal fails the assertion, as the caller then reads no hits at all.
 */
const assertHits = (answer: SupplyHit[] | Refusal, expected: Partial<SupplyHit>[]) => {
  assert.ok(Array.isArray(answer), `a refusal in place of hits: ${JSON.stringify(answer)}`);
  const named = answer.map((hit, i) =>
    Object.fromEntries(
      Object.entries(hit).filter(([key]) => Object.hasOwn(expected[i] ?? {}, key)),
    ),
  );
  assert.deepEqual(named, expected);
};

const passing: Omit<Row, 'hits'>[] = [
  { what: "lean-code's own lockfile, both documents", files: { 'pnpm-lock.yaml': OWN_LOCKFILE } },
  { what: "blog's lockfile of ranges", files: { 'pnpm-lock.yaml': BLOG_LOCKFILE } },
  {
    what: "the template's pnpm-workspace.yaml in any repository",
    files: { 'pnpm-workspace.yaml': TEMPLATE_WORKSPACE },
  },
  {
    what: "templates/repo's own pnpm-workspace.yaml, which holds the template exactly",
    files: { 'templates/repo/pnpm-workspace.yaml': TEMPLATE_WORKSPACE },
  },
  {
    what: "templates/repo's own package.json, with the template's packageManager",
    files: { 'templates/repo/package.json': TEMPLATE_MANIFEST },
  },
  { what: "lean-code's own pnpm-workspace.yaml", files: { 'pnpm-workspace.yaml': OWN_WORKSPACE } },
  ...[
    '1.2.3',
    '^1.2.3',
    '~0.8.0',
    '>=1.0.0 <2.0.0',
    '1.x',
    '*',
    '1.2.3 - 2.0.0',
    '^18.0.0 || ^20.0.0',
    '4.0.0-beta.0',
    'npm:@typescript/typescript6@6.0.2',
    'npm:typescript@7.0.2',
    'workspace:*',
    'workspace:^',
    'workspace:^1.2.3',
    'catalog:',
    'catalog:react18',
    'link:../b',
  ].map(value => ({
    what: `the dependency value ${value}`,
    files: { 'packages/a/package.json': manifestWith(value) },
  })),
  {
    what: 'a peer dependency range and a resolution of the registry',
    files: {
      'package.json': JSON.stringify({
        peerDependencies: { eslint: '>=9' },
        resolutions: { a: '1.2.3' },
      }),
    },
  },
  {
    what: 'workspace globs inside the repository, a negated one too',
    files: {
      'pnpm-workspace.yaml': `packages:\n  - 'packages/*'\n  - '!**/test/**'\n${SETTINGS}`,
    },
  },
  {
    what: 'catalogs of registry ranges',
    files: {
      'pnpm-workspace.yaml': `catalog:\n  react: ^18.0.0\ncatalogs:\n  old:\n    react: npm:react@17.0.2\n${SETTINGS}`,
    },
  },
  {
    what: "a lockfile importer's workspace dependency linked to a tracked folder",
    files: { 'pnpm-lock.yaml': lockfileWith(entryOf('workspace:*', 'link:../b')) },
  },
  {
    what: 'a dependency on a commit that lies on the main branch of honeyglass/utils',
    files: { 'package.json': manifestWith(`github:honeyglass/utils#${BEHIND}`) },
  },
  {
    what: "a lockfile that pins honeyglass/utils at main's head",
    files: { 'pnpm-lock.yaml': pinnedLockfile(HEAD) },
  },
  {
    what: "blog's approved builds and hoisted name, for blog alone",
    files: {
      'pnpm-workspace.yaml': `${SETTINGS}publicHoistPattern:\n  - cookie\n`.replace(
        'allowBuilds: {}',
        'allowBuilds:\n  esbuild: true\n  workerd: true',
      ),
    },
    repository: 'honeyglass/blog',
  },
  {
    what: "lab's symlink to a script in the repository",
    ...symlinked(
      'plugins/astro/skills/deploy/scripts/port-check.sh',
      '../../../scripts/port-check.sh',
    ),
  },
  { what: 'a symlink to a tracked folder', ...symlinked('docs/packages', '../packages') },
  { what: 'a file the check does not read', files: { 'README.md': 'link:../outside\n' } },
  { what: 'a deleted file that is no workspace', files: {}, deleted: ['package.json'] },
  { what: 'an empty .npmrc', files: { '.npmrc': '' } },
  {
    what: 'a .npmrc of comments and blank lines alone',
    files: { 'packages/a/.npmrc': '# registry=https://npm.example.com/\n\n  ; old\r\n' },
  },
];

const refused: Row[] = [
  ...[
    { value: 'latest', reason: 'a dist-tag' },
    { value: 'file:../msw/', reason: "mock.man's local fork" },
    { value: 'https://example.com/a-1.0.0.tgz', reason: 'a tarball URL' },
    { value: 'git+https://github.com/a/b.git', reason: 'a git source' },
    { value: 'github:a/b', reason: 'a GitHub shorthand' },
    { value: 'jsr:@std/path@1.0.0', reason: 'jsr:' },
    { value: 'npm:typescript', reason: 'an npm: alias without a range' },
    { value: 'workspace:../b', reason: 'a workspace: path' },
    { value: 'catalog:../x', reason: 'a catalog: name of other characters' },
    { value: '', reason: 'an empty value' },
    { value: 'link:/Users/me/eslint-config', reason: 'an absolute link:' },
    { value: 'link:../b/index.ts', reason: 'a link: to a tracked file' },
  ].map(({ value, reason }) => ({
    what: `${reason} as a dependency value`,
    files: { 'packages/a/package.json': manifestWith(value) },
    hits: [{ field: 'dependencies.x', value: JSON.stringify(value) }],
  })),
  ...[
    { what: 'a line separator', char: '\u{2028}', escape: '\\u{2028}' },
    { what: 'a bidi override', char: '\u{202e}', escape: '\\u{202e}' },
  ].flatMap(({ what, char, escape }) => [
    {
      what: `a dependency value with ${what}, escaped on one line`,
      files: { 'packages/a/package.json': manifestWith(`latest${char}x`) },
      hits: [{ field: 'dependencies.x', value: `"latest${escape}x"` }],
    },
    {
      what: `a dependency name with ${what}, escaped on one line`,
      files: { 'packages/a/package.json': JSON.stringify({ dependencies: { [`x${char}y`]: '' } }) },
      hits: [{ field: `dependencies."x${escape}y"`, value: '""' }],
    },
  ]),
  {
    what: 'a long dependency value whose cut splits an emoji, its half escaped',
    files: { 'packages/a/package.json': manifestWith(`${'a'.repeat(75)}\u{1f600}bbbbb`) },
    hits: [{ field: 'dependencies.x', value: `"${'a'.repeat(75)}\\ud83d...` }],
  },
  {
    what: 'a link: that leaves the repository, by its reason',
    files: { 'packages/a/package.json': manifestWith('link:../../../eslint-config') },
    hits: [{ field: 'dependencies.x', reason: 'a link: that leaves the repository' }],
  },
  {
    what: 'a link: to no tracked folder, by its reason',
    files: { 'packages/a/package.json': manifestWith('link:../missing') },
    hits: [{ field: 'dependencies.x', reason: 'a link: to no folder the repository tracks' }],
  },
  {
    what: "a link: through a symlink, whose '..' climbs from where the symlink lands",
    files: { 'package.json': manifestWith('link:up/../eslint-config') },
    hits: [{ field: 'dependencies.x', reason: 'a link: that leaves the repository' }],
  },
  ...['optionalDependencies', 'peerDependencies', 'devDependencies'].map(field => ({
    what: `a local link among the ${field}`,
    files: { 'package.json': manifestWith('link:../x', field) },
    hits: [{ field: `${field}.x`, value: '"link:../x"' }],
  })),
  {
    what: 'a resolution to a local link',
    files: { 'package.json': JSON.stringify({ resolutions: { a: 'link:../a' } }) },
    hits: [{ field: 'resolutions.a', value: '"link:../a"' }],
  },
  {
    what: "every key of package.json's pnpm",
    files: {
      'package.json': JSON.stringify({
        pnpm: { overrides: { a: '1.0.0' }, neverBuiltDependencies: [] },
      }),
    },
    hits: [{ field: 'pnpm.overrides' }, { field: 'pnpm.neverBuiltDependencies', value: '[]' }],
  },
  {
    what: "package.json's devEngines, by which pnpm downloads a runtime",
    files: {
      'package.json': JSON.stringify({
        devEngines: { runtime: { name: 'node', onFail: 'download' } },
      }),
    },
    hits: [{ field: 'devEngines.runtime' }],
  },
  {
    what: "package.json's dependenciesMeta",
    files: { 'package.json': JSON.stringify({ dependenciesMeta: { a: { injected: true } } }) },
    hits: [{ field: 'dependenciesMeta.a', value: '{"injected":true}' }],
  },
  {
    what: "blog's pnpm 11 as packageManager",
    files: { 'package.json': JSON.stringify({ packageManager: 'pnpm@11.21.0' }) },
    hits: [{ field: 'packageManager', value: '"pnpm@11.21.0"' }],
  },
  {
    what: "templates/repo's own package.json without the template's packageManager",
    files: { 'templates/repo/package.json': JSON.stringify({ private: true }) },
    hits: [{ field: 'packageManager', value: 'missing' }],
  },
  {
    what: 'a package.json that is no JSON',
    files: { 'package.json': '{ "dependencies": ' },
    hits: [{ field: '', value: '' }],
  },
  {
    what: 'a dependency value that is no string',
    files: { 'package.json': JSON.stringify({ dependencies: { a: 1 } }) },
    hits: [{ field: 'dependencies.a', value: '1' }],
  },
  ...['Package.json', 'PACKAGE.JSON', 'package.jſon'].map(name => ({
    what: `a ${name}, which APFS opens as package.json`,
    files: { [name]: manifestWith('link:../x') },
    hits: [{ field: 'dependencies.x', value: '"link:../x"' }],
  })),
  {
    what: 'a PNPM-WORKSPACE.YAML, which APFS opens as pnpm-workspace.yaml',
    files: { 'PNPM-WORKSPACE.YAML': `${SETTINGS}dangerouslyAllowAllBuilds: true\n` },
    hits: [{ field: 'dangerouslyAllowAllBuilds', value: 'true' }],
  },
  {
    what: 'a Pnpm-Lock.yaml, which APFS opens as pnpm-lock.yaml',
    files: { 'Pnpm-Lock.yaml': lockfileWith(entryOf('latest', '1.0.0')) },
    hits: [{ field: 'importers.packages/a.dependencies.x.specifier', value: '"latest"' }],
  },
  ...['pnpm-workspace.yaml', 'tools/PNPM-Workspace.yaml'].map(path => ({
    what: `a deleted or renamed ${path}, whose settings pnpm then no longer reads`,
    files: {},
    deleted: [path],
    hits: [{ file: path, field: '', value: '' }],
  })),
  {
    what: "mock.man's wait of 7 days",
    files: { 'pnpm-workspace.yaml': SETTINGS.replace('4320', '10080') },
    hits: [{ file: 'pnpm-workspace.yaml', field: 'minimumReleaseAge', value: '10080' }],
  },
  {
    what: 'a setting of the template left out',
    files: { 'pnpm-workspace.yaml': SETTINGS.replace('minimumReleaseAge: 4320\n', '') },
    hits: [{ field: 'minimumReleaseAge', value: 'missing' }],
  },
  ...['pnpm-workspace.yaml', 'templates/repo/pnpm-workspace.yaml'].map(path => ({
    what: `a ${path} without ignorePnpmfile, so pnpm loads a pnpmfile`,
    files: { [path]: SETTINGS.replace('ignorePnpmfile: true\n', '') },
    hits: [{ field: 'ignorePnpmfile', value: 'missing' }],
  })),
  {
    what: 'ignorePnpmfile set to false',
    files: {
      'pnpm-workspace.yaml': SETTINGS.replace('ignorePnpmfile: true', 'ignorePnpmfile: false'),
    },
    hits: [
      { field: 'ignorePnpmfile', value: 'false', reason: 'a value the template does not allow' },
    ],
  },
  ...[
    'dangerouslyAllowAllBuilds: true',
    'excludeLinksFromLockfile: false',
    'gitBranchLockfile: true',
    "lockfileDir: '..'",
    'overrides:\n  a: link:../a',
  ].map(line => ({
    what: `the setting ${line.split(':')[0] ?? ''}, which the template lacks`,
    files: { 'pnpm-workspace.yaml': `${SETTINGS}${line}\n` },
    hits: [{ field: line.split(':')[0] }],
  })),
  {
    what: "blog's approved builds in another repository",
    files: {
      'pnpm-workspace.yaml': SETTINGS.replace('allowBuilds: {}', 'allowBuilds:\n  esbuild: true'),
    },
    repository: 'honeyglass/nix',
    hits: [{ field: 'allowBuilds.esbuild', value: 'true' }],
  },
  {
    what: 'a build blog has no approval for',
    files: {
      'pnpm-workspace.yaml': SETTINGS.replace('allowBuilds: {}', 'allowBuilds:\n  evil: true'),
    },
    repository: 'honeyglass/blog',
    hits: [{ field: 'allowBuilds.evil', value: 'true' }],
  },
  {
    what: "templates/repo's own pnpm-workspace.yaml with blog's exception, in blog",
    files: {
      'templates/repo/pnpm-workspace.yaml': SETTINGS.replace(
        'allowBuilds: {}',
        'allowBuilds:\n  esbuild: true',
      ),
    },
    repository: 'honeyglass/blog',
    hits: [{ field: 'allowBuilds', value: '{"esbuild":true}' }],
  },
  {
    what: "templates/repo's own pnpm-workspace.yaml with workspace packages",
    files: { 'templates/repo/pnpm-workspace.yaml': OWN_WORKSPACE },
    hits: [{ field: 'packages', value: '["sandbox-manager","permission-manager"]' }],
  },
  ...[
    { glob: '../../eslint-config', what: 'that leaves the repository' },
    { glob: 'packages/../../eslint-config', what: "with a '..' after a name" },
    { glob: '..{,}/eslint-config', what: 'with a brace' },
    { glob: '..?(x)/eslint-config', what: 'with an extglob' },
    { glob: 'packages/[ab]', what: 'with a class' },
  ].map(({ glob, what }) => ({
    what: `a workspace glob ${what}`,
    files: { 'tools/pnpm-workspace.yaml': `packages:\n  - '${glob}'\n${SETTINGS}` },
    hits: [{ field: 'packages[0]', value: JSON.stringify(glob) }],
  })),
  {
    what: 'a catalog value that is a local link',
    files: { 'pnpm-workspace.yaml': `catalog:\n  react: link:../react\n${SETTINGS}` },
    hits: [{ field: 'catalog.react', value: '"link:../react"' }],
  },
  {
    what: "a dist-tag in one of the workspace's named catalogs",
    files: { 'pnpm-workspace.yaml': `catalogs:\n  old:\n    react: latest\n${SETTINGS}` },
    hits: [{ field: 'catalogs.old.react', value: '"latest"' }],
  },
  {
    what: 'a pnpm-workspace.yaml of two documents',
    files: { 'pnpm-workspace.yaml': `${SETTINGS}---\n${SETTINGS}` },
    hits: [{ field: '' }],
  },
  {
    what: 'a pnpm-workspace.yaml with a key twice',
    files: { 'pnpm-workspace.yaml': `${SETTINGS}trustPolicy: off\n` },
    hits: [{ field: '' }],
  },
  {
    what: 'a lockfile setting that keeps links out of the lockfile',
    files: {
      'pnpm-lock.yaml': BLOG_LOCKFILE.replace(
        'excludeLinksFromLockfile: false',
        'excludeLinksFromLockfile: true',
      ),
    },
    hits: [{ field: 'settings.excludeLinksFromLockfile', value: 'true' }],
  },
  ...['overrides', 'patchedDependencies', 'pnpmfileChecksum'].map(key => ({
    what: `the lockfile key ${key}`,
    files: { 'pnpm-lock.yaml': `${BLOG_LOCKFILE}\n${key}: {}\n` },
    hits: [{ field: key, value: '{}' }],
  })),
  {
    what: 'a lockfile of another version',
    files: { 'pnpm-lock.yaml': BLOG_LOCKFILE.replace("'9.0'", "'6.0'") },
    hits: [{ field: 'lockfileVersion', value: '"6.0"' }],
  },
  {
    what: 'a tarball resolution',
    files: {
      'pnpm-lock.yaml': BLOG_LOCKFILE.replace(
        '{integrity: sha512-GGGG==}',
        '{integrity: sha512-GGGG==, tarball: https://example.com/glob-10.5.0.tgz}',
      ),
    },
    hits: [{ field: 'packages."glob@10.5.0".resolution.tarball' }],
  },
  {
    what: "mock.man's directory resolution of its local fork",
    files: {
      'pnpm-lock.yaml': `${BLOG_LOCKFILE}\n  '@mockman/msw-internals@file:../msw':\n    resolution: {directory: ../msw, type: directory}\n`,
    },
    hits: [
      {
        field: 'packages."@mockman/msw-internals@file:../msw".resolution.integrity',
        value: 'missing',
      },
      {
        field: 'packages."@mockman/msw-internals@file:../msw".resolution.directory',
        value: '"../msw"',
      },
      {
        field: 'packages."@mockman/msw-internals@file:../msw".resolution.type',
        value: '"directory"',
      },
    ],
  },
  {
    what: 'a git resolution by repository and commit',
    files: {
      'pnpm-lock.yaml': `${BLOG_LOCKFILE}\n  'utils@git+https://github.com/honeyglass/utils.git#${HEAD}':\n    resolution: {commit: ${HEAD}, repo: https://github.com/honeyglass/utils.git, type: git}\n`,
    },
    hits: [
      {
        field: `packages."utils@git+https://github.com/honeyglass/utils.git#${HEAD}".resolution.integrity`,
        value: 'missing',
      },
      {
        field: `packages."utils@git+https://github.com/honeyglass/utils.git#${HEAD}".resolution.commit`,
      },
      {
        field: `packages."utils@git+https://github.com/honeyglass/utils.git#${HEAD}".resolution.repo`,
      },
      {
        field: `packages."utils@git+https://github.com/honeyglass/utils.git#${HEAD}".resolution.type`,
      },
    ],
  },
  ...[
    ['a fork commit GitHub serves under the URL of honeyglass/utils', `#${FORK}`],
    ["a fork commit made on main's head", `#${AHEAD}`],
    ['a commit GitHub does not know', `#${UNKNOWN}`],
    ['a short sha', `#${HEAD.slice(0, 7)}`],
    ['a sha in capitals', `#${'A'.repeat(40)}`],
    ['a branch', '#main'],
    ['no commit', ''],
  ].map(([what = '', ref = '']) => ({
    what: `a dependency on honeyglass/utils at ${what}`,
    files: { 'package.json': manifestWith(`github:honeyglass/utils${ref}`) },
    hits: [{ field: 'dependencies.x', value: JSON.stringify(`github:honeyglass/utils${ref}`) }],
  })),
  ...[
    `github:someone/utils#${HEAD}`,
    `github:honeyglass/other#${HEAD}`,
    `honeyglass/utils#${HEAD}`,
    `git+https://github.com/honeyglass/utils.git#${HEAD}`,
    `https://codeload.github.com/honeyglass/utils/tar.gz/${HEAD}`,
  ].map(value => ({
    what: `the dependency value ${value}`,
    files: { 'package.json': manifestWith(value) },
    hits: [{ field: 'dependencies.x' }],
  })),
  {
    what: 'a lockfile that pins honeyglass/utils at a fork commit, at every field that names it',
    files: { 'pnpm-lock.yaml': pinnedLockfile(FORK) },
    hits: pinnedFields(FORK).map(field => ({ field })),
  },
  {
    what: 'a lockfile that pins another owner\'s "utils" at a commit of the same sha',
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD)
        .replaceAll('github:honeyglass/', 'github:someone/')
        .replaceAll('github.com/honeyglass/', 'github.com/someone/'),
    },
    // its version too, which only the key of honeyglass/utils may hold
    hits: pinnedFields(HEAD, `https://codeload.github.com/someone/utils/tar.gz/${HEAD}`)
      .toSpliced(
        4,
        0,
        `packages."@honeyglass/utils@https://codeload.github.com/someone/utils/tar.gz/${HEAD}".version`,
      )
      .map(field => ({ field })),
  },
  {
    what: "an importer whose version names another commit than its specifier's",
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        `version: ${CODELOAD}${HEAD}`,
        `version: ${CODELOAD}${BEHIND}`,
      ),
    },
    hits: [{ field: 'importers.".".dependencies.@honeyglass/utils.version' }],
  },
  {
    what: 'a package whose tarball names another commit than its key',
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        `tarball: ${CODELOAD}${HEAD}}`,
        `tarball: ${CODELOAD}${BEHIND}}`,
      ),
    },
    hits: [{ field: pinnedFields(HEAD)[3] }],
  },
  {
    what: 'the tarball of honeyglass/utils without gitHosted',
    files: { 'pnpm-lock.yaml': pinnedLockfile(HEAD).replace('gitHosted: true, ', '') },
    hits: [{ field: pinnedFields(HEAD)[3] }],
  },
  {
    what: 'gitHosted on a registry package',
    files: {
      'pnpm-lock.yaml': BLOG_LOCKFILE.replace(
        '{integrity: sha512-GGGG==}',
        '{gitHosted: true, integrity: sha512-GGGG==}',
      ),
    },
    hits: [{ field: 'packages."glob@10.5.0".resolution.gitHosted', value: 'true' }],
  },
  ...['6.6.6', 'evil-pkg@1.0.0'].map(version => ({
    what: `an importer that pins honeyglass/utils at version ${version}`,
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        `version: ${CODELOAD}${HEAD}`,
        `version: ${version}`,
      ),
    },
    hits: [
      { field: 'importers.".".dependencies.@honeyglass/utils.version', value: `"${version}"` },
    ],
  })),
  {
    what: 'the tarball of honeyglass/utils as the version of a registry specifier',
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        `specifier: github:honeyglass/utils#${HEAD}`,
        'specifier: ^1.0.0',
      ),
    },
    hits: [{ field: 'importers.".".dependencies.@honeyglass/utils.version' }],
  },
  ...[
    ['its integrity alone', '{integrity: sha512-IIII==}'],
    ['gitHosted without a tarball', '{gitHosted: true, integrity: sha512-IIII==}'],
  ].map(([what = '', resolution = '']) => ({
    what: `a package of the git-hosted key with ${what}`,
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        `{gitHosted: true, integrity: sha512-IIII==, tarball: ${CODELOAD}${HEAD}}`,
        resolution,
      ),
    },
    hits: [{ field: pinnedFields(HEAD)[3], value: 'missing' }],
  })),
  {
    what: 'a version on a registry package',
    files: {
      'pnpm-lock.yaml': BLOG_LOCKFILE.replace(
        '{integrity: sha512-GGGG==}\n',
        '{integrity: sha512-GGGG==}\n    version: 10.5.0\n',
      ),
    },
    hits: [{ field: 'packages."glob@10.5.0".version', value: '"10.5.0"' }],
  },
  {
    what: 'a version of the git-hosted package beside the version grammar',
    files: { 'pnpm-lock.yaml': pinnedLockfile(HEAD).replace('version: 0.0.0', 'version: latest') },
    hits: [{ field: `${pinnedFields(HEAD)[2]}.version`, value: '"latest"' }],
  },
  {
    what: 'a merge key in a lockfile beside a good resolution',
    files: {
      'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
        '    resolution: {gitHosted',
        '    <<: {resolution: {tarball: https://evil.example/x.tgz}}\n    resolution: {gitHosted',
      ),
    },
    hits: [{ field: '', value: '' }],
  },
  {
    what: 'an anchor and its alias in a lockfile',
    files: {
      'pnpm-lock.yaml': BLOG_LOCKFILE.replace(
        'resolution: {integrity: sha512-GGGG==}',
        'resolution: &r {integrity: sha512-GGGG==}',
      ).replace('resolution: {integrity: sha512-HHHH==}', 'resolution: *r'),
    },
    hits: [{ field: '', value: '' }],
  },
  {
    what: 'a merge key in a pnpm-workspace.yaml',
    files: { 'pnpm-workspace.yaml': `${SETTINGS}<<: {strictDepBuilds: false}\n` },
    hits: [{ field: '', value: '' }],
  },
  {
    what: 'an alias in a pnpm-workspace.yaml',
    files: {
      'pnpm-workspace.yaml': `catalog: &c\n  react: ^18.0.0\ncatalogs:\n  old: *c\n${SETTINGS}`,
    },
    hits: [{ field: '', value: '' }],
  },
  ...['dependencies', 'optionalDependencies'].map(kind => ({
    what: `an importer's link that leaves the repository among its ${kind}`,
    files: {
      'pnpm-lock.yaml': lockfileWith(
        entryOf('link:../../../eslint-config', 'link:../../../eslint-config'),
        kind,
      ),
    },
    hits: [
      { field: `importers.packages/a.${kind}.x.specifier` },
      { field: `importers.packages/a.${kind}.x.version` },
    ],
  })),
  {
    what: 'a packageManager dependency linked to a local pnpm',
    files: {
      'pnpm-lock.yaml': lockfileWith(
        entryOf('12.9.0', 'link:../pnpm'),
        'packageManagerDependencies',
      ),
    },
    hits: [
      {
        field: 'importers.packages/a.packageManagerDependencies.x.version',
        value: '"link:../pnpm"',
      },
    ],
  },
  {
    what: "an importer's dist-tag",
    files: { 'pnpm-lock.yaml': lockfileWith(entryOf('latest', '1.0.0')) },
    hits: [{ field: 'importers.packages/a.dependencies.x.specifier', value: '"latest"' }],
  },
  {
    what: "a local link in one of the lockfile's catalogs",
    files: {
      'pnpm-lock.yaml': `lockfileVersion: '9.0'\ncatalogs:\n  default:\n    x:\n      specifier: link:../x\n      version: link:../x\n`,
    },
    hits: [{ field: 'catalogs.default.x.specifier' }, { field: 'catalogs.default.x.version' }],
  },
  {
    what: 'a config dependency, which runs before every install',
    files: {
      'pnpm-lock.yaml': `lockfileVersion: '9.0'\nimporters:\n  .:\n    configDependencies:\n      a:\n        specifier: 1.0.0\n        version: 1.0.0\n`,
    },
    hits: [{ field: 'importers.".".configDependencies.a' }],
  },
  {
    what: 'an importer outside the repository',
    files: { 'pnpm-lock.yaml': `lockfileVersion: '9.0'\nimporters:\n  ../other: {}\n` },
    hits: [{ field: 'importers."../other"' }],
  },
  {
    what: 'a snapshot dependency that is a link',
    files: {
      'pnpm-lock.yaml': `lockfileVersion: '9.0'\nsnapshots:\n  a@1.0.0:\n    dependencies:\n      b: link:../b\n`,
    },
    hits: [{ field: 'snapshots."a@1.0.0".dependencies.b', value: '"link:../b"' }],
  },
  {
    what: 'a package key of a local source',
    files: {
      'pnpm-lock.yaml': `lockfileVersion: '9.0'\npackages:\n  a@file:../a:\n    resolution: {integrity: sha512-AAAA==}\n`,
    },
    hits: [{ field: 'packages."a@file:../a"', value: '"a@file:../a"' }],
  },
  {
    what: 'a lockfile of three documents',
    files: { 'pnpm-lock.yaml': `${BLOG_LOCKFILE}---\n${BLOG_LOCKFILE}---\n${BLOG_LOCKFILE}` },
    hits: [{ field: '' }],
  },
  ...[
    '.pnpmfile.cjs',
    '.pnpmfile.mjs',
    // APFS opens both as .pnpmfile.cjs, by Unicode's full case folding
    '.pnpmﬁle.cjs',
    '.pnpmfile.cjſ',
    'pnpm-lock.feature.yaml',
    'package.yaml',
    'package.json5',
  ].map(name => ({
    what: `the file ${name}`,
    files: { [`packages/a/${name}`]: 'module.exports = {};\n' },
    hits: [{ field: '', value: '' }],
  })),
  ...[
    { target: '../../../eslint-config', what: 'leads out of the repository' },
    { target: '/Users/me/eslint-config', what: 'is absolute' },
    {
      target: '../../up/../eslint-config',
      what: "climbs with a '..' after a name, through a symlink",
    },
    { target: '../../missing', what: 'lands on no tracked path' },
    { target: '../../up', what: 'is another symlink' },
  ].map(({ target, what }) => ({
    what: `a symlink whose target ${what}`,
    ...symlinked('libs/@honeyglass/eslint-config', target),
    hits: [{ field: '', value: JSON.stringify(target) }],
  })),
  ...[
    'node_modules/zod/index.js',
    'packages/a/node_modules/.bin/tsc',
    // APFS opens Node_Modules as node_modules, so Node loads from it, and its package.json is no manifest
    'Node_Modules/zod/package.json',
    'node_modules',
  ].map(path => ({
    what: `the tracked path ${path}, by its node_modules segment`,
    files: { [path]: 'module.exports = {};\n' },
    hits: [{ field: '', value: '', reason: IN_MODULES }],
  })),
  {
    what: 'a symlink in node_modules to a tracked folder, by its path ahead of its target',
    ...symlinked('node_modules/local', '../packages/a'),
    hits: [{ field: '', value: '', reason: IN_MODULES }],
  },
  // each lands on a tracked file, which passes a symlink of any other name
  ...['.pnpmfile.cjs', 'pnpm-workspace.yaml', 'package.json', 'pnpm-lock.yaml'].map(name => ({
    what: `a ${name} tracked as a symlink, whose target the check does not read`,
    ...symlinked(name, 'packages/a/index.ts'),
    hits: [{ field: '', value: '' }],
  })),
  {
    what: 'each key of a .npmrc, as the template holds none, its value never shown',
    files: {
      '.NPMRC': `# a fork's registry\nregistry=https://npm.example.com/\n//npm.example.com/:_authToken=${TOKEN}\n[section]\nignore-scripts = true\r\n`,
    },
    hits: [
      { field: 'registry', value: '' },
      { field: '"//npm.example.com/:_authToken"', value: '' },
      { field: 'line 4, not shown', value: '' },
      { field: 'ignore-scripts', value: '' },
    ],
  },
  {
    what: "a .npmrc line without '=' or with a key of other characters, by its number alone, as it may be a token",
    files: { '.npmrc': `registry=https://npm.example.com/\n\n${TOKEN}\ntwo words=x\n` },
    hits: [
      { field: 'registry', value: '' },
      { field: 'line 3, not shown', value: '' },
      { field: 'line 4, not shown', value: '' },
    ],
  },
  {
    what: 'a credential setting, whose value the hit masks',
    files: { 'pnpm-workspace.yaml': `${SETTINGS}npmrcAuthFile: ~/.secret-npmrc\n` },
    hits: [{ field: 'npmrcAuthFile', value: '***' }],
  },
  {
    what: "a credential key inside a setting's map, whose value the hit masks",
    files: {
      'package.json': JSON.stringify({
        pnpm: { registries: { default: 'x', _authToken: 'npm_x' } },
      }),
    },
    hits: [{ field: 'pnpm.registries', value: '{"default":"x","_authToken":"***"}' }],
  },
  {
    what: 'dependencies whose names hold auth or token, their values in sight, beside a pnpm token it masks',
    files: {
      'package.json': JSON.stringify({
        dependencies: {
          'next-auth': 'file:../next-auth',
          jsonwebtoken: 'latest',
          '@auth/core': 'github:a/b',
        },
        pnpm: { '//registry.npmjs.org/:_authToken': 'npm_x' },
      }),
    },
    hits: [
      { field: 'dependencies.next-auth', value: '"file:../next-auth"' },
      { field: 'dependencies.jsonwebtoken', value: '"latest"' },
      { field: 'dependencies.@auth/core', value: '"github:a/b"' },
      { field: 'pnpm."//registry.npmjs.org/:_authToken"', value: '***' },
    ],
  },
  {
    what: "a token key in a lockfile's settings, whose value the hit masks",
    files: { 'pnpm-lock.yaml': `lockfileVersion: '9.0'\nsettings:\n  npmToken: npm_x\n` },
    hits: [{ field: 'settings.npmToken', value: '***' }],
  },
  {
    what: "a URL's user info, which the hit masks",
    files: { 'package.json': manifestWith('https://me:pass@example.com/a-1.0.0.tgz') },
    hits: [{ field: 'dependencies.x', value: '"https://***@example.com/a-1.0.0.tgz"' }],
  },
];

describe('the supply check', () => {
  for (const row of passing) {
    test(`passes ${row.what}`, async () => {
      assert.deepEqual(await hitsOf(row), []);
    });
  }

  for (const row of refused) {
    test(`refuses ${row.what}, by file, field and value`, async () => {
      const [file = ''] = [...Object.keys(row.files), ...(row.deleted ?? [])];
      assertHits(
        await hitsOf(row),
        row.hits.map(hit => ({ file, ...hit })),
      );
    });
  }
});

describe('a hit as one line', () => {
  const files = [
    // A guard of existing behavior: shownPath's former JSON.stringify escaped a line break too.
    ['a line break', 'a\nb/package.json', '"a\\nb/package.json"'],
    ['a bidi override', 'a\u{202e}b/package.json', '"a\\u{202e}b/package.json"'],
  ];
  for (const [what, file, named] of files) {
    test(`names a file with ${what} quoted, the character escaped`, () => {
      const hit = { file, field: 'dependencies.x', value: '"latest"', reason: 'a dist-tag' };
      assert.equal(hitLine(hit), `${named} dependencies.x "latest" (a dist-tag)`);
    });
  }

  // yaml's message quotes the directive's line; CI prints the hit, and a CR in it would let GitHub's
  // runner read '::warning::forged' as a workflow command.
  const quoted = [
    ['a carriage return', '\r'],
    ['a line separator', '\u{2028}'],
    ['a bidi override', '\u{202e}'],
  ];
  for (const [what, char] of quoted) {
    test(`names a YAML error whose text holds ${what} by its code, line and column alone`, async () => {
      const lockfile = `%YAML 1.2${char}::warning::forged\n---\nlockfileVersion: '9.0'\n`;
      const hits = await hitsOf({ files: { 'pnpm-lock.yaml': lockfile } });
      assert.deepEqual(Array.isArray(hits) ? hits.map(hitLine) : hits, [
        'pnpm-lock.yaml (YAML with an error (BAD_DIRECTIVE at line 1, column 7))',
      ]);
    });
  }
});

// a manifest and a lockfile that pin main's head
const PINNED = {
  'package.json': manifestWith(`github:honeyglass/utils#${HEAD}`),
  'pnpm-lock.yaml': pinnedLockfile(HEAD),
};

// GitHub's answer of `status`, whatever is asked
const answering =
  (status: number, text: string, headers: Record<string, string> = {}): Fetch =>
  async () => ({ status, headers, text });

// a fetch that records each request and answers as `github` does
const recorded = () => {
  const asked: { url: string; headers: Record<string, string> }[] = [];
  const fetch: Fetch = async (url, init) => {
    asked.push({ url, headers: init.headers });
    return github(url, init);
  };
  return { asked, fetch };
};

// a fetch whose host cannot be reached
const unreachable: Fetch = async () => {
  throw new Error('getaddrinfo ENOTFOUND api.github.com');
};
// a fetch that never answers, and a wait that ends at once, so the deadline passes first
const hanging: Fetch = () => new Promise(() => {});
const instant = async () => {};

describe('the supply check asking GitHub whether a pinned commit lies on main', () => {
  test('asks once per commit, at the compare of main with it, without a token when it has none', async () => {
    const { asked, fetch } = recorded();
    assert.deepEqual(await hitsOf({ files: PINNED, fetch }), []);
    assert.deepEqual(
      asked.map(({ url }) => url),
      [`${COMPARE}${HEAD}`],
    );
    assert.equal(asked[0]?.headers.authorization, undefined);
  });

  test("sends CI's token as a bearer token", async () => {
    const { asked, fetch } = recorded();
    assert.deepEqual(await hitsOf({ files: PINNED, fetch, token: 'ghs_x' }), []);
    assert.equal(asked[0]?.headers.authorization, 'Bearer ghs_x');
  });

  test('asks GitHub nothing for dependency files without a pinned commit', async () => {
    const { asked, fetch } = recorded();
    assert.deepEqual(await hitsOf({ files: { 'pnpm-lock.yaml': BLOG_LOCKFILE }, fetch }), []);
    assert.deepEqual(asked, []);
  });

  test('refuses two pinned commits at once at every field that names one, asking GitHub nothing', async () => {
    const { asked, fetch } = recorded();
    const files = {
      'package.json': manifestWith(`github:honeyglass/utils#${HEAD}`),
      'pnpm-lock.yaml': pinnedLockfile(BEHIND),
    };
    assertHits(await hitsOf({ files, fetch }), [
      { file: 'package.json', field: 'dependencies.x' },
      ...pinnedFields(BEHIND).map(field => ({ file: 'pnpm-lock.yaml', field })),
    ]);
    assert.deepEqual(asked, []);
  });

  test("keeps the other hits beside GitHub's refusal", async () => {
    const files = { ...PINNED, 'packages/a/package.json': manifestWith('link:../../../x') };
    assertHits(await hitsOf({ files, fetch: unreachable }), [
      { file: 'packages/a/package.json', field: 'dependencies.x' },
    ]);
  });

  for (const { what, fetch, sleep, kind } of [
    { what: 'GitHub cannot be reached', fetch: unreachable, kind: 'ask' },
    {
      what: 'GitHub does not answer before the deadline',
      fetch: hanging,
      sleep: instant,
      kind: 'retry',
    },
    {
      what: 'GitHub refuses at its rate limit',
      fetch: answering(403, '{"message":"API rate limit exceeded"}', {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1794351600',
      }),
      kind: 'retry',
    },
    {
      what: 'GitHub asks to wait with a 403',
      fetch: answering(403, '{"message":"secondary rate limit"}', { 'retry-after': '60' }),
      kind: 'retry',
    },
    {
      what: 'GitHub asks to slow down',
      fetch: answering(429, '', { 'retry-after': '60' }),
      kind: 'retry',
    },
    { what: 'GitHub fails', fetch: answering(502, 'Bad Gateway'), kind: 'retry' },
    {
      what: 'GitHub refuses the token',
      fetch: answering(401, '{"message":"Bad credentials"}'),
      kind: 'ask',
    },
    { what: 'GitHub answers no JSON', fetch: answering(200, '<html>'), kind: 'ask' },
    { what: 'GitHub answers no status', fetch: answering(200, '{}'), kind: 'ask' },
    { what: 'the fetch answers nothing', fetch: async () => undefined, kind: 'ask' },
    {
      what: 'the fetch answers a status that is no number',
      fetch: async () => ({ status: '200', headers: {}, text: '{"status":"identical"}' }),
      kind: 'ask',
    },
  ]) {
    test(`refuses as ${kind}, so no commit passes unasked, naming the CI job, when ${what}`, async () => {
      const answer = await hitsOf({ files: PINNED, fetch, sleep });
      assert.ok(isRefusal(answer), `hits in place of a refusal: ${JSON.stringify(answer)}`);
      assert.equal(answer.kind, kind);
      assert.equal(answer.step, 'supply check');
      assert.match(answer.next, /the CI job/);
    });
  }
});

describe("the supply check without GitHub's API, as the commit tool and make-repo run it", () => {
  for (const [what, sha] of [
    ["main's head", HEAD],
    ["a fork's commit, which only CI refuses,", FORK],
  ] as const) {
    test(`passes a pin of ${what} on its form alone`, async () => {
      const files = {
        'package.json': manifestWith(`github:honeyglass/utils#${sha}`),
        'pnpm-lock.yaml': pinnedLockfile(sha),
      };
      assert.deepEqual(await localHitsOf(files), []);
    });
  }

  for (const { what, files, hits } of [
    {
      what: 'a short sha',
      files: { 'package.json': manifestWith(`github:honeyglass/utils#${HEAD.slice(0, 7)}`) },
      hits: [{ file: 'package.json', field: 'dependencies.x' }],
    },
    {
      what: "another owner's utils",
      files: { 'package.json': manifestWith(`github:someone/utils#${HEAD}`) },
      hits: [{ file: 'package.json', field: 'dependencies.x' }],
    },
    {
      what: 'a merge key beside a good resolution',
      files: {
        'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
          '    resolution: {gitHosted',
          '    <<: {resolution: {tarball: https://evil.example/x.tgz}}\n    resolution: {gitHosted',
        ),
      },
      hits: [{ file: 'pnpm-lock.yaml', field: '' }],
    },
    {
      what: 'two pinned commits',
      files: {
        'package.json': manifestWith(`github:honeyglass/utils#${HEAD}`),
        'pnpm-lock.yaml': pinnedLockfile(BEHIND),
      },
      hits: [
        { file: 'package.json', field: 'dependencies.x' },
        ...pinnedFields(BEHIND).map(field => ({ file: 'pnpm-lock.yaml', field })),
      ],
    },
    {
      what: "an importer whose version names another commit than its specifier's",
      files: {
        'pnpm-lock.yaml': pinnedLockfile(HEAD).replace(
          `version: ${CODELOAD}${HEAD}`,
          `version: ${CODELOAD}${BEHIND}`,
        ),
      },
      hits: [
        { file: 'pnpm-lock.yaml', field: 'importers.".".dependencies.@honeyglass/utils.version' },
      ],
    },
  ]) {
    test(`refuses ${what} on its form alone`, async () => {
      assertHits(await localHitsOf(files), hits);
    });
  }

  // The forms a CI call that lost its fetch takes. Each fails tsc, as only formOnly leaves the main
  // question out; run anyway, the check asks a fetch it lacks and refuses the fork's commit.
  const forked = {
    staged: [
      {
        path: 'package.json',
        mode: '100644',
        text: manifestWith(`github:honeyglass/utils#${FORK}`),
      },
    ],
    deleted: [],
    kindOf,
    repository: undefined,
  };
  const lost: Record<string, () => ReturnType<typeof supplyHits>> = {
    // @ts-expect-error neither GitHub's API nor formOnly
    "none of GitHub's API and no formOnly": () => supplyHits(forked),
    // @ts-expect-error the clock and the token without the fetch
    'its clock and token alone': () => supplyHits({ ...forked, sleep: idle, token: 'ghs_x' }),
    // @ts-expect-error the token alone
    'its token alone': () => supplyHits({ ...forked, token: 'ghs_x' }),
    'an undefined fetch': () =>
      // @ts-expect-error a fetch left undefined
      supplyHits({ ...forked, fetch: undefined, sleep: idle, token: 'ghs_x' }),
    // @ts-expect-error formOnly beside a fetch
    'a fetch beside formOnly': () => supplyHits({ ...forked, formOnly: true, fetch: unreachable }),
  };
  for (const [what, call] of Object.entries(lost)) {
    test(`refuses a pinned commit, unasked, for a call that lends ${what}`, async () => {
      const answer = await call();
      assert.ok(isRefusal(answer), `hits in place of a refusal: ${JSON.stringify(answer)}`);
      assert.equal(answer.kind, 'ask');
      assert.equal(answer.step, 'supply check');
    });
  }
});

describe('the files the supply check reads', () => {
  for (const { path, mode, isRead } of [
    { path: 'packages/a/package.json', mode: '100644', isRead: true },
    { path: 'pnpm-lock.yaml', mode: '100644', isRead: true },
    { path: 'Projects/bisku.io/pnpm-workspace.yaml', mode: '100644', isRead: true },
    { path: '.pnpmfile.cjs', mode: '100644', isRead: true },
    { path: 'Package.json', mode: '100644', isRead: true },
    { path: 'PNPM-WORKSPACE.YAML', mode: '100644', isRead: true },
    { path: 'Pnpm-Lock.yaml', mode: '100644', isRead: true },
    { path: 'README.md', mode: '100644', isRead: false },
    { path: 'package.json.bak', mode: '100644', isRead: false },
    { path: 'docs/guide', mode: '120000', isRead: true },
    { path: 'packages/a/.npmrc', mode: '100644', isRead: true },
    { path: '.NPMRC', mode: '100644', isRead: true },
    { path: '.pnpmﬁle.cjs', mode: '100644', isRead: true },
    { path: '.pnpmfile.cjſ', mode: '100644', isRead: true },
    { path: 'packages/a/package.jſon', mode: '100644', isRead: true },
    { path: 'node_modules/zod/index.js', mode: '100644', isRead: true },
    { path: 'packages/a/NODE_MODULES/x.js', mode: '100755', isRead: true },
    { path: 'node_modules.old/x.js', mode: '100644', isRead: false },
  ]) {
    test(`${isRead ? 'reads' : 'skips'} ${path} of mode ${mode}`, () => {
      assert.equal(isSupplyFile(path, mode), isRead);
    });
  }
});

describe('the files git reads attributes from', () => {
  for (const { path, isAttributes } of [
    { path: '.gitattributes', isAttributes: true },
    { path: 'packages/a/.GitAttributeſ', isAttributes: true },
    { path: '.gitattributes.bak', isAttributes: false },
    { path: 'docs/gitattributes', isAttributes: false },
  ]) {
    test(`${isAttributes ? 'counts' : 'skips'} ${path}`, () => {
      assert.equal(isAttributesFile(path), isAttributes);
    });
  }
});

// a listing as `git check-attr -z` prints it: each file, attribute and value ended by a NUL
const attributesOf = (rows: string[][]) =>
  rows
    .flat()
    .map(part => `${part}\0`)
    .join('');

describe('the attributes by which git converts a supply file in the worktree', () => {
  test('passes a file whose conversions are unspecified or unset', () => {
    const listing = attributesOf([
      ['package.json', 'filter', 'unspecified'],
      ['package.json', 'text', 'unset'],
    ]);
    assert.deepEqual(conversionHits(listing), []);
  });

  for (const [attribute = '', value = ''] of [
    ['working-tree-encoding', 'UTF-16LE'],
    ['filter', 'lfs'],
    ['ident', 'set'],
    ['eol', 'crlf'],
    ['text', 'auto'],
    ['crlf', 'set'],
  ]) {
    test(`refuses ${attribute} ${value}, which git is asked for, by file, attribute and value`, () => {
      const listing = attributesOf([
        ['a b/pnpm-lock.yaml', 'filter', 'unspecified'],
        ['a b/pnpm-lock.yaml', attribute, value],
      ]);
      assert.ok(CONVERSIONS.includes(attribute));
      assertHits(conversionHits(listing), [
        { file: 'a b/pnpm-lock.yaml', field: attribute, value: JSON.stringify(value) },
      ]);
    });
  }
});
