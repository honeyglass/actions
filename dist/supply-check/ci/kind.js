export const LINK_MODE = '120000';
// A path an entry lies below is a folder, as git lists files and no folder of its own; 120000 a
// symlink and a blob's mode a file. A submodule, mode 160000, is none, as the repository tracks
// nothing in it.
export const kindIn = (entries, path) => {
    if (entries.some(entry => entry.path.startsWith(`${path}/`)))
        return 'folder';
    const mode = entries.find(entry => entry.path === path)?.mode;
    if (mode === LINK_MODE)
        return 'link';
    return mode === '100644' || mode === '100755' ? 'file' : undefined;
};
