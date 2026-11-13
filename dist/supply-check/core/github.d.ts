import type { Refusal } from '@honeyglass/utils/ts';
import type { FormOnly, GitHub, SupplyHit } from '../types.ts';
import type { Found } from './types.ts';
/** Thirty seconds for GitHub's answer, so an API that hangs refuses the check instead of holding it. */
export declare const FETCH_MS = 30000;
/**
 * The hits once GitHub placed the pinned commit on main or not: its fields drop when main holds it.
 *
 * One check passes one commit, so two are refused before GitHub is asked, and the requests stay
 * one per check. GitHub's refusal stands only where no other hit does, so those come first.
 * With formOnly the pin's fields drop unasked, as its form passed; a fetch beside it is asked.
 */
export declare const settledHits: (found: Found[], github: GitHub | FormOnly) => Promise<SupplyHit[] | Refusal>;
