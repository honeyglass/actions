/**
 * The internal types of the supply check's program.
 *
 * Indexed: a supply file with its bytes as the index or a tree holds them.
 * Listed: the paths git lists, from the index or a tree.
 * Request: what the staged command checks: the paths, where git reads them, and the repository.
 * Looked: the kinds the staged command asked git for, each once, and the failures they met.
 *
 * @example const files: Indexed[] = [];
 */
import type { Refusal } from '@honeyglass/utils/ts';
import type { Entry, PathKind } from '../index.ts';

export type Indexed = Entry & { bytes: Buffer };

// The paths git lists, every entry for none, from `tree`, or from the index when it is undefined.
export type Listed = { tree: string | undefined; paths: readonly string[] };

// The owner/name whose exceptions apply, undefined for none, beside the paths and the tree.
export type Request = Listed & { repository: string | undefined };

export type Looked = {
  top: string;
  tree: string | undefined;
  asked: Map<string, Promise<PathKind | undefined>>;
  failed: Refusal[];
};
