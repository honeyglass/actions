/**
 * The public names of the supply check, at the package's subpath './supply-check'.
 *
 * supplyHits: the forms the staged dependency files and symlinks hold that the check refuses.
 * isSupplyFile, isAttributesFile: whether the check reads a file, and whether git reads attributes from it.
 * CONVERSIONS, conversionHits: the attributes that convert a file in the worktree, and their hits.
 * entriesOf, hitLine, shownPath: git's listing as entries, a hit as one line, a path as shown.
 * TEMPLATE, FETCH_MS: the template of pnpm settings, and how long GitHub's answer may take.
 * Entry, Staged, PathKind: a path of the index or a tree, a staged file, and what a path holds.
 * SupplyHit: a form the check refuses.
 * Fetch: the caller's port to GitHub's API.
 * Supply, GitHub, FormOnly: the input of supplyHits, with GitHub's API or without it.
 *
 * @example import { supplyHits } from '@honeyglass/actions/supply-check'
 */
export type { Entry, Fetch, FormOnly, GitHub, PathKind, Staged, Supply, SupplyHit, } from './types.ts';
export { CONVERSIONS, conversionHits, entriesOf, FETCH_MS, hitLine, isAttributesFile, isSupplyFile, shownPath, supplyHits, TEMPLATE, } from './api.ts';
