# TODO

Open work on honeyglass/actions, the GitHub Actions of the honeyglass repositories.
<!-- last item number: 3 -->

## Next

- #1

## Supply check

- [ ] #1 Make the list of allowed git sources an input of the action, `git-sources`, empty when it is not given, so that others can use the action without honeyglass/utils and honeyglass/adx; lean-code reads the same list locally, and a pull request must not widen the list and use it in the same change; with the input, bind each repository to its package name (honeyglass/utils to @honeyglass/utils, honeyglass/adx to @honeyglass/adx), which the check does not do: until then a tarball of a listed repository passes under any package name, such as `rxjs: <utils tarball>` as a snapshot dependency; then lean-code's commit tool uses this package in place of its own copy, 'utils/supply.ts', which goes (lean-code TODO #461), so CI and the commit tool run one check; before the migration of oriko onto adx, not after (added 2026-11-26)
      'supply-check/action.yml', 'supply-check/core/grammar.ts'
- [ ] #2 Decide whether `resolution.integrity` also passes as sha1 once a real lockfile holds one: the check allows sha512 alone, and a very old registry version without `dist.integrity`, such as unified@2.1.3, may get `sha1-…`, which the check then refuses; lean-code's copy follows (added 2026-11-26)
      'supply-check/core/grammar.ts'
- [ ] #3 Decide how the pin of this action moves in the repositories that use it: honeyglass/actions has no tags, and Dependabot left the pin of the supply check alone in oriko's pull request #6 although main was ahead, so only the person moves it today, while each repository's SECURITY.md says "Dependabot moves the pins forward weekly"; either tag releases here so that Dependabot proposes them, or say in the template's SECURITY.md that this pin moves by hand; a pin names only a pushed commit with green CI (lean-code 'plannings/plans/no-copies/plan.md' D5); found by the review of the pin change in oriko and nix (2026-11-26) (added 2026-11-26)
      'supply-check/action.yml'
