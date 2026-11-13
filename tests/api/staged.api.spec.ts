/**
 * The program's staged command through the package's bin: the paths a commit stages, checked on
 * their form alone, each answer one JSON line.
 *
 * Each case builds a git repository in a temp folder and runs the file the bin names with node, as
 * pnpm's shim runs it, and asserts what a commit tool reads back: the exit code and the lines.
 * Run with `pnpm test`, which runs the committed build in 'dist/'.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MANIFEST = z
  .object({ bin: z.object({ 'supply-check': z.string() }) })
  .parse(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')));
const BIN = join(ROOT, MANIFEST.bin['supply-check']);
const scratch = mkdtempSync(join(tmpdir(), 'staged.'));
after(() => rmSync(scratch, { recursive: true, force: true }));

// the template's settings, which a pnpm-workspace.yaml holds to pass
const WORKSPACE = `minimumReleaseAge: 4320
allowBuilds: {}
strictDepBuilds: true
blockExoticSubdeps: true
trustPolicy: no-downgrade
ignorePnpmfile: true
`;
const CLEAN = '{ "private": true }\n';
const OUTSIDE = '{ "dependencies": { "x": "link:../x" } }\n';
const CONVERTED =
  'an attribute by which git writes other bytes into the worktree, which pnpm reads, than the check read';
const OUTSIDE_HIT = {
  file: 'package.json',
  field: 'dependencies.x',
  value: '"link:../x"',
  reason: 'a link: that leaves the repository',
};

// git's stderr stays in the error, so a warning of a case's own setup stays out of the test output.
const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: 'pipe' });

// A git repository in a temp folder whose index holds each file, written and added.
const repo = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(scratch, 'repo.'));
  git(dir, 'init', '-q');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  git(dir, 'add', '-A');
  return dir;
};

// The bin's file run with node in `dir`: its exit code, each stdout line as JSON, and its stderr.
const staged = (dir: string, args: string[], env: Record<string, string> = {}) => {
  const { status, stdout, stderr } = spawnSync('node', [BIN, 'staged', ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  const lines = stdout
    .split('\n')
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line));
  return { status, lines, stderr };
};

// A whole refusal line, which fails the test unless it holds a reason and a next step; answered by
// the fields a caller decides by, and whether its cause came as text.
const refusalOf = (line: unknown) => {
  const { kind, step, cause } = z
    .strictObject({
      kind: z.enum(['fix', 'retry', 'ask', 'blocked', 'bug']),
      step: z.string(),
      reason: z.string().min(1),
      next: z.string().min(1),
      state: z.string().optional(),
      cause: z.string().optional(),
    })
    .parse(line);
  return { kind, step, cause: typeof cause };
};
// A value nested past the stack of JSON.stringify, as the red team's repro built it.
const DEEP = `${'['.repeat(20000)}${']'.repeat(20000)}`;
// A manifest one folder down whose link: leaves the repository.
const NESTED_OUTSIDE = '{ "dependencies": { "x": "link:../../../x" } }\n';

describe('the staged command', () => {
  test('answers exit 0 and no line for paths the check passes', () => {
    const dir = repo({ 'package.json': CLEAN, 'pnpm-workspace.yaml': WORKSPACE });
    const answer = staged(dir, ['--no-repository', '--', 'package.json', 'pnpm-workspace.yaml']);
    assert.deepEqual(answer, { status: 0, lines: [], stderr: '' });
  });

  test('answers exit 1 and a JSON line per hit, for the given paths alone', () => {
    const dir = repo({ 'package.json': OUTSIDE, 'packages/b/package.json': OUTSIDE });
    const answer = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(answer, { status: 1, lines: [OUTSIDE_HIT], stderr: '' });
  });

  test('refuses a given pnpm-workspace.yaml the index no longer holds as deleted', () => {
    const dir = repo({ 'package.json': CLEAN });
    const answer = staged(dir, ['--no-repository', '--', 'pnpm-workspace.yaml']);
    assert.deepEqual(answer.lines, [
      {
        file: 'pnpm-workspace.yaml',
        field: '',
        value: '',
        reason: 'a pnpm-workspace.yaml deleted or renamed away, so pnpm reads none of its settings',
      },
    ]);
    assert.equal(answer.status, 1);
  });

  test('asks git about every tracked supply file when a .gitattributes is staged', () => {
    const dir = repo({
      '.gitattributes': 'pnpm-lock.yaml eol=crlf\n',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
      'package.json': CLEAN,
    });
    const answer = staged(dir, ['--no-repository', '--', '.gitattributes']);
    assert.deepEqual(answer.lines, [
      { file: 'pnpm-lock.yaml', field: 'eol', value: '"crlf"', reason: CONVERTED },
    ]);
    assert.equal(answer.status, 1);
  });

  test('refuses an attribute by which git converts a given file', () => {
    const dir = repo({ '.gitattributes': 'package.json filter=x\n', 'package.json': CLEAN });
    const answer = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(answer.lines, [
      { file: 'package.json', field: 'filter', value: '"x"', reason: CONVERTED },
    ]);
    assert.equal(answer.status, 1);
  });

  test('reads the paths from a named tree in place of the index', () => {
    const dir = repo({ 'package.json': OUTSIDE });
    const tree = git(dir, 'write-tree').trim();
    writeFileSync(join(dir, 'package.json'), CLEAN);
    git(dir, 'add', '-A');
    const fromTree = staged(dir, ['--no-repository', '--tree', tree, '--', 'package.json']);
    assert.deepEqual(fromTree, { status: 1, lines: [OUTSIDE_HIT], stderr: '' });
    const fromIndex = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(fromIndex, { status: 0, lines: [], stderr: '' });
  });

  test("applies the named repository's exceptions, and none for --no-repository", () => {
    const widened = WORKSPACE.replace('allowBuilds: {}', 'allowBuilds: { esbuild: true }');
    const dir = repo({ 'pnpm-workspace.yaml': widened });
    const blog = staged(dir, ['honeyglass/blog', '--', 'pnpm-workspace.yaml']);
    assert.deepEqual(blog, { status: 0, lines: [], stderr: '' });
    const none = staged(dir, ['--no-repository', '--', 'pnpm-workspace.yaml']);
    assert.deepEqual(none.lines, [
      {
        file: 'pnpm-workspace.yaml',
        field: 'allowBuilds.esbuild',
        value: 'true',
        reason: 'a value the template does not allow',
      },
    ]);
    assert.equal(none.status, 1);
  });

  test('asks the index, not the worktree, what a link: lands on', () => {
    const dir = repo({
      'package.json': '{ "dependencies": { "a": "link:./packages/a", "b": "link:./loose" } }\n',
      'packages/a/index.js': '',
    });
    mkdirSync(join(dir, 'loose'));
    writeFileSync(join(dir, 'loose/index.js'), '');
    const answer = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(answer.lines, [
      {
        file: 'package.json',
        field: 'dependencies.b',
        value: '"link:./loose"',
        reason: 'a link: to no folder the repository tracks',
      },
    ]);
    assert.equal(answer.status, 1);
  });

  test('passes a pinned commit of honeyglass/utils on its form alone, asking GitHub nothing', () => {
    const fork = 'f'.repeat(40);
    const pinned = `{ "dependencies": { "@honeyglass/utils": "github:honeyglass/utils#${fork}" } }\n`;
    const dir = repo({ 'package.json': pinned });
    const answer = staged(dir, ['--no-repository', '--', 'package.json'], {
      GITHUB_TOKEN: 'ghs_x',
    });
    assert.deepEqual(answer, { status: 0, lines: [], stderr: '' });
  });

  test('answers exit 0 for no path at all', () => {
    const dir = repo({ 'package.json': OUTSIDE });
    assert.deepEqual(staged(dir, ['--no-repository', '--']), { status: 0, lines: [], stderr: '' });
  });

  for (const { what, manifest, hits } of [
    {
      what: 'as a dependency value, which fails the schema before any value is read',
      manifest: `{ "dependencies": { "evil": "link:../outside", "y": ${DEEP} } }\n`,
      hits: [
        {
          file: 'package.json',
          field: 'dependencies.y',
          value: 'nested too deep to show',
          reason: 'a value of a form the check does not know',
        },
      ],
    },
    {
      what: 'as a pnpm setting beside a link: hit',
      manifest: `{ "dependencies": { "evil": "link:../outside" }, "pnpm": ${DEEP} }\n`,
      hits: [
        { ...OUTSIDE_HIT, field: 'dependencies.evil', value: '"link:../outside"' },
        {
          file: 'package.json',
          field: 'pnpm',
          value: 'nested too deep to show',
          reason: 'a pnpm setting the template does not hold',
        },
      ],
    },
  ]) {
    test(`names its hits for a value nested past the stack ${what}`, () => {
      const dir = repo({ 'package.json': manifest });
      const answer = staged(dir, ['--no-repository', '--', 'package.json']);
      assert.deepEqual(answer, { status: 1, lines: hits, stderr: '' });
    });
  }

  test('reads every file below a given folder from a named tree, as from the index', () => {
    const dir = repo({ 'packages/a/package.json': NESTED_OUTSIDE });
    const tree = git(dir, 'write-tree').trim();
    const hit = {
      file: 'packages/a/package.json',
      field: 'dependencies.x',
      value: '"link:../../../x"',
      reason: 'a link: that leaves the repository',
    };
    const fromTree = staged(dir, ['--no-repository', '--tree', tree, '--', 'packages']);
    assert.deepEqual(fromTree, { status: 1, lines: [hit], stderr: '' });
    const fromIndex = staged(dir, ['--no-repository', '--', 'packages']);
    assert.deepEqual(fromIndex, fromTree);
  });

  test('asks a named tree, not the index, what a link: to a folder lands on', () => {
    const dir = repo({
      'package.json': '{ "dependencies": { "a": "link:./packages/a" } }\n',
      'packages/a/index.js': '',
    });
    const tree = git(dir, 'write-tree').trim();
    git(dir, 'rm', '-q', '-r', '--cached', 'packages');
    const fromTree = staged(dir, ['--no-repository', '--tree', tree, '--', 'package.json']);
    assert.deepEqual(fromTree, { status: 0, lines: [], stderr: '' });
    const fromIndex = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(fromIndex.lines, [
      {
        file: 'package.json',
        field: 'dependencies.a',
        value: '"link:./packages/a"',
        reason: 'a link: to no folder the repository tracks',
      },
    ]);
  });

  test("reads the attributes from a named tree's .gitattributes", () => {
    const dir = repo({ '.gitattributes': 'package.json filter=x\n', 'package.json': CLEAN });
    const tree = git(dir, 'write-tree').trim();
    git(dir, 'rm', '-q', '-f', '.gitattributes');
    const fromTree = staged(dir, ['--no-repository', '--tree', tree, '--', 'package.json']);
    assert.deepEqual(fromTree, {
      status: 1,
      lines: [{ file: 'package.json', field: 'filter', value: '"x"', reason: CONVERTED }],
      stderr: '',
    });
    const fromIndex = staged(dir, ['--no-repository', '--', 'package.json']);
    assert.deepEqual(fromIndex, { status: 0, lines: [], stderr: '' });
  });

  test('refuses a staged symlink that points outside the repository', () => {
    const dir = repo({ 'package.json': CLEAN });
    symlinkSync('../outside', join(dir, 'escape'));
    git(dir, 'add', 'escape');
    const answer = staged(dir, ['--no-repository', '--', 'escape']);
    assert.deepEqual(answer, {
      status: 1,
      lines: [
        {
          file: 'escape',
          field: '',
          value: '"../outside"',
          reason: 'a symlink that points outside the repository',
        },
      ],
      stderr: '',
    });
  });
});

describe('the staged command refusing as one JSON line with exit 2', () => {
  for (const { what, prepare } of [
    {
      what: 'an index git cannot list',
      prepare: (dir: string) => writeFileSync(join(dir, '.git/index'), 'no index\n'),
    },
    {
      what: 'a file whose blob git cannot read',
      prepare: (dir: string) => {
        const object = git(dir, 'hash-object', 'package.json').trim();
        unlinkSync(join(dir, '.git/objects', object.slice(0, 2), object.slice(2)));
      },
    },
  ]) {
    test(`refuses ${what} as ask, its cause as text`, () => {
      const dir = repo({ 'package.json': CLEAN });
      prepare(dir);
      const answer = staged(dir, ['--no-repository', '--', 'package.json']);
      assert.deepEqual(answer.lines.map(refusalOf), [
        { kind: 'ask', step: 'supply check', cause: 'string' },
      ]);
      assert.equal(answer.status, 2);
    });
  }

  test('refuses a folder outside any checkout as ask', () => {
    const outside = mkdtempSync(join(scratch, 'outside.'));
    const answer = staged(outside, ['--no-repository', '--', 'package.json'], {
      GIT_CEILING_DIRECTORIES: scratch,
    });
    assert.deepEqual(answer.lines.map(refusalOf), [
      { kind: 'ask', step: 'supply check', cause: 'string' },
    ]);
    assert.equal(answer.status, 2);
  });

  for (const args of [
    [],
    ['honeyglass/blog'],
    ['honeyglass/blog', 'package.json'],
    ['', '--', 'package.json'],
    ['--no-repo', '--', 'package.json'],
    ['honeyglass/blog', '--tree', '--', 'package.json'],
    ['honeyglass/blog', '--tree', '-x', '--', 'package.json'],
    ['honeyglass/blog', '--tree'],
  ]) {
    test(`refuses the arguments [${args.join(' ')}] as fix`, () => {
      const dir = repo({ 'package.json': OUTSIDE });
      const answer = staged(dir, args);
      assert.deepEqual(answer.lines.map(refusalOf), [
        { kind: 'fix', step: 'supply check', cause: 'undefined' },
      ]);
      assert.equal(answer.status, 2);
    });
  }
});

describe('the package bin', () => {
  test("names a file that starts with a node shebang, which pnpm's shim runs with node", () => {
    assert.equal(readFileSync(BIN, 'utf8').split('\n')[0], '#!/usr/bin/env node');
  });
});
