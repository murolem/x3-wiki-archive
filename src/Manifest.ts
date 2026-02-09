import z from 'zod';
import { stringConsumer } from './utils/stringConsumer';
import { assertPathExists } from './utils/assertPathExists';
import path from 'path';
import fs from 'fs';
import { Logger } from './utils/logger';
import { readFilesRecursive } from './utils/readFilesRecursive';
import chalk from 'chalk';
import { formatForLogAsList } from './utils/formatForLogAsList';
import { ensureFilepathDirpath } from './utils/ensureDirpath';
const { logInfo, logWarn, logFatalAndThrow } = new Logger();

export const timestampSchema = z.codec(
    z.string(),
    z.date(),
    {
        decode(tsStr) {
            const strConsumer = stringConsumer(tsStr);
            return new Date(strConsumer(4) + "-" + strConsumer(2) + "-" + strConsumer(2) + "T" + strConsumer(2) + ":" + strConsumer(2) + ":" + strConsumer(2) + "Z");
        },
        encode(ts) {
            const pad2 = (n: number) => n < 10 ? '0' + n : n;

            return ts.getFullYear().toString() + pad2(ts.getMonth() + 1) + pad2(ts.getDate()) + pad2(ts.getHours()) + pad2(ts.getMinutes()) + pad2(ts.getSeconds());
        }
    }
);

/** Original manifest produced by the wiki crawler. */
export const originalManifestSchema = z.object({
    /** Source website URL, eg `http://x3wiki.com:80/index.php/Talk:Missiles` */
    file_url: z.string(),
    /** Timestamp, eg `20160711182212` */
    timestamp: timestampSchema,
    /** Path to the page or dir relative to archive path, eg `index.php/Missions` */
    file_id: z.string(),
}).array();
export type OriginalManifest = z.infer<typeof originalManifestSchema>;

/** Updated version of manifest used in the app. */
export const manifestSchema = z.object({
    /** Source website URL, eg `http://x3wiki.com:80/index.php/Talk:Missiles` */
    originalUrl: z.string(),
    /** Timestamp, datetime. */
    timestamp: z.date(),
    /** Path to the resource on disk, eg `index.php/Missions` */
    diskPath: z.string(),
    /** Path to the resource relative to base URL. eg `index.php/Missions` */
    urlPath: z.string(),
}).array();
export type Manifest = z.infer<typeof manifestSchema>;

export class ManifestCtrl {
    private originalManifest: OriginalManifest;
    private manifest: Manifest;
    private archivePath: string;
    private newManifestPath: string

    constructor(archivePath: string, originalManifestPath: string, newManifestPath: string) {
        this.archivePath = archivePath;
        this.originalManifest = this.loadOriginalManifest(originalManifestPath);
        this.manifest = this.generateManifest(this.originalManifest);
        this.newManifestPath = newManifestPath;
    }

    /** 
     * Maps manifest to the structure of the archive, removing manifest entries that are missing from disk 
     * and adding entries from disk that are missing from manifest. 
     * 
     * Entries related to pages are first resolved so that they point to `index.html` so that they become actual filepaths.
     * The resolution is done on some conditions, so it should be safe to rerun this function.
     */
    mapToArchiveStructure(): this {
        // correct page paths that point to directory instead of index.html inside said directory
        // const renamedIndexHtmlPaths: Array<{ pathBefore: string, pathAfter: string }> = [];
        for (const e of this.manifest) {
            let fullPath = path.join(this.archivePath, e.diskPath);
            if (!fs.existsSync(fullPath))
                continue;

            if (path.parse(fullPath).ext === '' && fs.statSync(fullPath).isDirectory()) {
                const fullPathBefore = fullPath; 
                fullPath = path.join(fullPath, 'index.html');
                if (fs.existsSync(fullPath)) {
                    // renamedIndexHtmlPaths.push({
                        //     pathBefore: fullPathBefore,
                        //     pathAfter: fullPath
                        // })
                        e.diskPath = path.relative(this.archivePath, fullPath);
                }
            }
        }

        // now, actually compare paths on dist vs in manifest

        const actualPaths = readFilesRecursive(this.archivePath);

        const manifestPathsSet = new Set(this.manifest.map(e => e.diskPath));
        const diskPathsSet = new Set(actualPaths);

        // missing on disk
        const pathMissingOnDisk = manifestPathsSet.difference(diskPathsSet);
        // missing in manifest
        const pathsMissingInManifest = diskPathsSet.difference(manifestPathsSet);

        if (pathMissingOnDisk.size > 0) {
            logWarn(chalk.bold('paths missing from disk that are in manifest: \n') + formatForLogAsList([...pathMissingOnDisk]));
            logWarn(chalk.bold("> removing manifest entries"));
            // remove from manifest
            pathMissingOnDisk.forEach(p => this.manifest.splice(this.manifest.findIndex(e => e.diskPath === p), 1));
        }

        if (pathsMissingInManifest.size > 0) {
            logWarn(chalk.bold('paths missing from manifest that are on disk: \n') + formatForLogAsList([...pathsMissingInManifest]));
            logWarn(chalk.bold("> creating manifest entries"));

            // add to manifest
            const ts = new Date();
            pathsMissingInManifest.forEach(p => {
                this.manifest.push({
                    originalUrl: `http://x3wiki.com/${p}`,
                    timestamp: ts,
                    diskPath: p,
                    urlPath: p,
                })
            })
        }

        this.writeManifest();
        return this;
    }

    private loadOriginalManifest(originalManifestPath: string): OriginalManifest {
        assertPathExists(originalManifestPath, "manifest not found");

        let json;
        try {
            json = JSON.parse(fs.readFileSync(originalManifestPath, 'utf-8'));
        } catch (err) {
            logFatalAndThrow("failed to parse original manifest (JSON) " + originalManifestPath)
        }

        const parseRes = originalManifestSchema.safeParse(json);
        if (parseRes.error) {
            logFatalAndThrow({
                msg: "failed to parse original manifest (schema) " + originalManifestPath,
                data: z.prettifyError(parseRes.error)
            });
            throw ''//type guard
        }

        return parseRes.data;
    }

    /** Produces manifest using the original manifest. */
    private generateManifest(originalManifest: OriginalManifest): Manifest {
        const manifest: Manifest = originalManifest.map(e => ({
            originalUrl: e.file_url,
            timestamp: e.timestamp,
            diskPath: e.file_id,
            urlPath: e.file_id,
        }));

        return manifest;
    }

    private writeManifest(): void {
        ensureFilepathDirpath(this.newManifestPath);
        fs.writeFileSync(this.newManifestPath, JSON.stringify(manifestSchema.encode(this.manifest), null, 4));
    }
}