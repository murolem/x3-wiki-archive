import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Logger } from './utils/logger.ts';
import chalk from 'chalk';
import { roundToDigit } from './utils/roundToDigit.ts';
import { readFilesRecursive } from './utils/readFilesRecursive.ts';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import { ensureDirpath, ensureFilepathDirpath } from './utils/ensureDirpath.ts';
import sanitizeFilename from 'sanitize-filename';
import { number, z } from 'zod';
import { ManifestCtrl } from './Manifest.ts';
const { logInfo, logWarn, logFatalAndThrow } = new Logger();

const archiveName = "x3wiki.com_20181104113547_full";
const archiveDirname = "archives";
const originalManifestName = "snapshots.json";
const processedManifestName = "snapshots-processed.json";
// if enabled, loads up processed manifest when it's available.
// useful for iteration as well as getting rid of first time warns via cleansing.
const preferProcessedManifest = true;
// starts with 1. set to 0 to disable
const onlyRunNthStep = 0;

// ============

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





const swapObjectKeysWithValues = (obj: object) => Object.fromEntries(Object.entries(obj).map(a => a.reverse()));

// ================


const getGibberishNamedFiles = () => {
    
}


// ================

const manifest = new ManifestCtrl(
    archivePath,
    path.join(archivePath, originalManifestName),
    path.join(archivePath, processedManifestName),
);

await runStep("mapping original manifest to archive structure", () => {
    manifest.mapToArchiveStructure();
});

// await runStep("criss crossing manifest with actual structure", () => {
//     const manifest = getManifest();
//     for(const e of manifest) {
//         const pathStr = path.join(archivePath, e.file_id);
//         if(!fs.existsSync(pathStr)) {
//             manifest.splice(manifest.indexOf(e), 1);
//             continue;
//         }

//         if(path.parse(e.file_id).ext === '' && fs.statSync(pathStr).isDirectory()) {
//             e.file_id = path.join(e.file_id, "index.html");
//         }
//         e.file_id = path.normalize(e.file_id);
//     }

//     const actualPaths = readFilesRecursive(archivePath);

//     const manifestPathsSet = new Set(manifest.map(e => e.file_id));
//     const actualPathsSet = new Set(actualPaths);

//     const missingFsPaths = manifestPathsSet.difference(actualPathsSet);
//     const missingManifestPaths = actualPathsSet.difference(manifestPathsSet);

//     if(missingFsPaths.size > 0) {
//         logWarn(chalk.bold('paths missing from filesystem that are in manifest: \n') + formatForLogAsList([...missingFsPaths]));
//     }
//         if(missingManifestPaths.size > 0) {
//         logWarn(chalk.bold('paths missing from manifest that are in filesystem: \n') + formatForLogAsList([...missingManifestPaths]));
//     }
// })

// fix filenames of normal pages so that they are openable in browser.
// since the filenames come fully url encoded and in browser they are queried not super url encoded this creates 404.
// by allowing colon ':' (illegal in Windows) and comma ',' characters in filenames we resolve almost all issues with page addressing that matter
// (at least in space of normal pages, ie excluding revisions and all that kind of stuff).
// await runStep("fix page names", async () => {
//     const manifest = getManifest();

//     const actualPagesEntries = manifest
//         .filter(e => e.file_id.startsWith('index.php/'));

//     const allowedUnsafeUrlCharsMapToMarkers: Record<string, string> = {
//         ':': '_-_-_-COLON-_-_-_',
//         ',': '_-_-_-COMMA-_-_-_',
//     };
//     const markersToAllowedUnsafeUrlCharsMap = swapObjectKeysWithValues(allowedUnsafeUrlCharsMapToMarkers);

//     const unfixablePages: { page: string, encodedFilename: string, decodedFilename: string, looslyReencodedFilename: string }[] = [];
//     const missingPaths = [];
//     let successfulRenameCounter = 0;
//     for(const e of actualPagesEntries) {
//         if(e.file_id === "") {
//             manifest.splice(manifest.indexOf(e), 1);
//             continue;
//         }

//         const sourcePath = path.join(archivePath, e.file_id);
//         const pathIdParsed = path.parse(e.file_id);
//         const nameEncoded = pathIdParsed.base;
//         const nameDecoded = decodeURIComponent(nameEncoded);
//         if(nameEncoded === nameDecoded) {
//             // name already safe, do nothing
//             continue;
//         }

//         // produce a safe name by temporarily substituting chars that are illegal

//         let nameEncodedLoose = nameDecoded;
//         for(const char in allowedUnsafeUrlCharsMapToMarkers) {
//             // @ts-ignore what
//             nameEncodedLoose = nameEncodedLoose.replaceAll(char, allowedUnsafeUrlCharsMapToMarkers[char]);
//         }
//         nameEncodedLoose = encodeURIComponent(nameEncodedLoose);
//         for(const marker in markersToAllowedUnsafeUrlCharsMap) {
//             nameEncodedLoose = nameEncodedLoose.replaceAll(marker, markersToAllowedUnsafeUrlCharsMap[marker]);
//         }
        
