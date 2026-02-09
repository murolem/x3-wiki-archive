import fs from 'fs';
import path from 'path';

export function ensureDirpath(dirpath: string): string {
    if (!fs.existsSync(dirpath))
        fs.mkdirSync(dirpath, { recursive: true });

    return dirpath;
}

export function ensureFilepathDirpath(filepath: string): string {
    const dirpath = path.parse(filepath).dir;
    return ensureDirpath(dirpath);
}