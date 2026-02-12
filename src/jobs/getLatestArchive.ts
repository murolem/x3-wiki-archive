import { z } from 'zod';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { ensureDirpath } from '../utils/ensureDirpath';
import path from 'path';
import { extract as extractTar } from 'tar';
import { Logger } from '../utils/logger';
const { logInfo, logFatalAndThrow  } = new Logger();

const archivesDirpath = 'archives';
const archiveNameRegex = /x3wiki\.com_\d+_full.tar.gz/;
const url = 'https://api.github.com/repos/murolem/x3-wiki-archive/releases/latest';

const schema = z.object({
    assets: z.array(
        z.object({
            name: z.string(),
            browser_download_url: z.string()
        })
    )
});

async function main() {
    logInfo(`downloading metadata: ${url}`);
    const releasesMeta = await fetch(url)
        .then(d => d.json())
        .then(json => {
            const parsed = schema.safeParse(json);
            if(parsed.error) {
                logFatalAndThrow({
                    msg: "failed to parse (schema)",
                    data: {
                        error: z.prettifyError(parsed.error),
                        json: JSON.stringify(json, null, 4)
                    },
                })
                throw ''//type guard
            }

            return parsed.data;
        });

    logInfo("searching for archive");
    const archiveAsset = releasesMeta.assets
        .find(ass => archiveNameRegex.test(ass.name));
    if (!archiveAsset) {
        logInfo("archive not found, exiting");
        return;
    }

    logInfo(`found archive '${archiveAsset.name}', fetching: ${archiveAsset.browser_download_url}`);
    const archive = await fetch(archiveAsset.browser_download_url)
        .then(r => r.bytes())

    logInfo('download complete, writing archive');
    const archiveTarFilepath = path.join(archivesDirpath, archiveAsset.name);
    ensureDirpath(archivesDirpath);
    await fsPromises.writeFile(archiveTarFilepath, archive);

    logInfo('extracting archive');
    await extractTar({
        file: archiveTarFilepath,
        C: archivesDirpath
    });

    logInfo("removing tar");
    await fsPromises.rm(archiveTarFilepath);

    logInfo('✅ all done!')
}

main();