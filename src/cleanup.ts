import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Logger } from './utils/logger.ts';
import chalk from 'chalk';
import { roundToDigit } from './utils/roundToDigit.ts';
import { readFilesRecursive } from './utils/readFilesRecursive.ts';
import { parseHTML } from 'linkedom';
import { ensureFilepathDirpath } from './utils/ensureDirpath.ts';
import sanitizeFilename from 'sanitize-filename';
import { ManifestCtrl, type ManifestEntry } from './Manifest.ts';
import { isPathUnderDirectory } from './utils/isPageUnderDirectory.ts';
import { assertPathExists } from './utils/assertPathExists.ts';
import { formatForLogAsList } from './utils/formatForLogAsList.ts';
import { logLevel, archiveDirname as archiveDirnamePreset, archiveName as archiveNamePreset, onlyRunNthStep, originalManifestName, processedManifestName, loadProcessedManifestFromDisk, browseManifestName, browseManifestDelimiter, onlyRunNthTask } from './preset.ts';
const { logDebug, logInfo, logWarn, logFatalAndThrow } = new Logger();

const args = process.argv.slice(2);
// @ts-ignore
const autoArchivePath = args.includes('--auto-archive-path');
// @ts-ignore
const renameArchiveDirTo = args
    .find(str => str.startsWith('--rename-archive-dir'))
    ?.split('=')
    ?.[1];

// =============================
// ======== DANGER ZONE ========
// =============================

Logger.setLogLevel(logLevel);

let archiveDirname: string;
let archiveName: string;
let archivePath: string;
if(autoArchivePath) {
    logInfo(chalk.bgBlue('# AUTO ARCHIVE PATH MODE #'));

    archiveDirname = archiveDirnamePreset;
    if(!fs.existsSync(archiveDirname))
        logFatalAndThrow("archives dir doesn't exist: " + archiveDirname);

    const dirs = fs.readdirSync(archiveDirname)
        .filter(entry => {
            const fullPath = path.join(archiveDirname, entry);
            return fs.statSync(fullPath).isDirectory();
        })
        // sort desc
        .sort((a, b) => fs.statSync(b).birthtime.getTime() - fs.statSync(a).birthtime.getTime())
    archiveName = dirs[0]!;
    if(!archiveName)
        logFatalAndThrow("no archives found in archives dir: " + archiveDirname);
} else {
    archiveDirname = archiveDirnamePreset;
    archiveName = archiveNamePreset;
}

archivePath = path.join(archiveDirname, archiveName);
logInfo("archive dirpath: " + archivePath);
assertPathExists(archivePath, "archive path not found");

if(renameArchiveDirTo) {
    const oldArchivePath = archivePath;

    archiveName = renameArchiveDirTo;
    archivePath = path.join(archiveDirname, archiveName);
    logInfo("requested rename, new archive dirpath: " + archivePath);
    
    if(fs.existsSync(archivePath))
        await fsPromises.rm(archivePath, { recursive: true, force: true });

    fs.renameSync(oldArchivePath, archivePath);
}


// ==========

