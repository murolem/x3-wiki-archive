import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Logger } from './utils/logger.ts';
import chalk from 'chalk';
import { roundToDigit } from './utils/roundToDigit.ts';
import { readFilesRecursive } from './utils/readFilesRecursive.ts';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import { ensureDirpath } from './utils/ensureDirpath.ts';
import sanitizeFilename from 'sanitize-filename';
const { logInfo, logWarn, logFatalAndThrow } = new Logger();

const archiveDir = "archives";
const archiveName = "x3wiki.com_20181104113547_full";
// starts with 1
const onlyRunNthStep = 4;

// ============


const archivePath = path.join(archiveDir, archiveName);
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

const formatForLogAsList = (list: string[]) => {
    return list.map(e => '- ' + e).join("\n");
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


await runStep("renaming API query pages from PHP to HTML", () => {
    const blacklist = [
        "load.php"
    ]
    const pages = fs.readdirSync(archivePath)
        .filter(entry => {
            const entryPath = path.join(archivePath, entry);
            return fs.statSync(entryPath).isFile()
                && entry.endsWith(".php")
                && !blacklist.includes(entry)
        });

    for (const [i, page] of pages.entries()) {
        logProcessingProgress("renaming pages", i, pages.length, 5000);

        const pagePath = path.join(archivePath, page);

        const newName = path.parse(page).name + ".html";
        const newPath = path.join(archivePath, newName);
        fs.renameSync(pagePath, newPath);
    }
});

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
        logProcessingProgress("adding styles", i, filepaths.length, 2500);

        const fp = path.join(archivePath, relFp);
        let contents = await fsPromises.readFile(fp, 'utf-8');

        const headIdx = contents.indexOf("<head>");
        if (headIdx === -1) {
            filesWithNoHead.push(fp)
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

await runStep("removing dead links to the wiki", async () => {
    const filepaths = readFilesRecursive(archivePath)
        .filter(fp => fp.endsWith('.html'));

    for (const [fpIdx, relFp] of filepaths.entries()) {
        logProcessingProgress("removing dead links", fpIdx, filepaths.length, 2500);

        const fp = path.join(archivePath, relFp);
        let contents = await fsPromises.readFile(fp, 'utf-8');

        contents = contents.split('http://x3wiki.com/').join('/');
        contents = contents.split('https://x3wiki.com/').join('/');
        contents = contents.split('http://www.x3wiki.com/').join('/');
        contents = contents.split('https://www.x3wiki.com/').join('/');

        await fsPromises.writeFile(fp, contents, 'utf-8');
    }
});

await runStep('extracting wikitext', async () => {
    const filepaths = fs.readdirSync(archivePath)
        .filter(ep => {
            return fs.statSync(path.join(archivePath, ep)).isFile()
                && ep.endsWith('.html')
        });

    const outputDirpath = ensureDirpath(path.join(archivePath, "wikitext"));

    // todo:
    // - find out which pages do not have wikitext counterpart.
    // - if theres no full wikitext counterpart, maybe look for section edits?

    const isEditPageIncludingSectionRegex = /<title>Editing (.+) - X3 Wiki<\/title>/;
    const isEditPageSectionRegex = /<title>Editing .+ \(section\) - X3 Wiki<\/title>/;
    const pageTitleRegex = /<title>Editing (.+) - X3 Wiki<\/title>/;
    const wikitextTextareaRegex = /<textarea.*?>([\S\s]*)<\/textarea>(?:<div class=['"]editOptions['"]>|<div id=['"]editpage-copywarn['"]>)/m;

    let pagesRestored = 0;
    let editPagesWithExtractionFailure: string[] = [];
    for (const [fpIdx, relFp] of filepaths.entries()) {
        logProcessingProgress("restoring edit pages", fpIdx, filepaths.length, 2500);

        const fp = path.join(archivePath, relFp);
        let contents = await fsPromises.readFile(fp, 'utf-8');

        // test to see if we are on edit page
        if (!isEditPageIncludingSectionRegex.test(contents) || isEditPageSectionRegex.test(contents))
            continue;

        let wikitext = wikitextTextareaRegex.exec(contents)?.[1];
        if (wikitext === undefined) {
            editPagesWithExtractionFailure.push(fp);
            continue;
        } else if (wikitext === '') {
            continue;
        }
        wikitext = `<!-- source file: ${relFp} -->\n\n` + wikitext;

        const pageTitle = pageTitleRegex.exec(contents)?.[1];
        if (!pageTitle) {
            editPagesWithExtractionFailure.push(fp);
            continue;
        }

        const outputFp = path.join(outputDirpath, formatPageNameForFsAndHyperlinking(pageTitle) + ".wikitext");
        await fsPromises.writeFile(outputFp, wikitext);

        pagesRestored++;
    }

    if (editPagesWithExtractionFailure.length > 0)
        logWarn(`failed to extract wikitext from edit pages (${editPagesWithExtractionFailure.length}): \n` + formatForLogAsList(editPagesWithExtractionFailure));

    logInfo(chalk.bold("pages restored: " + pagesRestored));
});