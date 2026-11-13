#!/usr/bin/env bash
# @file tests/e2e/supplycheck.e2e.sh
# @brief The supply check's program, dist/supply-check/ci/index.js, run with Node in temp repositories.
# @description
# The action runs this program with `check <owner/name>` before a repository's install and with
# `links` after it, so each case builds a git repository in a temp folder and runs the committed
# build there. check passes a clean repository and in-repo sources, and refuses a link: outside, a
# refused setting, a symlink to a symlink or out of the repository, a root pnpm-workspace.yaml
# deleted or moved, a dependency file tracked as a symlink, a name APFS folds to a dependency
# file's, each key of a .npmrc without its value, a tracked path in a node_modules folder, and a
# worktree that a .gitattributes conversion, a removed file or a folder in its place makes differ
# from the index. action.yml's step runs the program for the exact modes check and links alone,
# and fails on any other before the program runs. The exceptions follow the
# repository argument alone, neither the origin nor GITHUB_REPOSITORY. links refuses every symlink
# that leaves the checkout or dangles, in any folder, and passes pnpm's links inside it. A failed
# git or folder read exits 1, as does an argument list that names no check, its refusal fenced by
# stop-commands with no inner line that GitHub's runner reads as a command, a forged path's too.
# Each case checks the exit code and the whole output, or a refusal's kind.
# Run with `pnpm run test:e2e` from the repository after `pnpm install`; it calls no model.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
entry="$root/dist/supply-check/ci/index.js"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/supplycheck.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
# a repository without approved exceptions, which most cases want
repository=someone/else
fails=0
leaves='a symlink that leaves the checkout'
drift='the worktree, which pnpm reads, holds other bytes here than the index, as a .gitattributes conversion or a local change writes them'
linked='a dependency file as a symlink, whose target the check does not read'
npmrc_key='a .npmrc key, shown without its value, which may be a token; the template holds no .npmrc, so a setting belongs in pnpm-workspace.yaml and the .npmrc goes'
# lean-code's template settings, as TEMPLATE in supply-check/core/template.ts holds them
workspace='minimumReleaseAge: 4320
allowBuilds: {}
strictDepBuilds: true
blockExoticSubdeps: true
trustPolicy: no-downgrade
ignorePnpmfile: true'
modules='a path in a node_modules folder, from which Node loads packages and which only the install may fill'
bad_mode='the input mode is check or links; any other value fails the step'
# the run script of action.yml's last step, which the runner hands to bash as it stands
step=$(cd "$root" && node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
process.stdout.write(parse(readFileSync('supply-check/action.yml', 'utf8')).runs.steps.at(-1).run);
")

# @description a git repository whose package.json and pnpm-workspace.yaml pass the check as they are.
# @arg $1 string the case's folder name
# @stdout the repository's path
repo() {
  local dir="$scratch/$1"
  mkdir -p "$dir"
  git -C "$dir" init -q
  printf '{ "private": true }\n' >"$dir/package.json"
  printf '%s\n' "$workspace" >"$dir/pnpm-workspace.yaml"
  printf '%s\n' "$dir"
}

# @description runs the program in a folder and compares its exit code and whole output.
# @arg $1 string what the case shows
# @arg $2 string the folder
# @arg $3 number the exit code the program must end with
# @arg $4 string the output it must print, stdout and stderr together
# @arg $5 string the program's arguments, such as check and a repository, or links
# @stdout one pass line
# @stderr one fail line with the output
expect() {
  local name=$1 dir=$2 code=$3 want=$4 out status=0
  shift 4
  out=$(cd "$dir" && node "$entry" "$@" 2>&1) || status=$?
  if [[ $status -eq $code && $out == "$want" ]]; then
    echo "pass: $name"
    return
  fi
  printf 'fail: %s: exit %s, want %s; output:\n%s\n' "$name" "$status" "$code" "$out" >&2
  fails=$((fails + 1))
}

# @description runs action.yml's last step in a folder as the runner does, and compares its exit
# code and whole output.
# @arg $1 string what the case shows
# @arg $2 string the folder
# @arg $3 number the exit code the step must end with
# @arg $4 string the output it must print, stdout and stderr together
# @arg $5 string the input mode
# @stdout one pass line
# @stderr one fail line with the output
expect_step() {
  local name=$1 dir=$2 code=$3 want=$4 mode=$5 out status=0
  out=$(cd "$dir" && MODE=$mode REPOSITORY=$repository TOKEN='' \
    GITHUB_ACTION_PATH="$root/supply-check" bash --noprofile --norc -eo pipefail -c "$step" 2>&1) ||
    status=$?
  if [[ $status -eq $code && $out == "$want" ]]; then
    echo "pass: $name"
    return
  fi
  printf 'fail: %s: exit %s, want %s; output:\n%s\n' "$name" "$status" "$code" "$out" >&2
  fails=$((fails + 1))
}

# @description runs the program in a folder and checks that it refuses with exit 1 and the kind,
# between `::stop-commands::<token>` and `::<token>::`, with no line between that starts with '::'.
# @arg $1 string what the case shows
# @arg $2 string the folder
# @arg $3 string the refusal's kind, such as ask or fix
# @arg $4 string the program's arguments, if any
# @stdout one pass line
# @stderr one fail line with the output
expect_refusal() {
  local name=$1 dir=$2 kind=$3 out status=0 first last inner
  shift 3
  out=$(cd "$dir" && node "$entry" "$@" 2>&1) || status=$?
  first=${out%%$'\n'*}
  last=${out##*$'\n'}
  inner=$(sed '1d;$d' <<<"$out")
  if [[ $status -eq 1 && $first == '::stop-commands::'?* && $last == "::${first#::stop-commands::}::" &&
    $inner == "Refused ($kind) at supply check: "* ]] && ! grep -q '^::' <<<"$inner"; then
    echo "pass: $name"
    return
  fi
  printf 'fail: %s: exit %s, want 1 and a %s refusal; output:\n%s\n' "$name" "$status" "$kind" "$out" >&2
  fails=$((fails + 1))
}

# @description tracks a dependency file as a symlink to a file of refused forms, and expects the
# check to refuse it by its name.
# @arg $1 string the dependency file's name
# @arg $2 string the target, a path in the repository
# @arg $3 string the target's text
# @stdout one pass line
# @stderr one fail line with the output
expect_linked() {
  local name=$1 target=$2 text=$3 dir
  dir=$(repo "linked$name")
  rm -f "$dir/$name"
  mkdir -p "$(dirname "$dir/$target")"
  printf '%s\n' "$text" >"$dir/$target"
  ln -s "$target" "$dir/$name"
  git -C "$dir" add -A
  expect "a $name tracked as a symlink is refused by its name, whatever its target holds" \
    "$dir" 1 "$name ($linked)" check "$repository"
}

# @description tracks a file whose name APFS folds to a dependency file's, as pnpm on a Mac then
# opens it, and expects the check's hit for that file.
# @arg $1 string the case's folder name
# @arg $2 string the file, a path in the repository
# @arg $3 string the file's text
# @arg $4 string the hit the check must print
# @stdout one pass line
# @stderr one fail line with the output
expect_folded() {
  local name=$1 path=$2 text=$3 want=$4 dir
  dir=$(repo "$name")
  mkdir -p "$(dirname "$dir/$path")"
  printf '%s\n' "$text" >"$dir/$path"
  git -C "$dir" add -A
  expect "a $path, which APFS opens as a dependency file, is checked as one" "$dir" 1 "$want" \
    check "$repository"
}

dir=$(repo clean)
git -C "$dir" add -A
expect 'a clean repository passes' "$dir" 0 '' check "$repository"

dir=$(repo inner)
mkdir -p "$dir/packages/local"
printf '{ "name": "local" }\n' >"$dir/packages/local/package.json"
printf '{ "private": true, "dependencies": { "local": "link:./packages/local" } }\n' >"$dir/package.json"
ln -s packages/local/package.json "$dir/local.json"
git -C "$dir" add -A
expect 'a link: to a tracked folder and a symlink to a tracked file pass' "$dir" 0 '' \
  check "$repository"

dir=$(repo link)
printf '{ "private": true, "dependencies": { "x": "link:../x" } }\n' >"$dir/package.json"
git -C "$dir" add -A
expect 'a link: outside the repository is refused' "$dir" 1 \
  'package.json dependencies.x "link:../x" (a link: that leaves the repository)' check "$repository"

dir=$(repo setting)
printf 'dangerouslyAllowAllBuilds: true\n' >>"$dir/pnpm-workspace.yaml"
git -C "$dir" add -A
expect 'a refused pnpm setting is refused' "$dir" 1 \
  'pnpm-workspace.yaml dangerouslyAllowAllBuilds true (a pnpm setting the template does not hold)' \
  check "$repository"

dir=$(repo chain)
ln -s package.json "$dir/first"
ln -s first "$dir/second"
git -C "$dir" add -A
expect 'a tracked symlink to another symlink is refused' "$dir" 1 \
  'second "first" (a symlink to another symlink)' check "$repository"

dir=$(repo outlink)
ln -s ../outside "$dir/escape"
git -C "$dir" add -A
expect 'a tracked symlink out of the repository is refused' "$dir" 1 \
  'escape "../outside" (a symlink that points outside the repository)' check "$repository"

dir=$(repo deleted)
rm "$dir/pnpm-workspace.yaml"
git -C "$dir" add -A
expect 'a repository without a root pnpm-workspace.yaml is refused' "$dir" 1 \
  'pnpm-workspace.yaml (a pnpm-workspace.yaml deleted or renamed away, so pnpm reads none of its settings)' \
  check "$repository"

dir=$(repo moved)
mkdir "$dir/sub"
mv "$dir/pnpm-workspace.yaml" "$dir/sub/"
git -C "$dir" add -A
expect 'a root pnpm-workspace.yaml moved to a subfolder is refused' "$dir" 1 \
  'pnpm-workspace.yaml (a pnpm-workspace.yaml deleted or renamed away, so pnpm reads none of its settings)' \
  check "$repository"

# git keeps LF in the index and the CRLF the attribute asks for in the worktree, which pnpm reads
dir=$(repo converted)
printf 'pnpm-workspace.yaml text eol=crlf\n' >"$dir/.gitattributes"
printf '%s\n' "$workspace" | awk '{ printf "%s\r\n", $0 }' >"$dir/pnpm-workspace.yaml"
git -C "$dir" add -A
expect 'a supply file a .gitattributes conversion changes in the worktree is refused' "$dir" 1 \
  "pnpm-workspace.yaml ($drift)" check "$repository"

dir=$(repo removed)
git -C "$dir" add -A
rm "$dir/package.json"
expect 'a tracked package.json missing from the worktree is refused' "$dir" 1 \
  "package.json ($drift)" check "$repository"

dir=$(repo replaced)
git -C "$dir" add -A
rm "$dir/package.json"
mkdir "$dir/package.json"
expect 'a tracked package.json the worktree holds as a folder is refused' "$dir" 1 \
  "package.json ($drift)" check "$repository"

# the link leads to the same bytes, so only the file's type tells it apart
dir=$(repo relinked)
git -C "$dir" add -A
mv "$dir/package.json" "$dir/copy.json"
ln -s copy.json "$dir/package.json"
expect 'a tracked package.json the worktree holds as a symlink is refused' "$dir" 1 \
  "package.json ($drift)" check "$repository"

dir=$(repo control)
mkdir "$dir/a
b"
printf '{ "private": true, "dependencies": { "x": "link:../../x" } }\n' >"$dir/a
b/package.json"
git -C "$dir" add -A
expect 'a path with a control character stays on one quoted line' "$dir" 1 \
  '"a\nb/package.json" dependencies.x "link:../../x" (a link: that leaves the repository)' \
  check "$repository"

expect_linked .pnpmfile.cjs tools/hook.js 'module.exports = { hooks: {} };'
expect_linked pnpm-workspace.yaml conf.yaml "$workspace
dangerouslyAllowAllBuilds: true"
expect_linked package.json manifest.json \
  '{ "private": true, "dependencies": { "x": "link:../../x" } }'
expect_linked pnpm-lock.yaml lock.yaml "lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      x:
        specifier: link:../../x
        version: link:../../x"

pnpmfile='a pnpmfile, whose code runs at every install'
expect_folded ligature .pnpmﬁle.cjs 'module.exports = {};' "\".pnpmﬁle.cjs\" ($pnpmfile)"
expect_folded long-s .pnpmfile.cjſ 'module.exports = {};' "\".pnpmfile.cjſ\" ($pnpmfile)"
# in a folder of its own, as APFS would open the package.json beside it as the same file
expect_folded manifest packages/a/package.jſon \
  '{ "dependencies": { "x": "link:../../../x" } }' \
  '"packages/a/package.jſon" dependencies.x "link:../../../x" (a link: that leaves the repository)'

# a token's shape, built at run time, so no secret scanner meets one in this file
token="npm_$(printf '%036d' 7)"
dir=$(repo npmrc)
printf '# a fork of the registry\nregistry=https://npm.example.com/\n//npm.example.com/:_authToken=%s\n' \
  "$token" >"$dir/.npmrc"
git -C "$dir" add -A
expect 'each key of a .npmrc is refused by its name, its value never shown' "$dir" 1 \
  ".npmrc registry ($npmrc_key)
.npmrc \"//npm.example.com/:_authToken\" ($npmrc_key)" check "$repository"

dir=$(repo comments)
printf '# registry=https://npm.example.com/\n\n; an old line\n' >"$dir/.npmrc"
git -C "$dir" add -A
expect 'a .npmrc of comments alone passes' "$dir" 0 '' check "$repository"

# a package committed into node_modules, which Node would load in place of the one installed
dir=$(repo tracked)
mkdir -p "$dir/node_modules/zod" "$dir/packages/a/Node_Modules"
printf 'module.exports = {};\n' >"$dir/node_modules/zod/index.js"
ln -s ../../../packages "$dir/packages/a/Node_Modules/local"
git -C "$dir" add -A
expect 'a tracked path in a node_modules folder is refused before the install' "$dir" 1 \
  "node_modules/zod/index.js ($modules)
packages/a/Node_Modules/local ($modules)" check "$repository"

dir=$(repo step)
git -C "$dir" add -A
expect_step 'the action runs check for the mode check' "$dir" 0 '' check
expect_step 'the action runs links for the mode links' "$dir" 0 '' links
for mode in Check LINKS 'check ' '' 'links --help'; do
  expect_step "the action refuses the mode '$mode' before it runs the program" "$dir" 1 \
    "$bad_mode" "$mode"
done

# honeyglass/blog's exceptions in supply-check/core/template.ts approve the build of esbuild; the
# origin and GITHUB_REPOSITORY name blog too, and neither may stand in for the argument
dir=$(repo exception)
printf '%s\n' "$workspace" | sed 's/^allowBuilds: {}$/allowBuilds: { esbuild: true }/' \
  >"$dir/pnpm-workspace.yaml"
git -C "$dir" add -A
git -C "$dir" remote add origin git@github.com:honeyglass/blog.git
expect "the repository argument's exceptions apply" "$dir" 0 '' check honeyglass/blog
export GITHUB_REPOSITORY=honeyglass/blog
expect 'the exceptions follow the argument alone, neither the origin nor GITHUB_REPOSITORY' "$dir" 1 \
  'pnpm-workspace.yaml allowBuilds.esbuild true (a value the template does not allow)' \
  check "$repository"
unset GITHUB_REPOSITORY

dir=$(repo argument)
git -C "$dir" add -A
expect_refusal 'an unknown argument is refused' "$dir" fix bogus
expect_refusal 'check without a repository is refused' "$dir" fix check
expect_refusal 'check with an empty repository is refused' "$dir" fix check ''

mkdir "$scratch/outside"
export GIT_CEILING_DIRECTORIES=$scratch
expect_refusal 'a folder outside any checkout is refused' "$scratch/outside" ask check "$repository"
unset GIT_CEILING_DIRECTORIES

# git names the path in its message and stderr, which the refusal's cause carries; the blob gone
# from the object store makes `git cat-file` fail on it
dir=$(repo forged)
forged=$'x\n::error::forged line'
mkdir "$dir/$forged"
printf '{ "name": "forged" }\n' >"$dir/$forged/package.json"
git -C "$dir" add -A
object=$(git -C "$dir" hash-object "$dir/$forged/package.json")
blob="$dir/.git/objects/${object:0:2}/${object:2}"
# git writes its objects read-only, which a plain rm asks about when stdin is a terminal
rm -f "$blob"
if [[ -e $blob ]]; then
  echo "fail: setup of the forged case: the blob $blob is still there" >&2
  fails=$((fails + 1))
else
  expect_refusal 'a refusal keeps a forged workflow command out of the runner' "$dir" ask \
    check "$repository"
fi

dir=$(repo corrupt)
git -C "$dir" add -A
printf 'no index\n' >"$dir/.git/index"
expect_refusal 'an index git cannot list is refused' "$dir" ask check "$repository"

dir=$(repo unreadable)
mkdir "$dir/locked"
chmod 000 "$dir/locked"
expect_refusal 'links refuses a checkout it cannot walk' "$dir" ask links
chmod 755 "$dir/locked"

dir=$(repo escape)
mkdir -p "$dir/node_modules"
ln -s "$scratch" "$dir/node_modules/escape"
expect 'links refuses a node_modules symlink that leaves the checkout' "$dir" 1 \
  "node_modules/escape \"$scratch\" ($leaves)" links

dir=$(repo dangling)
mkdir -p "$dir/node_modules"
ln -s ../missing "$dir/node_modules/gone"
expect 'links refuses a dangling node_modules symlink' "$dir" 1 \
  'node_modules/gone "../missing" (a symlink that dangles)' links

dir=$(repo modules)
ln -s "$scratch" "$dir/node_modules"
expect 'links refuses a node_modules that is itself a link out of the checkout' "$dir" 1 \
  "node_modules \"$scratch\" ($leaves)" links

# APFS finds Node_Modules as node_modules, so Node resolves packages through it
dir=$(repo casefold)
mkdir -p "$dir/Node_Modules"
ln -s "$scratch" "$dir/Node_Modules/escape"
expect 'links refuses a symlink out of the checkout in any folder' "$dir" 1 \
  "Node_Modules/escape \"$scratch\" ($leaves)" links

# pnpm's layout: a package's own folder in the virtual store, linked from node_modules, and its
# dependency linked beside it
dir=$(repo inside)
store="$dir/node_modules/.pnpm"
mkdir -p "$store/pkg@1.0.0/node_modules/pkg" "$store/dep@1.0.0/node_modules/dep"
ln -s .pnpm/pkg@1.0.0/node_modules/pkg "$dir/node_modules/pkg"
ln -s ../../dep@1.0.0/node_modules/dep "$store/pkg@1.0.0/node_modules/dep"
expect 'links passes pnpm-style links inside the checkout' "$dir" 0 '' links

exit $((fails > 0))
