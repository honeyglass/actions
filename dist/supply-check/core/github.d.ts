import type { Refusal } from '@honeyglass/utils/ts';
import type { FormOnly, GitHub, SupplyHit } from '../types.ts';
import type { Found } from './types.ts';
/** Thirty seconds for GitHub's answer, so an API that hangs refuses the check instead of holding it. */
export declare const FETCH_MS = 30000;
/**
 * The hits once GitHub placed each pinned commit on main or not: a field drops when main holds
 * every commit it names.
 *
 * A check passes one commit per repository, so a repository pinned at two is refused before
 * GitHub is asked about it, and the requests stay one per repository. GitHub's refusal stands
 * only where no other hit does, so those come first. With formOnly the pins' fields drop
 * unasked, as their form passed; a fetch beside it is asked.
 */
export declare const settledHits: (found: Found[], github: GitHub | FormOnly) => Promise<SupplyHit[] | Refusal>;
