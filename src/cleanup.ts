import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Logger, type LogLevel } from './utils/logger.ts';
import chalk from 'chalk';
import { roundToDigit } from './utils/roundToDigit.ts';
import { readFilesRecursive } from './utils/readFilesRecursive.ts';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import { ensureDirpath, ensureFilepathDirpath } from './utils/ensureDirpath.ts';
import sanitizeFilename from 'sanitize-filename';
import { number, z } from 'zod';
import { ManifestCtrl, type ManifestEntry } from './Manifest.ts';
import { isPathUnderDirectory } from './utils/isPageUnderDirectory.ts';
import { assertPathExists } from './utils/assertPathExists.ts';
import { formatForLogAsList } from './utils/formatForLogAsList.ts';
const { logDebug, logInfo, logWarn, logFatalAndThrow } = new Logger();

// ===========================
// ======== VARIABLES ========
// ===========================

// name of your archive.
const archiveName = "x3wiki.com_20181104113547_full";

// name of directory where your archive is.
const archiveDirname = "archives";

// name for the original manifest
const originalManifestName = "snapshots.json";

// name for the processed manifest produced by the script
const processedManifestName = "snapshots-processed.json";

// if enabled, loads up processed manifest when it's available.
// useful for debugging since a lot of warning will be gone after the initial cleanup.
const loadProcessedManifestFromDisk = true;

// run only the nth step.
// starts with 1. set to 0 to disable
const onlyRunNthStep = 0;

// controls how detailed are the logs
const logLevel: LogLevel = 'INFO';


// =============================
// ======== DANGER ZONE ========
// =============================

Logger.setLogLevel(logLevel);

const archivePath = path.join(archiveDirname, archiveName);
if (!fs.existsSync(archivePath))
    logFatalAndThrow("archive path not found: " + archivePath);

let stepRunCounter = 1;
const runStep = async (name: string, fn: () => void | Promise<void>) => {
    if (onlyRunNthStep <= 0 || stepRunCounter === onlyRunNthStep) {
        logInfo(chalk.bold.bgBlue(`[STEP] ${name}`));
        await fn();
        logInfo(chalk.bold.bgGreen(`[STEP] ${name} DONE`));
    }

    stepRunCounter++;
}

const runIfOnNth = (n: number, i: number, fn: () => void) => {
    if (i > 0 && i % n === 0)
        fn();
}

const formatPercentage = (value: number, toDigit: number = 0) => {
    return roundToDigit(value * 100, toDigit) + '%';
}

const formatPercentageProgress = (current: number, total: number, toDigit: number = 0) => {
    return formatPercentage(current / total, toDigit);
}

const logProcessingProgress = (description: string, i: number, total: number, onNth: number) => {
    const log = () => logInfo(`${description} (${i} ~ ${formatPercentageProgress(i, total)})`);

    runIfOnNth(onNth, i, log);
    // log one extra time on the very last entry, but only if it wasnt the nth log (otherwise it would duplicate)
    if (i === (total - 1) && i % onNth !== 0)
        log();
}

const insertSubstring = (str: string, idx: number, substr: string) => {
    return str.slice(0, idx) + substr + str.slice(idx);
}


/**
 * Formats filename to be valid for both linking to from the pages and legal as a filename.
 * 
 * Steps:
 * 1. Decode as a URI component.
 * 2. Sanitize.
 * 3. Manually encode back by:
 *     - Replacing spaces ' ' with underscores '_'.
 */
const formatPageNameForFsAndHyperlinking = (name: string) => {
    const colonMarker = '@@@@@@@@@@COLON@@@@@@@@@@';

    return sanitizeFilename(
        decodeURIComponent(name)
            .replaceAll(' ', '_')
            .replaceAll(':', colonMarker)
    )
        // permit colon in filenames since so many pages use it. sorry windows users
        .replaceAll(colonMarker, ':')

}

function strIndexOfAll(str: string, substring: string): number[] {
    const indexes: number[] = [];
    let i = -1;
    do {
        i = str.indexOf(substring, i + 1);
    } while (i != -1) {
        indexes.push(i);
    }
    return indexes;
}





const swapObjectKeysAndValues = (obj: object): unknown => {
    return Object.fromEntries(Object.entries(obj).map(a => a.reverse()));
}

// ================


const getGibberishNamedFiles = () => {

}


// ================

const manifestCtrl = new ManifestCtrl(
    archivePath,
    path.join(archivePath, originalManifestName),
    path.join(archivePath, processedManifestName),
    {
        loadProcessedManifestFromDisk: loadProcessedManifestFromDisk
    }
);
const manifest = manifestCtrl.manifest;

// ================

