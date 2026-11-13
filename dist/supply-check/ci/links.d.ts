import type { Refusal } from '@honeyglass/utils/ts';
import type { SupplyHit } from '../index.ts';
export declare const linkHits: (top: string) => Promise<SupplyHit[] | Refusal>;
