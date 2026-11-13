import type { Refusal } from '@honeyglass/utils/ts';
/**
 * A refusal's text between stop-commands markers with a random token, so GitHub's runner reads
 * no workflow command from it.
 *
 * Its cause holds git's message and stderr, which name a path raw, so the cause's control
 * characters are escaped too, and a path with a newline forges no line of its own.
 */
export declare const fenced: (r: Refusal) => string;