await runStep("mapping original manifest to archive structure", () => {
    manifestCtrl.mapToArchiveStructure();
});

await runStep("fixing page names", () => {
    const pages = manifest
        .filter(e => isPathUnderDirectory('index.php', e.diskPath));

    /** Maps unsafe chars to their temp safe variants.  */
    const charEscapes: Record<string, string> = {
        ':': '_-_-_-COLON-_-_-_',
        ',': '_-_-_-COMMA-_-_-_',
        '+': '_-_-_-PLUS-_-_-_',
        // special case since we are processing entire paths not just segments, so it's okay to have slashes.
        "/": '_-_-_-FSLASH-_-_-_'
    };
    const charUnescapes = swapObjectKeysAndValues(charEscapes) as Record<string, string>;

    const renames: Array<{
        manifestEntry: ManifestEntry,
        fullUrlPathBefore: string,
        fullUrlPathAfter: string
    }> = [];
    // const pendingRenames: Array<{ manifestEntry: ManifestEntry, newFilename: string }> = [];
    let successfulRenamesCounter = 0;
    let failedRenamesCounter = 0;
    const renamesNotQueuedDueTooUnsafe: Array<{ relUrlPathBefore: string, relUrlPathAfter: string }> = [];
    for (const [i, e] of pages.entries()) {
        logProcessingProgress("asserting pages for renaming", i, pages.length, 1000);
        logDebug(`asserting page for renaming ${chalk.bold(e.diskPath)}`);

        const relDiskPath = e.diskPath;
        const fullDiskPath = manifestCtrl.convertPathToFull(relDiskPath);
        assertPathExists(fullDiskPath, "disk path not found but present in manifest");

        // rel disk path but paths that end with index.html will instead end with their directory.
        const relUrlPath = manifestCtrl.convertDiskPathToUrlPath(relDiskPath, true)
        const fullUrlPath = manifestCtrl.convertPathToFull(relUrlPath);

        const relUrlPathDecoded = decodeURIComponent(relUrlPath);

        if (relUrlPath === relUrlPathDecoded)
            continue; // already safe, do nothing

        // fully decoded name but but with select few unsafe chars present
        // kind of fs-safe (sorry windows users) and works in URLs. 
        let relUrlPathDecodedLoosely = relUrlPathDecoded;
        for (const char in charEscapes) {
            const escape = charEscapes[char]!;
            relUrlPathDecodedLoosely = relUrlPathDecodedLoosely.replaceAll(char, escape);
        }

        relUrlPathDecodedLoosely = encodeURIComponent(relUrlPathDecodedLoosely);
        for (const escape in charUnescapes) {
            const char = charUnescapes[escape]!;
            relUrlPathDecodedLoosely = relUrlPathDecodedLoosely.replaceAll(escape, char);
        }

        if (relUrlPathDecodedLoosely === relUrlPathDecoded) {
            // both decodes match = fix successful = fs and url are the same = it should load fine.
            // enqueue the renaming.

            logDebug(`rename queued; new name: ${chalk.bold(manifestCtrl.convertUrlPathToDiskPath(relUrlPathDecodedLoosely, true))}`);

            renames.push({
                manifestEntry: e,
                fullUrlPathBefore: fullUrlPath,
                fullUrlPathAfter: manifestCtrl.convertPathToFull(relUrlPathDecodedLoosely)
            });
        } else {
            // decodes do not match = theres still some unsafe chars left that we can't decode
            // = URLs will not be able to match the files on fs.
            // remove offending entries.

            logDebug("unable to rename, deleting from disk and manifest");

            renamesNotQueuedDueTooUnsafe.push({ relUrlPathBefore: relUrlPath, relUrlPathAfter: relUrlPathDecodedLoosely });
            fs.rmSync(fullUrlPath, { recursive: true });
            e.remove();
            failedRenamesCounter++;
        }
    }

    // finally, do the rename
    for (const [i, rename] of renames.entries()) {
        logProcessingProgress("renaming pages", i, renames.length, 100);
        logDebug(`renaming \n\tfrom ${manifestCtrl.convertPathToRelative(rename.fullUrlPathBefore)} \n\t  to ${manifestCtrl.convertPathToRelative(rename.fullUrlPathAfter)}`);

        if(rename.manifestEntry.urlPath === manifestCtrl.convertPathToRelative(rename.fullUrlPathAfter)) {
            // already renamed via affected paths renaming, no need to do anything else.
            logDebug("skipping paths, already renamed (likely via affected paths renaming)");
            continue;
        }


        // should work for both dirs and files
        ensureFilepathDirpath(rename.fullUrlPathAfter);
        fs.renameSync(rename.fullUrlPathBefore, rename.fullUrlPathAfter);
        successfulRenamesCounter++;

        // go through every manifest entity and make sure the paths are updated to reflect the renaming
        // (only relevant for paths that contain other files or subfiles)
        const affectedRenamedPaths: Array<{ pathBefore: string, pathAfter: string }> = [];
        for (const otherEntry of manifest) {
            const otherFullDiskPath = manifestCtrl.convertPathToFull(otherEntry.diskPath);
            if (!isPathUnderDirectory(rename.fullUrlPathBefore, otherFullDiskPath))
                continue;

            const otherRelDiskPathFromDir = path.relative(rename.fullUrlPathBefore, otherFullDiskPath);
            const otherFullDiskPathAfter = path.join(rename.fullUrlPathAfter, otherRelDiskPathFromDir);
            const otherRelDiskPathAfter = manifestCtrl.convertPathToRelative(otherFullDiskPathAfter);

            const otherRelDiskPathBefore = otherEntry.diskPath;
            otherEntry.setDiskPath(otherRelDiskPathAfter);
            affectedRenamedPaths.push({
                pathBefore: otherRelDiskPathBefore,
                pathAfter: otherRelDiskPathAfter
            })
        }

        if(affectedRenamedPaths.length > 0) {
            const listStr = affectedRenamedPaths.map(e => {
                return `\tfrom ${e.pathBefore} \n\t  to ${e.pathAfter}`;
            });
            logDebug(`found path(-s) that were affected by renaming; updated manifest diskpaths for: \n` + formatForLogAsList(listStr));
        }
    }

    if (renamesNotQueuedDueTooUnsafe.length > 0) {
        const listStr = formatForLogAsList(renamesNotQueuedDueTooUnsafe
            .map(e => `rel url path before: ${e.relUrlPathBefore} \nrel url path after: ${e.relUrlPathAfter}`)
        );
        logWarn(chalk.bold(`failed to rename pages (new name too unsafe) (${renamesNotQueuedDueTooUnsafe.length}): \n`) + listStr);
        logWarn(chalk.bold("> removing above pages from disk and manifest"))
    }

    logInfo(chalk.bold(`pages checked: ${pages.length}; ${successfulRenamesCounter} renamed, ${failedRenamesCounter} failed to rename`));
    manifestCtrl.saveManifest();
});

