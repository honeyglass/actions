import type { Check } from './types.ts';
/**
 * A .npmrc: every key a hit, as the template holds none; blank lines and comments pass.
 *
 * pnpm reads registries and their tokens from it, so a key could send each install to another
 * registry. A hit never shows a value, which may be a token.
 */
export declare const npmrcHits: Check;