//         if(nameEncodedLoose === nameDecoded) {
//             // names matched = fixed successfully

//             const newFileId = path.join(pathIdParsed.dir, nameEncodedLoose);
//             const newPath = path.join(archivePath, newFileId);

//             if(fs.existsSync(newPath)) {
//                 // already renamed previously
//                 continue;
//             } else if(!fs.existsSync(sourcePath)) {
//                 // source doesn't exist
//                 missingPaths.push(sourcePath);
//                 continue;
//             }
            
//             e.file_id = newFileId;
//             fs.renameSync(
//                 sourcePath,
//                 newPath
//             );
//             successfulRenameCounter++;
//         } else {
//             // filenames still not match = filename will be accessible = get rid of it

//             if(!fs.existsSync(sourcePath)) {
//                 // source doesn't exist
//                 missingPaths.push(sourcePath);
//                 continue;
//             }

//             unfixablePages.push({
//                 page: e.file_url,
//                 encodedFilename: nameEncoded,
//                 decodedFilename: nameDecoded,
//                 looslyReencodedFilename: nameEncodedLoose
//             });
//             manifest.splice(manifest.indexOf(e), 1);
//             fs.rmSync(sourcePath, { recursive: true });
//         }
//     }

//     if(unfixablePages.length > 0) {
//         const unfixablePagesStrArray = unfixablePages.map(e => e.encodedFilename + ' -> ' + e.decodedFilename + ' -> ' + e.looslyReencodedFilename);
//         logWarn(chalk.bold(`pages with names that could not be safely renamed (${unfixablePages.length}): \n`) + formatForLogAsList(unfixablePagesStrArray));
//         // unfixablePages.forEach(n => logInfo(n[0] + "\t" + n[1]))
//         // logInfo(chalk.bold("total mismatched: " + unfixablePages.length));
//     }

//     if(missingPaths.length > 0) {
//         logWarn(chalk.bold(`paths that are missing but found in manifest (${missingPaths.length}): \n`) + formatForLogAsList(missingPaths));
//     }

//     logInfo(chalk.bold("successful renames: " + successfulRenameCounter));
    
//     writeManifestCopy(manifest)
    
//     // const pages = getNormalPages();
// });


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

// await runStep("adding and linking basic CSS styles", async () => {
//     // add style file

//     const sourceFilepath = path.resolve("src/assets/styles.css");
//     if (!fs.existsSync(sourceFilepath))
//         logFatalAndThrow("styles file not found at " + sourceFilepath);

//     const targetFilepath = path.join(archivePath, "styles.css");
//     fs.writeFileSync(targetFilepath, fs.readFileSync(sourceFilepath, 'utf-8'), 'utf-8');

//     // link from all html files

//     const filepaths = readFilesRecursive(archivePath)
//         .filter(fp => fp.endsWith('.html'));

//     let filesWithNoHead = [];
//     for (const [i, relFp] of filepaths.entries()) {
//         logProcessingProgress("adding styles", i, filepaths.length, 2500);

//         const fp = path.join(archivePath, relFp);
//         let contents = await fsPromises.readFile(fp, 'utf-8');

//         const headIdx = contents.indexOf("<head>");
//         if (headIdx === -1) {
//             filesWithNoHead.push(fp)
//             continue;
//         }

//         contents = insertSubstring(contents, headIdx + "<head>".length, '\n<link rel="stylesheet" href="/styles.css" />')
//         await fsPromises.writeFile(fp, contents, 'utf-8');

//         // const dom = new JSDOM(contents, {
//         //     url: "http://x3wiki.com"
//         // });
//         // const doc = dom.window.document;

//         // doc.head.prepend('<link rel="stylesheet" href="/styles.css" />');
//     }

//     if (filesWithNoHead.length > 0)
//         logWarn(`found files with no head (${filesWithNoHead.length}): \n${formatForLogAsList(filesWithNoHead)}`);
// });

// await runStep("removing dead links to the wiki", async () => {
//     const filepaths = readFilesRecursive(archivePath)
//         .filter(fp => fp.endsWith('.html'));

//     for (const [fpIdx, relFp] of filepaths.entries()) {
//         logProcessingProgress("removing dead links", fpIdx, filepaths.length, 2500);

//         const fp = path.join(archivePath, relFp);
//         let contents = await fsPromises.readFile(fp, 'utf-8');

//         contents = contents.split('http://x3wiki.com/').join('/');
//         contents = contents.split('https://x3wiki.com/').join('/');
//         contents = contents.split('http://www.x3wiki.com/').join('/');
//         contents = contents.split('https://www.x3wiki.com/').join('/');

//         await fsPromises.writeFile(fp, contents, 'utf-8');
//     }
// });

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