import path from 'path';

/** Checks whether a path is inside base directory path (including subdirectories). */
export function isPathUnderDirectory(baseDirpath: string, dirpath: string): boolean {
    return !path.relative(baseDirpath, dirpath).startsWith('..');
}