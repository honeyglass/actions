/**
 * The paths a supply file names: where a target lands, and a file's name as APFS opens it.
 *
 * landing: the path a target lands on from a folder, or undefined where it leaves the repository.
 * nameOf, folded: a file's name folded as APFS folds it.
 * folderOf: the folder a path lies in, '' for the top level.
 *
 * @example const path = landing(folderOf(file), target);
 */
/**
 * The path `target` lands on, read from the folder `base`, or undefined where it is absolute,
 * climbs above the top level, or climbs after a name; '' is the top level itself.
 *
 * A '..' after a name climbs from where that name lands, which a symlink may move outside the
 * repository, so only leading ones count.
 */
export declare const landing: (base: string, target: string) => string | undefined;
export declare const nameOf: (path: string) => string;
/**
 * A name as APFS matches it, which opens 'package.jſon' as package.json and '.pnpmﬁle.cjs' as
 * .pnpmfile.cjs, by Unicode's full case folding.
 *
 * NFKC turns ſ into s and ﬁ into fi, and upper case then lower turns ß into ss. The fold also
 * joins names APFS keeps apart, such as fullwidth letters, which only makes more files count.
 */
export declare const folded: (name: string) => string;
export declare const folderOf: (path: string) => string;
