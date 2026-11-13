/**
 * The check of a .npmrc, which lean-code's template holds none of.
 *
 * npmrcHits: the hits of a .npmrc's lines.
 *
 * @example const hits = npmrcHits(file, context);
 */
import { fieldOf } from './hits.ts';
import { NPMRC_KEY } from './reasons.ts';
import type { Check } from './types.ts';

/**
 * A .npmrc: every key a hit, as the template holds none; blank lines and comments pass.
 *
 * pnpm reads registries and their tokens from it, so a key could send each install to another
 * registry. A hit never shows a value, which may be a token.
 */
export const npmrcHits: Check = ({ path, text }) =>
  text
    .split(/\r\n|\r|\n/)
    .flatMap((line, i) =>
      NPMRC_PASSING.test(line)
        ? []
        : [{ file: path, field: npmrcField(line, i + 1), value: '', reason: NPMRC_KEY }],
    );

// A line's key before its '=', when it is of a key's characters; any other line, such as a token
// pasted on its own, by its number alone, as CI's log is readable.
const npmrcField = (line: string, number: number) => {
  const at = line.indexOf('=');
  const key = line.slice(0, Math.max(at, 0)).trim();
  return at >= 0 && NPMRC_KEY_NAME.test(key) ? fieldOf([key]) : `line ${number}, not shown`;
};

// A .npmrc line pnpm skips: blank, or a comment after '#' or ';'.
const NPMRC_PASSING = /^\s*(?:[#;]|$)/;
// A .npmrc key a hit may show, such as '//registry.npmjs.org/:_authToken'.
const NPMRC_KEY_NAME = /^[\w@:/.-]+$/;
