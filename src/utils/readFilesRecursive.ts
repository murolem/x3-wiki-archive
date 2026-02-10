import fs from 'fs';
import { toOsPath } from './toOsPath';
import { Logger } from './logger.ts';
const logger = new Logger("readFilesRecursive");
const { logFatal } = logger;

/** 
 * Reads all files in a given directory.
 * 
 * Returns an array of file paths relative to given directory.
 */
export function readFilesRecursive(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
        logFatal({
            msg: `failed to read files recursively: directory path doesn't exist: ${dirPath}`,
            throw: true
        });
    }

    if (!fs.statSync(dirPath).isDirectory) {
        logFatal({
            msg: `failed to read files recursively: given path is a file path, not a directory path: ${dirPath}`,
            throw: true
        });
    }

    const result: string[] = [];
    for (const relPathRaw of fs.readdirSync(dirPath, { recursive: true })) {
        const relPath = relPathRaw.toString('utf-8');

        const absSourceFilePath = toOsPath(`${dirPath}/${relPath}`);
        if (fs.statSync(absSourceFilePath).isDirectory()) {
            continue;
        }

        result.push(relPath.toString());
    }

    return result;
}

/** 
 * Reads all files and directories in a given directory.
 * 
 * Returns an array of paths relative to given directory.
 */
export function getFilesAndDirsRecursive(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
        logFatal({
            msg: `failed to read files and dirs recursively: directory path doesn't exist: ${dirPath}`,
            throw: true
        });
    }

    if (!fs.statSync(dirPath).isDirectory) {
        logFatal({
            msg: `failed to read files and dirs recursively: given path is a file path, not a directory path: ${dirPath}`,
            throw: true
        });
    }

    const result: string[] = [];
    for (const relPathRaw of fs.readdirSync(dirPath, { recursive: true })) {
        const relPath = relPathRaw.toString('utf-8');

        const absSourcePath = toOsPath(`${dirPath}/${relPath}`);
        const stat = fs.statSync(absSourcePath);
        if (stat.isDirectory() || stat.isFile())
            result.push(relPath.toString());
    }

    return result;
}