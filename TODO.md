# TODO

Open work on honeyglass/actions, the GitHub Actions of the honeyglass repositories.
<!-- last item number: 2 -->

## Next

## Supply check

- [ ] #1 Make the list of allowed git sources an input of the action, `git-sources`, empty when it is not given, so that others can use the action without honeyglass/utils and honeyglass/adx; lean-code reads the same list locally, and a pull request must not widen the list and use it in the same change; with the input, bind each repository to its package name (honeyglass/utils to @honeyglass/utils, honeyglass/adx to @honeyglass/adx), which the check does not do: until then a tarball of a listed repository passes under any package name, such as `rxjs: <utils tarball>` as a snapshot dependency; after the migration of oriko onto adx, not before (added 2026-11-26)
      'supply-check/action.yml', 'supply-check/core/grammar.ts'
- [ ] #2 Decide whether `resolution.integrity` also passes as sha1 once a real lockfile holds one: the check allows sha512 alone, and a very old registry version without `dist.integrity`, such as unified@2.1.3, may get `sha1-…`, which the check then refuses; lean-code's copy follows (added 2026-11-26)
      'supply-check/core/grammar.ts'
