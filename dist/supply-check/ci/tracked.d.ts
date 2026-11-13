import type { Refusal } from '@honeyglass/utils/ts';
import type { SupplyHit } from '../index.ts';
/**
 * The hits of every tracked dependency file and symlink, read as the index holds it.
 *
 * Every tracked file counts as staged, so the check sees the whole tree that a commit outside
 * lean-code may have changed, and a root pnpm-workspace.yaml the index lacks counts as deleted.
 */
export declare const trackedHits: (top: string, repository: string, token: string | undefined) => Promise<SupplyHit[] | Refusal>;