// await runStep("renaming API query pages from PHP to HTML", () => {
//     const blacklist = [
//         "load.php"
//     ]
//     const pages = fs.readdirSync(archivePath)
//         .filter(entry => {
//             const entryPath = path.join(archivePath, entry);
//             return fs.statSync(entryPath).isFile()
//                 && entry.endsWith(".php")
//                 && !blacklist.includes(entry)
//         });

//     for (const [i, page] of pages.entries()) {
//         logProcessingProgress("renaming pages", i, pages.length, 5000);

//         const pagePath = path.join(archivePath, page);

//         const newName = path.parse(page).name + ".html";
//         const newPath = path.join(archivePath, newName);
//         fs.renameSync(pagePath, newPath);
//     }
// });

await runStep("adding and linking basic CSS styles", async () => {
    // add style file

    const sourceFilepath = path.resolve("src/assets/styles.css");
    if (!fs.existsSync(sourceFilepath))
        logFatalAndThrow("styles file not found at " + sourceFilepath);

    const targetFilepath = path.join(archivePath, "styles.css");
    fs.writeFileSync(targetFilepath, fs.readFileSync(sourceFilepath, 'utf-8'), 'utf-8');

    // link from all html files

    const filepaths = readFilesRecursive(archivePath)
        .filter(fp => fp.endsWith('.html'));

    let filesWithNoHead = [];
    for (const [i, relFp] of filepaths.entries()) {
        logProcessingProgress("adding styles", i, filepaths.length, 1000);

        const fp = path.join(archivePath, relFp);
        let contents = await fsPromises.readFile(fp, 'utf-8');

        const headIdx = contents.indexOf("<head>");
        if (headIdx === -1) {
            filesWithNoHead.push(relFp)
            continue;
        }

        contents = insertSubstring(contents, headIdx + "<head>".length, '\n<link rel="stylesheet" href="/styles.css" />')
        await fsPromises.writeFile(fp, contents, 'utf-8');

        // const dom = new JSDOM(contents, {
        //     url: "http://x3wiki.com"
        // });
        // const doc = dom.window.document;

        // doc.head.prepend('<link rel="stylesheet" href="/styles.css" />');
    }

    if (filesWithNoHead.length > 0)
        logWarn(`found files with no head (${filesWithNoHead.length}): \n${formatForLogAsList(filesWithNoHead)}`);
});

