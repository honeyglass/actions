# @honeyglass/actions

GitHub Actions of the honeyglass repositories. Each action is also a package, so a tool can run
the same code outside CI.

## supply-check

Keeps local links and unsafe pnpm settings out of a repository: before its install it allows a
dependency only from an allow-list, after the install it refuses a symlink that leaves the
checkout. How to run it as an action or a package: [supply-check/README.md](supply-check/README.md).

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build       # writes dist/, which is committed
pnpm run typecheck
pnpm test            # dist/ must match a fresh build, then the api tests
pnpm run test:e2e    # the program in temporary git repositories
```

`dist/` is committed, as Node does not strip types from a file in `node_modules`.

## License

MIT, see [LICENSE](LICENSE).
