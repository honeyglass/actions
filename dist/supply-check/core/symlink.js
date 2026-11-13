/**
 * The check of a staged symlink, which can point a package outside the checkout.
 *
 * symlinkHits: a hit unless the symlink lands on a file or folder the repository tracks.
 *
 * Another symlink as the target never passes, as it could lead on outside.
 *
 * @example const hits = await symlinkHits(file, context);
 */
import { hitOf } from "./hits.js";
import { folderOf, landing } from "./paths.js";
// A symlink passes only to a file or folder the repository tracks, never to another symlink, which
// could lead on outside.
export const symlinkHits = async ({ path, text }, { kindOf }) => {
    const target = landing(folderOf(path), text);
    if (target === undefined)
        return [hitOf(path, [], text, 'a symlink that points outside the repository')];
    const kind = target === '' ? 'folder' : await kindOf(target);
    if (kind === 'file' || kind === 'folder')
        return [];
    const reason = kind === 'link' ? 'a symlink to another symlink' : 'a symlink to no path the repository tracks';
    return [hitOf(path, [], text, reason)];
};
