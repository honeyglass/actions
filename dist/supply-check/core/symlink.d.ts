import type { Context } from './types.ts';
import type { Staged } from '../types.ts';
export declare const symlinkHits: ({ path, text }: Staged, { kindOf }: Context) => Promise<import("../types.ts").SupplyHit[]>;
