export const LINK_MODE = '120000';
/**
 * What each path holds: a folder where an entry lies below it, as git lists files and no
 * folder of its own; 120000 a symlink and a blob's mode a file. A submodule, mode 160000, is
 * none, as the repository tracks nothing in it.
 *
 * The entries are sorted once, and a path's first entry from `${path}/` on is found by binary
 * search, so many paths asked of a large tree cost one sort and a log each; each caller lists
 * the index or the tree once per run and asks every path of it.
 */
export const kindsIn = (entries) => {
    const modes = new Map();
    // an unmerged index lists a path once per stage; the first entry answers, as git lists it
    for (const { path, mode } of entries)
        if (modes.has(path) === false)
            modes.set(path, mode);
    const sorted = entries.map(({ path }) => path).toSorted();
    return (path) => {
        const below = `${path}/`;
        if (sorted[firstFrom(sorted, below)]?.startsWith(below) === true)
            return 'folder';
        const mode = modes.get(path);
        if (mode === LINK_MODE)
            return 'link';
        return mode === '100644' || mode === '100755' ? 'file' : undefined;
    };
};
// The index of the first path in `sorted` that is not below `text` in UTF-16 order.
const firstFrom = (sorted, text) => {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if ((sorted[middle] ?? '') < text)
            low = middle + 1;
        else
            high = middle;
    }
    return low;
};