let stepRunCounter = 1;
const runStep = async (name: string, fn: () => void | Promise<void>) => {
    if (onlyRunNthStep <= 0 || stepRunCounter === onlyRunNthStep) {
        logInfo(chalk.bold.bgBlue(` [STEP ${stepRunCounter}] ${name} `));
        await fn();
        logInfo(chalk.bold.bgGreen(` [STEP ${stepRunCounter}] ${name} DONE `));
    }

    manifestCtrl.saveManifest();
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


const tryLooselyDecodeURIComponent = (() => {
    /** Maps unsafe chars to their temp safe variants.  */
    const charEscapes: Record<string, string> = {
        ':': '_-_-_-COLON-_-_-_',
        ',': '_-_-_-COMMA-_-_-_',
        '+': '_-_-_-PLUS-_-_-_',
        // not sure about this one, surely it will break all on non mainside pages
        '&': '_-_-_-AMPER-_-_-_',
        // special case since we are processing entire paths not just segments, so it's okay to have slashes.
        "/": '_-_-_-FSLASH-_-_-_'
    };
    const charUnescapes = swapObjectKeysAndValues(charEscapes) as Record<string, string>;

    return (comp: string): string | null => {
        const decoded = decodeURIComponent(comp);

        if (comp === decoded)
            return comp; // already safe, do nothing

        // fully decoded name but but with select few unsafe chars present
        // kind of fs-safe (sorry windows users) and works in URLs. 
        let decodedLoosely = decoded;
        for (const char in charEscapes) {
            const escape = charEscapes[char]!;
            decodedLoosely = decodedLoosely.replaceAll(char, escape);
        }

        decodedLoosely = encodeURIComponent(decodedLoosely);
        for (const escape in charUnescapes) {
            const char = charUnescapes[escape]!;
            decodedLoosely = decodedLoosely.replaceAll(escape, char);
        }

        if (decodedLoosely === decoded) {
            // both decodes match = fix successful = fs and url are the same = it should load fine.

            return decodedLoosely;
        } else {
            // decodes do not match = theres still some unsafe chars left that we can't decode
            // = URLs will not be able to match the files on fs.

            return null;
        }
    }
})();


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

await runStep("removing ad-related and other trash pages", async () => {
    // blacklist for page names. matching pages will be discarded in the manifest.
    // should cover all or almost all ad pages.
    // automatically tries variants with and without underscores.
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
        "phone number",
    ];

    const badEntries = manifest.filter(e => manifestCtrl.matchesCustomBlacklist(e.diskPath, pageSubstringBlacklist));
    for (const e of badEntries) {
        // we can safely remove the whole url path since we don't need stuff under bad named pages anyway.
        const fullUrlDirpath = path.join(archiveDirname, e.urlPath);
        await fsPromises.rm(fullUrlDirpath, { recursive: true, force: true });
        e.remove();
    }
    logInfo(chalk.bold(`bad pages removed: ${badEntries.length}`));
});


