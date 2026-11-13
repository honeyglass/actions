/**
 * Runs the staged command and answers its exit code: 2 for a refusal, 1 for a hit, else 0.
 *
 * Every throw becomes a refusal of kind bug, as a caller reads exit 1 as hits, and a crash that
 * printed none would read as a check that found nothing it could name.
 *
 * @param args - the arguments after 'staged'
 * @returns the exit code
 */
export declare const stagedMain: (args: readonly string[]) => Promise<0 | 1 | 2>;
