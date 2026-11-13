/**
 * The argument forms of the supply check's program, and the refusal of any other list.
 *
 * usageRefusal: why the arguments name no check, with every form the program takes.
 *
 * @example if (isCheck === false && isLinks === false) return usageRefusal(args);
 */
import { quoted } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';
import { STEP } from './constants.ts';

const PROGRAM = 'node dist/supply-check/ci/index.js';
const USAGE = `'${PROGRAM} check <owner/name>' before the install, '${PROGRAM} links' after it, or 'supply-check staged <owner/name>|--no-repository [--tree <tree>] -- <path>...' on the paths a commit stages`;

export const usageRefusal = (args: readonly string[]): Refusal => ({
  kind: 'fix',
  step: STEP,
  reason: `the arguments [${args.map(quoted).join(',')}] name no check`,
  next: `run ${USAGE}`,
});
