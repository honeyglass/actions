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
export const landing = (base: string, target: string) => {
  const steps = target.split('/').filter(step => step !== '' && step !== '.');
  const named = steps.findIndex(step => step !== '..');
  const isClimbingAfterName = named >= 0 && steps.slice(named).includes('..');
  if (target.startsWith('/') || isClimbingAfterName) return undefined;
  const parts = base === '' ? [] : base.split('/');
  for (const step of steps) {
    if (step !== '..') parts.push(step);
    else if (parts.pop() === undefined) return undefined;
  }
  return parts.join('/');
};

export const nameOf = (path: string) => folded(path.slice(path.lastIndexOf('/') + 1));

/**
 * A name as APFS matches it, which opens 'package.jſon' as package.json and '.pnpmﬁle.cjs' as
 * .pnpmfile.cjs, by Unicode's full case folding.
 *
 * NFKC turns ſ into s and ﬁ into fi, and upper case then lower turns ß into ss. The fold also
 * joins names APFS keeps apart, such as fullwidth letters, which only makes more files count.
 */
export const folded = (name: string) => name.normalize('NFKC').toUpperCase().toLowerCase();

export const folderOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0));
