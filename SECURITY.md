# Security

Six documented supply chain attacks on GitHub Actions between 2024 and 2026 follow one
pattern. Something the workflow depends on is replaced, and the workflow hands it a
token. These are the rules this repository follows. A rule that acts at one line of a
workflow, of `supply-check/action.yml`, of `pnpm-workspace.yaml` or of
`.github/dependabot.yml` also stands there as a comment.

- **Every dependency is pinned.** `package.json` names each package at an exact version,
  and a package from GitHub at a full 40-character commit sha. No range, no tag and no
  branch reaches an install.
- **Every third party action is pinned to a full commit id, never to a tag.** That holds
  for the workflows and for the steps `supply-check/action.yml` runs. A tag can be moved
  to another commit by anyone who gains write access to the action's repository, and
  every workflow that names that tag then runs their code on its next run. That is how
  `tj-actions/changed-files` was compromised in March 2025. A commit id addresses the
  content and cannot be moved. A caller pins this repository's actions the same way, and
  so does this repository's own CI, which runs the supply check of a pushed commit.
- **`permissions: contents: read` stands at the top of every workflow.** A token that
  cannot write cannot push, tag or publish a release.
- **`pull_request`, never `pull_request_target`.** The second one runs in the context
  of the target repository, with a writable token and the secrets in reach, while it
  checks out the fork's code. That is the pattern known as Pwn Request.
- **`actions/checkout` runs with `persist-credentials: false`.** Otherwise the job's
  token stays in `.git/config`, and every later step, including anything a dependency
  runs, can read it and use it.
- **No secrets.** No job gets a secret. The supply check gets the job's read-only token
  alone, and only in `check` mode, to ask GitHub's API about a pinned commit.
- **Dependabot moves the pins forward weekly.** A pin nobody updates rots, and a rotten
  pin is an action that no longer gets its fixes.
- **The package manager is pinned by hash.** `packageManager` in `package.json` names
  pnpm with the sha512 of its tarball, and Corepack, which ships with Node, refuses a
  download whose hash differs. No action installs pnpm: the one that would reads the
  version and drops the hash.
- **Dependencies install frozen and three days late.** `pnpm install --frozen-lockfile`
  refuses when the lockfile and `package.json` disagree, and every package in the
  lockfile carries its integrity hash. `minimumReleaseAge` in `pnpm-workspace.yaml`
  keeps pnpm from resolving a version younger than three days, and Dependabot waits
  the same three days before it opens a pull request, because a compromised release
  is usually found and pulled within hours. `blockExoticSubdeps` lets only a
  dependency named in `package.json` come from a git repository or a tarball URL, and
  `trustPolicy: no-downgrade` fails the install when a version carries weaker proof of
  its origin than the versions before it, which is what a stolen npm token looks like.
  The three days hold only for versions from the npm registry: a `github:` dependency
  and an action are held by their commit id alone.
- **No dependency runs an install script, and no pnpmfile loads.** pnpm blocks the
  lifecycle scripts of dependencies, the allow list `allowBuilds` in
  `pnpm-workspace.yaml` stays empty, and `strictDepBuilds` turns a script that would
  have been skipped into an install that fails. `ignorePnpmfile: true` keeps pnpm from
  loading a `.pnpmfile.cjs`, whose code would run at every install, and the supply check
  refuses a `pnpm-workspace.yaml` without it. The supply-check action installs with
  `--ignore-scripts` and `--ignore-pnpmfile` as well.
- **The supply-check action installs in its own folder.** It installs its own
  dependencies, without the dev ones, from this repository's lockfile before it reads
  the caller's files, so no file of the caller decides what it installs or runs. Its
  Node comes without a cache, so no store another run saved reaches that install.
- **No bundle.** The committed `dist/` is this repository's own TypeScript, compiled by
  `tsc` file by file; `pnpm test` fails when it differs from a fresh build. Every
  dependency comes from its own package, pinned as above.
