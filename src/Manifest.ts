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
import { err, ok, Result } from 'neverthrow';
const { logInfo, logWarn, logFatalAndThrow } = new Logger();

// blacklist for page names. matching pages will be discarded in the manifest.
// should cover all or almost all ad pages.
// automatically tries variants with and without underscores.
// todo: перенести в отдельный степ т.к. url encoded портит малину
const pageSubstringBlacklist = [
    "email tech support",
    "tech support USA",
    "Avast Antivirus",
    "Avast_Antivirus",
    "Brother Printer",
    "Hp_Technical",
    "Hp Printer",
    "Hp printer SUpport",
    "microsoft",
    "customer support",
    "Avast customer",
    "Email Toll Free Number",
    "Norton Antivirus",
    "Norton_Antivirus",
    "Skype Tech",
    "Skype Support",
    "Technical Support",
    "Phone Number USA",
    "support Phone Number",

    // other stuff
    "Recent Changes",
    "Special:",
    "User:",
    "User talk:",
    "Template:",
    "Talk:",
    "MediaWiki:"
]

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
    timestamp: z.coerce.date(),
    /** Path to the resource on disk, eg `index.php/Missions` */
    diskPath: z.string(),
    /** Path to the resource relative to base URL. eg `index.php/Missions` */
    urlPath: z.string(),
}).array();
export type ManifestNoMethods = z.infer<typeof manifestSchema>;
export type ManifestEntryNoMethods = ManifestNoMethods[number]

export type ManifestEntry = ManifestEntryNoMethods & {
    /** Remove this entry from the manifest. */
    remove(): void,

    /** 
     * Set new disk path. Automatically computes the url path as well.
     * 
     * **Note:** for the new path to be set it must exists on disk.**
     * @param newRelDiskPath New relative disk path.
     * @param removeArchivePath If enabled, removed path to the archive from the given path before saving it.
     */
    setDiskPath(newRelDiskPath: string, removeArchivePath?: boolean): void
}
export type Manifest = Array<ManifestEntry>;

export class ManifestCtrl {
    private originalManifestPath: string;
    private originalManifest!: OriginalManifest;

    private processedManifestPath: string
    private _manifest!: Manifest;
    get manifest() { return this._manifest; }
    private set manifest(value) { this._manifest = value; }

    private archivePath: string;

    constructor(archivePath: string, originalManifestPath: string, processedManifestPath: string, opts: Partial<{
        loadProcessedManifestFromDisk: boolean
    }> = {
            loadProcessedManifestFromDisk: true
        }) {
        this.archivePath = archivePath;
        this.originalManifestPath = originalManifestPath;
        this.processedManifestPath = processedManifestPath;

        this.loadOriginalManifest();
        if (opts.loadProcessedManifestFromDisk)
            this.tryLoadProcessedManifestFromDisk() || this.generateManifest();
        else
            this.generateManifest();
    }

    /** 
     * Converts disk path to url path using the archive structure (i.e. path needs to exist on disk).
     * 
     * @example
     * index.php/Megalodon/index.html
     * // v
     * index.php/Megalodon
     * @param diskPath Disk path to convert.
     * @param prependArchivePath If enabled, prepends path to the archive to the given path so that it becomes valid for `fs` operations.
     * @returns A path relative to the archive path.
     */
    convertDiskPathToUrlPath(diskPath: string, prependArchivePath?: boolean): string {
        if (prependArchivePath)
            diskPath = path.join(this.archivePath, diskPath);

        const parsed = path.parse(diskPath);
        if (parsed.base === 'index.html'
            // for case when we are in archive root and processing index.html file specifically. 
            // otherwise we would end up pointing at archive root.
            && path.relative(parsed.dir, this.archivePath) !== '.') {
            return this.convertPathToRelative(parsed.dir);
        }

        return this.convertPathToRelative(diskPath)
    }

