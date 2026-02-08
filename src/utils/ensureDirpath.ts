import fs from 'fs';

export function ensureDirpath(dirpath: string): string {
    if (!fs.existsSync(dirpath))
        fs.mkdirSync(dirpath, { recursive: true });

    return dirpath;
}