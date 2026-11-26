# supply-check

The supply check keeps local links and unsafe pnpm settings out of a repository. It is an
allow-list: a dependency value passes only as a registry version or range, an npm: alias,
`workspace:`, `catalog:`, a `link:` to a folder the repository tracks, or a full commit of
`github:honeyglass/utils` or `github:honeyglass/adx` that GitHub's API places on the main
branch of that repository, one commit per repository. In `pnpm-lock.yaml` a peer suffix names
such a commit's tarball only where the value itself is one, on the first level of an importer's
version or a snapshot key. A package's own peer range there passes only as registry ranges and
dist-tags, an npm: alias to a registry range or such a commit, the name of an importer's, a
snapshot's or a peer dependency only as an npm package name whose parts start with no dot, and
a package's integrity only as a sha512. A pnpm setting passes only as lean-code's template sets
it, widened by the exceptions the person approved for a repository, and every
`pnpm-workspace.yaml` holds each setting of the template, `ignorePnpmfile: true` among them. A
pnpmfile, a `.npmrc` key, a dependency file tracked as a symlink and a tracked path in a
`node_modules` folder never pass.

## As an action

Run it before the install, and with `mode: links` after it. Pin the action to a full commit sha:

```yaml
- uses: honeyglass/actions/supply-check@<40-character commit sha>
- run: pnpm install --frozen-lockfile
- uses: honeyglass/actions/supply-check@<40-character commit sha>
  with:
    mode: links
```

| Input        | Default                    | Meaning                                                                                                                     |
| :----------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `mode`       | `check`                    | `check` reads every tracked dependency file before the install; `links` refuses a symlink that leaves the checkout after it |
| `repository` | `${{ github.repository }}` | the owner/name whose approved exceptions apply                                                                              |

A hit prints one line and fails the step. The action sets up Node 24 and enables Corepack, and
both stay on for the steps after it, so the job's `pnpm install` runs the pnpm that `package.json`
pins. How the action installs and runs the check stands in [SECURITY.md](../SECURITY.md).

## As a package

```json
{
  "dependencies": {
    "@honeyglass/actions": "github:honeyglass/actions#<40-character commit sha>"
  }
}
```

`@honeyglass/actions/supply-check` exports the check's functions, listed in
[`index.ts`](index.ts).
The package's bin `supply-check` runs the check as a process, in the checkout to check:

```sh
node_modules/.bin/supply-check check <owner/name>
node_modules/.bin/supply-check links
node_modules/.bin/supply-check staged <owner/name> -- <path>...
node_modules/.bin/supply-check staged --no-repository --tree <tree> -- <path>...
```

`check` and `links` exit 0 when nothing is refused and 1 for a hit or a refusal. `check` reads
`GITHUB_TOKEN` from the environment when set, for GitHub's API.

`staged` is for a commit tool. Each path is one the commit stages, as git names it from the top
level, read as the index holds it or as the tree `--tree` names; a path neither lists counts as
deleted, and a folder stands for every file below it. A staged `.gitattributes` widens the check
to every tracked supply file, whose attributes git is asked about. The target of a `link:` or a
symlink is looked up in the index or the tree, never in the worktree. The check reads the form
alone, with no network and no token, and `--no-repository` applies no repository's exceptions.

It prints one JSON object per line on stdout:

| Exit | Lines                                                                                         |
| :--- | :-------------------------------------------------------------------------------------------- |
| 0    | none: nothing found                                                                           |
| 1    | one hit per line: `file`, `field`, `value`, `reason`                                          |
| 2    | one refusal: `kind`, `step`, `reason`, `next`, and `state` and `cause` (as text) where set    |

A throw inside the check is a refusal of kind `bug`.

> [!WARNING]
> Exit 1 without a line is no answer: Node failed before the program ran, such as on a missing
> module. A caller treats it as a refusal, never as a pass.

> [!WARNING]
> As a package the check exists only after the consumer's install, so it runs after that install
> and is no gate before it: whatever the install ran has run. The gate before the install is the
> action.
