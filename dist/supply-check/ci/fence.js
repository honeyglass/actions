/**
 * A refusal as the program prints it, fenced off from GitHub's workflow commands.
 *
 * fenced: the refusal's text between stop-commands markers with a random token.
 *
 * @example process.stderr.write(fenced(hits));
 */
import { randomUUID } from 'node:crypto';
import { causeText, refusal } from '@honeyglass/utils/ts';
/**
 * A refusal's text between stop-commands markers with a random token, so GitHub's runner reads
 * no workflow command from it.
 *
 * Its cause holds git's message and stderr, which name a path raw, so the cause's control
 * characters are escaped too, and a path with a newline forges no line of its own.
 */
export const fenced = (r) => {
    const token = randomUUID();
    const cause = r.cause === undefined ? undefined : escaped(causeText(r.cause));
    return `::stop-commands::${token}\n${refusal({ ...r, cause })}\n::${token}::\n`;
};
// Each control character, the newline and C1's too, as a \u escape.
const escaped = (text) => text.replace(/[\u0000-\u001f\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