    /** 
     * Converts url path to disk path using the archive structure (i.e. path needs to exist on disk).
     * 
     * @example
     * index.php/Megalodon
     * // v
     * index.php/Megalodon/index.html
     * @param urlPath URL path to convert.
     * @param prependArchivePath If enabled, prepends path to the archive to the given path so that it becomes valid for `fs` operations.
     * @returns A path relative to the archive path.
     */
    convertUrlPathToDiskPath(urlPath: string, prependArchivePath?: boolean): string {
        if (prependArchivePath)
            urlPath = path.join(this.archivePath, urlPath);

        if (path.parse(urlPath).ext === '') {
            const newPath = path.join(urlPath, 'index.html');
            if (fs.existsSync(urlPath))
                return this.convertPathToRelative(newPath);
        }

        return this.convertPathToRelative(urlPath);
    }

    /**
     * Resolves path from the root of the archive, creating a path that can be stored in manifest.
     * @param pathStr 
     * @example
     * // assuming archive is at archives/x3wiki.com_20181104113547_full
     * archives/x3wiki.com_20181104113547_full/index.php/Xenon_Sector_597
     * // v becomes
     * index.php/Xenon_Sector_597
     */
    convertPathToRelative(pathStr: string): string {
        return path.relative(this.archivePath, pathStr);
    }

    /**
     * Joins given path with archive path, creating a path that can be used with `fs`.
     * @param pathStr 
     * @example
     * // assuming archive is at archives/x3wiki.com_20181104113547_full
     * index.php/Xenon_Sector_597
     * // v becomes
     * archives/x3wiki.com_20181104113547_full/index.php/Xenon_Sector_597
     */
    convertPathToFull(pathStr: string): string {
        return path.join(this.archivePath, pathStr);
    }

    /** 
     * Maps manifest to the structure of the archive, removing manifest entries that are missing from disk 
     * and adding entries from disk that are missing from manifest. 
     * 
     * Entries related to pages are first resolved so that they point to `index.html` so that they become actual filepaths.
     * The resolution is done on some conditions, so it should be safe to rerun this function.
     * 
     * Manifest is automatically saved after the operation.
     */
    mapToArchiveStructure(): this {
        // correct page paths that point to directory instead of index.html inside said directory
        // const renamedIndexHtmlPaths: Array<{ pathBefore: string, pathAfter: string }> = [];
        const failedPathConverts: string[] = [];
        this._manifest.forEach(e => {
            e.diskPath = this.convertUrlPathToDiskPath(e.urlPath, true);
        });

        if (failedPathConverts.length > 0)
            logWarn(chalk.bold(`failed to generate disk paths from url paths: \n`) + formatForLogAsList(failedPathConverts));

        // now, actually compare paths on dist vs in manifest

        const diskPaths = readFilesRecursive(this.archivePath);

        const manifestPathsSet = new Set(this._manifest.map(e => e.diskPath));
        const diskPathsSet = new Set(diskPaths);

        // missing on disk
        const pathMissingOnDisk = manifestPathsSet.difference(diskPathsSet);
        // missing in manifest
        const pathsMissingInManifest = diskPathsSet.difference(manifestPathsSet);

        if (pathMissingOnDisk.size > 0) {
            logWarn(chalk.bold('paths missing from disk that are in manifest: \n') + formatForLogAsList([...pathMissingOnDisk]));
            logWarn(chalk.bold("> removing manifest entries above"));
            // remove from manifest
            pathMissingOnDisk.forEach(p => this._manifest.splice(this._manifest.findIndex(e => e.diskPath === p), 1));
        }

        if (pathsMissingInManifest.size > 0) {
            logWarn(chalk.bold('paths missing from manifest that are on disk: \n') + formatForLogAsList([...pathsMissingInManifest]));
            logWarn(chalk.bold("> creating manifest entries for disk paths above"));

            // add to manifest
            const ts = new Date();
            pathsMissingInManifest.forEach(relDiskPath => {
                const relUrlPath = this.convertDiskPathToUrlPath(relDiskPath, true);

                this._manifest.push(
                    this.populateManifestEntryWithMethods(
                        {
                            originalUrl: `http://x3wiki.com/${relUrlPath}`,
                            timestamp: ts,
                            diskPath: relDiskPath,
                            urlPath: relUrlPath,
                        }
                    )
                );
            })
        }

        this.saveManifest();
        return this;
    }

    saveManifest(): void {
        ensureFilepathDirpath(this.processedManifestPath);
        fs.writeFileSync(this.processedManifestPath, JSON.stringify(manifestSchema.encode(this._manifest), null, 4));
    }