await runStep("removing dead links to the old wiki", async () => {
    const filepaths = readFilesRecursive(archivePath)
        .filter(fp => fp.endsWith('.html'));

    for (const [fpIdx, relFp] of filepaths.entries()) {
        logProcessingProgress("removing dead links", fpIdx, filepaths.length, 1000);

        const fp = path.join(archivePath, relFp);
        let contents = await fsPromises.readFile(fp, 'utf-8');

        contents = contents.split('http://x3wiki.com/').join('/');
        contents = contents.split('https://x3wiki.com/').join('/');
        contents = contents.split('http://www.x3wiki.com/').join('/');
        contents = contents.split('https://www.x3wiki.com/').join('/');

        await fsPromises.writeFile(fp, contents, 'utf-8');
    }
});

// await runStep('extracting wikitext', async () => {
//     const filepaths = fs.readdirSync(archivePath)
//         .filter(ep => {
//             return fs.statSync(path.join(archivePath, ep)).isFile()
//                 && ep.endsWith('.html')
//         });

//     const outputDirpath = ensureDirpath(path.join(archivePath, "wikitext"));

//     // todo:
//     // - find out which pages do not have wikitext counterpart.
//     // - if theres no full wikitext counterpart, maybe look for section edits?
//     // 
//     // - pages can duplicate since they were retrieved from all time period. 

//     const isEditPageIncludingSectionRegex = /<title>Editing (.+) - X3 Wiki<\/title>/;
//     const isEditPageSectionRegex = /<title>Editing .+ \(section\) - X3 Wiki<\/title>/;
//     const pageTitleRegex = /<title>Editing (.+) - X3 Wiki<\/title>/;
//     const wikitextTextareaRegex = /<textarea.*?>([\S\s]*)<\/textarea>(?:<div class=['"]editOptions['"]>|<div id=['"]editpage-copywarn['"]>)/m;

//     let wikitextPagesRestored = 0;
//     let pagesWithSectionEditsRemoved = 0;
//     let pagesWithFullEditsRemoved = 0;
//     let editPagesWithExtractionFailure: string[] = [];
//     let pageNames: [string, string, string][] = [];
//     for (const [fpIdx, relFp] of filepaths.entries()) {
//         logProcessingProgress("restoring edit pages", fpIdx, filepaths.length, 2500);

//         const fp = path.join(archivePath, relFp);
//         let contents = await fsPromises.readFile(fp, 'utf-8');

//         // test to see if we are on edit page
//         if (!isEditPageIncludingSectionRegex.test(contents)) {
//             continue;
//         } else if (isEditPageSectionRegex.test(contents)) {
//             // check for edit pages that are for sections of pages
//             // we dont need those so we can just remove them

//             // await fsPromises.rm(fp);
//             pagesWithSectionEditsRemoved++;
//             continue;
//         }

//         let wikitext = wikitextTextareaRegex.exec(contents)?.[1];
//         if (wikitext === undefined) {
//             editPagesWithExtractionFailure.push(fp);
//             continue;
//         }
//         wikitext = wikitext.trim();

//         if (wikitext === '') {
//             continue;
//         }
//         wikitext = `<!-- source file: ${relFp} -->\n\n` + wikitext;

//         if(wikitext.includes("out-of-date"))
//             debugger;

//         const pageTitle = pageTitleRegex.exec(contents)?.[1];
//         if (!pageTitle) {
//             editPagesWithExtractionFailure.push(fp);
//             continue;
//         }

//         const match = pageNames.find(e => e[0] === pageTitle);
//         if(match)
//             debugger;

//         pageNames.push([pageTitle, relFp, wikitext]);

//         const outputFp = path.join(outputDirpath, formatPageNameForFsAndHyperlinking(pageTitle) + ".wikitext");
//         await fsPromises.writeFile(outputFp, wikitext);
//         // await fsPromises.rm(fp);
//         pagesWithFullEditsRemoved++;

//         wikitextPagesRestored++;
//     }

//     if (editPagesWithExtractionFailure.length > 0)
//         logWarn(`failed to extract wikitext from edit pages (${editPagesWithExtractionFailure.length}): \n` + formatForLogAsList(editPagesWithExtractionFailure));

//     logInfo(chalk.bold("pages restored: " + wikitextPagesRestored));
//     logInfo(`pages removed: ${pagesWithSectionEditsRemoved + pagesWithFullEditsRemoved} (${pagesWithFullEditsRemoved} edit pages for whole pages, ${pagesWithSectionEditsRemoved} edit pages for sections)`)
// });

await runStep("saving manifest", () => {
    manifestCtrl.saveManifest();
});