await runStep("fixing page names", () => {
    const pages = manifest
        .filter(e => isPathUnderDirectory('index.php', e.diskPath));

    const renames: Array<{
        manifestEntry: ManifestEntry,
        fullUrlPathBefore: string,
        fullUrlPathAfter: string
    }> = [];
    // const pendingRenames: Array<{ manifestEntry: ManifestEntry, newFilename: string }> = [];
    let successfulRenamesCounter = 0;
    let failedRenamesCounter = 0;
    const renamesNotQueuedDueTooUnsafe: Array<{ relUrlPathBefore: string }> = [];
    for (const [i, e] of pages.entries()) {
        logProcessingProgress("asserting pages for renaming", i, pages.length, 1000);
        logDebug(`asserting page for renaming ${chalk.bold(e.diskPath)}`);

        const relDiskPath = e.diskPath;
        const fullDiskPath = manifestCtrl.convertPathToFull(relDiskPath);
        assertPathExists(fullDiskPath, "disk path not found but present in manifest");

        // rel disk path but paths that end with index.html will instead end with their directory.
        const relUrlPath = manifestCtrl.convertDiskPathToUrlPath(relDiskPath, true)
        const fullUrlPath = manifestCtrl.convertPathToFull(relUrlPath);

        const looselyDecodedRelUrlPath = tryLooselyDecodeURIComponent(relUrlPath);
        if (looselyDecodedRelUrlPath === null) {
            // remove offending entries.

            logDebug("unable to rename, deleting from disk and manifest");

            renamesNotQueuedDueTooUnsafe.push({ relUrlPathBefore: relUrlPath });
            fs.rmSync(fullUrlPath, { recursive: true });
            e.remove();
            failedRenamesCounter++;
        } else {
            // enqueue the renaming.

            logDebug(`rename queued; new name: ${chalk.bold(manifestCtrl.convertUrlPathToDiskPath(looselyDecodedRelUrlPath, true))}`);

            renames.push({
                manifestEntry: e,
                fullUrlPathBefore: fullUrlPath,
                fullUrlPathAfter: manifestCtrl.convertPathToFull(looselyDecodedRelUrlPath)
            });
        }
    }

    // finally, do the rename
    for (const [i, rename] of renames.entries()) {
        logProcessingProgress("renaming pages", i, renames.length, 100);
        logDebug(`renaming \n\tfrom ${manifestCtrl.convertPathToRelative(rename.fullUrlPathBefore)} \n\t  to ${manifestCtrl.convertPathToRelative(rename.fullUrlPathAfter)}`);

        if (rename.manifestEntry.urlPath === manifestCtrl.convertPathToRelative(rename.fullUrlPathAfter)) {
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

        if (affectedRenamedPaths.length > 0) {
            const listStr = affectedRenamedPaths.map(e => {
                return `\tfrom ${e.pathBefore} \n\t  to ${e.pathAfter}`;
            });
            logDebug(`found path(-s) that were affected by renaming; updated manifest diskpaths for: \n` + formatForLogAsList(listStr));
        }
    }

    if (renamesNotQueuedDueTooUnsafe.length > 0) {
        const listStr = formatForLogAsList(renamesNotQueuedDueTooUnsafe
            .map(e => `rel url path before: ${e.relUrlPathBefore}`)
        );
        logWarn(chalk.bold(`failed to rename pages (new name too unsafe) (${renamesNotQueuedDueTooUnsafe.length}): \n`) + listStr);
        logWarn(chalk.bold("> removing above pages from disk and manifest"))
    }

    logInfo(chalk.bold(`pages checked: ${pages.length}; ${successfulRenamesCounter} renamed, ${failedRenamesCounter} failed to rename`));
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

await runStep("generating CSS styles", async () => {
    // generate style file

    const sourceFilepath = path.resolve("src/pageStyles.css");
    const targetFilepath = path.join(archivePath, "styles.css");
    assertPathExists(sourceFilepath, "styles file not found at " + sourceFilepath);

    const minifiedRes = await Bun.build({
        entrypoints: [sourceFilepath],
        minify: true
    });
    if (!minifiedRes.success)
        logFatalAndThrow({
            msg: "failed to minify css",
            data: minifiedRes
        });

    const minified = await minifiedRes.outputs[0]!.text();
    fs.writeFileSync(targetFilepath, minified);
});

await runStep("generating page script", async () => {
    const sourceFilepath = path.resolve("src/pageScript.ts");
    const targetFilepath = path.join(archivePath, "script.js");
    assertPathExists(sourceFilepath, "script file not found at " + sourceFilepath);

    const minifiedRes = await Bun.build({
        entrypoints: [sourceFilepath],
        minify: true
    });
    if (!minifiedRes.success)
        logFatalAndThrow({
            msg: "failed to minify css",
            data: minifiedRes
        });

    const minified = await minifiedRes.outputs[0]!.text();
    fs.writeFileSync(targetFilepath, minified);
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

const domTasks: DomTask[] = []
type DomTask<T = void> = {
    name: string,
    fn: (doc: Document, accum: T, opts: { fpIdx: number, relFp: string, fp: string }) => T
    accum?: T,
    onEnd?: (accum: T) => void,

    modifiedContentCounter: number,
}
const domTask = <T = void>(name: string, fn: DomTask<T>['fn'], accumInit?: T, onEnd?: (accum: T) => void) =>
    // @ts-ignore
    domTasks.push({ name, modifiedContentCounter: 0, fn, accum: accumInit, onEnd });


domTask('linking CSS styles', (doc, accum, opts) => {
    if (!doc.head) {
        accum.filesWithoutHead.push(opts.relFp);
        return accum;
    } else if (doc.head.querySelector('link[href="/styles.css"]') !== null) {
        return accum;
    }

    const linkEl = doc.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = '/styles.css';
    doc.head.prepend(linkEl);

    return accum;
}, { filesWithoutHead: [] } as { filesWithoutHead: string[] }, accum => {
    if (accum.filesWithoutHead.length > 0)
        logWarn(`found pages with no head (${accum.filesWithoutHead.length}): \n${formatForLogAsList(accum.filesWithoutHead)}`);
});

domTask('linking page script', (doc, accum, opts) => {
    if (!doc.head || doc.head.querySelector('script[src="/script.js"]') !== null)
        return;

    const scriptEl = doc.createElement('script') as HTMLScriptElement;
    scriptEl.setAttribute('type', 'module');
    scriptEl.src = '/script.js';
    doc.head.prepend(scriptEl);
});

domTask('paint non-existent links red', (doc, accum, opts) => {
    const knownUrls = new Set(
        manifest.map(e => "/" + e.urlPath)
    );

    const linkEls = doc.querySelectorAll<HTMLLinkElement>(`a`);
    const dummyBaseUrl = 'https://127.0.0.1:3000';
    for (let i = 0; i < linkEls.length; i++) {
        const el = linkEls[i]!;
        // skips urs leading to other domains, we don't know abt them
        if(el.href.startsWith('http'))
            continue;

        const hrefLooselyDecoded = tryLooselyDecodeURIComponent(el.href);
        if(hrefLooselyDecoded === null)
            continue;

        // dummy base just to get parsing to work.
        const hrefParsed = new URL(el.href,  dummyBaseUrl);
        // if links points to page creation action, check if it actually exists 
        // since wiki pages are snapshot at different times.
        if (hrefParsed.pathname === '/index.php'
            && hrefParsed.search.startsWith('?title=')
            && hrefParsed.search.endsWith('&action=edit&redlink=1')) {
            // link to a new page, which might exist.
            const title = hrefParsed.searchParams.get('title')!;
            const titleLooselyDecoded = tryLooselyDecodeURIComponent(title);
            if(titleLooselyDecoded === null)
                continue;
            const wouldBeLink = `/index.php/${titleLooselyDecoded}`;
            if(wouldBeLink.includes('M2'))
                debugger;
            if (knownUrls.has(wouldBeLink)) {
                el.classList.remove('new')
                el.parentElement?.classList.remove('new');
                el.href = wouldBeLink;
                accum.linksUnturnedRedCounter++;
            }
        }

        const pathnameLooselyDecoded = tryLooselyDecodeURIComponent(hrefParsed.pathname);
        if(pathnameLooselyDecoded === null)
            continue;

        if (!knownUrls.has(pathnameLooselyDecoded + hrefParsed.search)) {
            el.classList.add('new');
            if (el.parentElement!.tagName === 'LI')
                el.parentElement!.classList.add('new');

            accum.linksTurnedRedCounter++;
        }
    }

    return accum;
}, { linksUnturnedRedCounter: 0, linksTurnedRedCounter: 0 }, accum => {
    logInfo(chalk.bold("links turned red: " + accum.linksTurnedRedCounter));
    if (accum.linksUnturnedRedCounter > 0)
        logInfo(chalk.bold("links turned green (were red, but actually existed): " + accum.linksUnturnedRedCounter))
});

domTask('patch random page button', (doc, opts) => {
    const randomPageLink = doc.querySelector('li#n-randompage > a') as HTMLLinkElement | null;
    if (!randomPageLink)
        return;

    randomPageLink.href = 'javascript:void(0)';
    // unred my boy
    randomPageLink.classList.remove('new');
    randomPageLink.parentElement?.classList.remove('new');
});

domTask('patch search', (doc, opts) => {
    const searchBox = doc.querySelector('div#p-search') as HTMLElement | null;
    if (!searchBox)
        return;

    const moveSearchAboveNavbox = () => {
        const navBox = doc.querySelector('div#p-navigation') as HTMLElement | null;
        if (!navBox)
            return;

        navBox.before(searchBox);
    }   

    const removeAction = () => {
        const searchForm = searchBox.querySelector('#searchform');
        if (!searchForm)
            return;

        searchForm.removeAttribute('action');
    }

    moveSearchAboveNavbox();
    removeAction();
});

domTask('remove edit links', (doc, opts) => {
    const linkEls = doc.querySelectorAll(`span.mw-editsection`)
        .forEach(el => el.remove());
});

domTask('remove user bar', doc => {
    const el = doc.querySelector('div#p-personal');
    if (!el)
        return;

    el.remove();
});

await runStep("running tasks on DOM (w/ loading & parsing)", async () => {
    const pagesDirpath = path.join(archivePath, "index.php");
    assertPathExists(pagesDirpath, "path containing mainline pages doesn't exist");

    const filepaths = readFilesRecursive(pagesDirpath)
        .filter(fp => fp.endsWith('.html'));

    // ====================

    for (const [fpIdx, relFp] of filepaths.entries()) {
        logProcessingProgress("running tasks on pages", fpIdx, filepaths.length, 100);
        const fp = path.join(pagesDirpath, relFp);
        const doc = parseHTML(await fsPromises.readFile(fp, 'utf-8')).document;

        for (const [taskIdx, task] of domTasks.entries()) {
            if (onlyRunNthTask > 0 && taskIdx !== (onlyRunNthTask - 1))
                continue;

            const docStrBefore = doc.documentElement.outerHTML;
            task.fn(doc, task.accum, { fpIdx, relFp, fp });
            if (docStrBefore === doc.documentElement.outerHTML)
                continue;

            task.modifiedContentCounter++;
        }

        await fsPromises.writeFile(fp, doc.toString(), 'utf-8');
    }

    const tasksStrArray = domTasks
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => `${t.name} - ${t.modifiedContentCounter} pages ~ ${formatPercentage(t.modifiedContentCounter / filepaths.length)}`);

    logInfo(chalk.bold("task summary: \n") + formatForLogAsList(tasksStrArray));

    logInfo(chalk.bold("running post-tasks finishers"));
    for (const task of domTasks) {
        if (task.onEnd)
            task.onEnd(task.accum);
    }
})

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

await runStep("replace some endpoints with redirects", () => {
    const generateHtml = (target: string): string => {
        return `\
<!DOCTYPE HTML>
<html lang="en-US">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="0; url=${target}">
        <script type="text/javascript">
            window.location.href = "${target}"
        </script>
        <title>Page Redirection</title>
    </head>
    <body>
        If you are not redirected automatically, follow <a href='${target}'>this link</a>
    </body>
</html>`;
    }

    const urlTarget = '/index.php/Main_Page';
    const diskSources = [
        'index.html',
        'index.php/index.html'
    ]
    for(const relDiskPath of diskSources) {
        const fullDiskPath = manifestCtrl.convertPathToFull(relDiskPath);
        fs.writeFileSync(fullDiskPath, generateHtml(urlTarget));
    }
});

await runStep("generating browse manifest", () => {
    // we only want to include the pages under index.php and only those with one level deep with /index.html in them, since those are mainline pages.
    const mainlinePagesRegex = /index\.php\/[^\/]+\/index\.html/;

    // some stuff you dont wanna see in search
    const substringBlacklist = [
        "Recent Changes",
        "Special:",
        // "User:",
        // "User talk:",
        // "Template:",
        // "Talk:",
        "MediaWiki:"
    ];

    const matchingEntries = manifest
        .filter(e => {
            return mainlinePagesRegex.test(e.diskPath)
                && !manifestCtrl.matchesCustomBlacklist(e.diskPath, substringBlacklist);
        });

    /** Formats name pretty for display/search. */
    const formatPageNameForDisplay = (name: string) => name.replaceAll('_', ' ');

    // contains 2 things per item:
    // 1. display page name used in searching./
    // 2. link to the page
    const browseManifest: [string, string][] = matchingEntries
        .map(e => ([
            formatPageNameForDisplay(e.urlPath.split('/').at(-1)!),
            '/' + e.urlPath
        ]));

    const saveFilepath = path.join(archivePath, browseManifestName)
    fs.writeFileSync(
        saveFilepath,
        browseManifest
            .map(e => e.join(browseManifestDelimiter))
            .join("\n"),
    )

    logInfo(chalk.bold("browse entries generated: " + browseManifest.length));
});