    /**
     * Removes entry from manifest. If it's not found, does nothing.
     * @param entry Entry to get rid of.
     */
    removeEntryFromManifest(entry: ManifestEntry): void {
        const idx = this._manifest.findIndex(e => e === entry);
        if (idx !== -1)
            this._manifest.splice(idx, 1);
    }

    matchesCustomBlacklist(name: string, blacklist: string[]): boolean {
        const blVariantsLc = blacklist
            .flatMap(blSubstr => {
                const blSubstrLc = blSubstr.toLocaleLowerCase();
                const baseVariants = [
                    blSubstrLc,
                    blSubstrLc.replaceAll(' ', '_'),
                    blSubstrLc.replaceAll('_', ' ')
                ];
                const moreVariants: string[] = [];
                baseVariants.forEach(variant => moreVariants.push(encodeURIComponent(variant)))
                baseVariants.forEach(variant => moreVariants.push(decodeURIComponent(variant)));
                return [...baseVariants, ...moreVariants];
            })

        const nameLc = name.toLocaleLowerCase();
        for (const blSubstrLc of blVariantsLc) {
            if (nameLc.includes(blSubstrLc))
                return true;
        }
        return false;
    }

    // ==================================
    // ==================================

    /** 
     * Loads original manifest from disk.
     * @throws  On any loading or parsing error.
     */
    private loadOriginalManifest(): void {
        assertPathExists(this.originalManifestPath, "manifest not found");

        let json;
        try {
            json = JSON.parse(fs.readFileSync(this.originalManifestPath, 'utf-8'));
        } catch (err) {
            logFatalAndThrow("failed to load and parse original manifest (JSON) " + this.originalManifestPath)
        }

        const parseRes = originalManifestSchema.safeParse(json);
        if (parseRes.error) {
            logFatalAndThrow({
                msg: "failed to load and parse original manifest (schema) " + this.originalManifestPath,
                data: z.prettifyError(parseRes.error)
            });
            throw ''//type guard
        }

        this.originalManifest = parseRes.data;
    }

    /** 
     * Attempts to load manifest from disk if it was saved previously.
     * @returns Whether the manifest was loaded.
     * @throws On any loading or parsing error except if the manifest doesn't exists.
     */
    private tryLoadProcessedManifestFromDisk(): boolean {
        if (!fs.existsSync(this.processedManifestPath))
            return false;

        let json;
        try {
            json = JSON.parse(fs.readFileSync(this.processedManifestPath, 'utf-8'));
        } catch (err) {
            logFatalAndThrow("failed to load and parse new manifest (JSON) " + this.processedManifestPath)
        }

        const parseRes = manifestSchema.safeParse(json);
        if (parseRes.error) {
            logFatalAndThrow({
                msg: "failed to load and parse new manifest (schema) " + this.processedManifestPath,
                data: z.prettifyError(parseRes.error)
            });
            throw ''//type guard
        }

        this._manifest = parseRes.data
            .map(e => this.populateManifestEntryWithMethods(e));

        return true;
    }

    /** Produces manifest using the original manifest. */
    private generateManifest(): void {
        this._manifest = this.originalManifest
            .map(e => {
                return this.populateManifestEntryWithMethods({
                    originalUrl: e.file_url,
                    timestamp: e.timestamp,
                    diskPath: e.file_id,
                    urlPath: e.file_id,
                })
            });
    }

    /**
     * Adds methods to a manifest entry.
     * @param entry 
     * @returns 
     */
    private populateManifestEntryWithMethods(entry: ManifestEntryNoMethods): ManifestEntry {
        (entry as ManifestEntry).remove = () => this.removeEntryFromManifest(entry as ManifestEntry);
        (entry as ManifestEntry).setDiskPath = (newRelDiskPath: string, removeArchivePath?: boolean) => {
            if (removeArchivePath)
                newRelDiskPath = this.convertPathToRelative(newRelDiskPath);

            entry.diskPath = newRelDiskPath;
            entry.urlPath = this.convertDiskPathToUrlPath(newRelDiskPath, true);
        }

        return entry as ManifestEntry;
    }
}