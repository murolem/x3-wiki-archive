# x3-wiki-archive
An archive of X3 Wiki.

### [> CLICK THERE TO VISIT THE WIKI <](https://murolem.github.io/x3-wiki-archive)

## Downloading from the Wayback Machine

For the download, I used [wayback-machine-downloader by StrawberryMaster](https://github.com/StrawberryMaster/wayback-machine-downloader).

The last snapshot of the wiki that I've found before it was gone was `20181104113547`.

### Prerequisites

- Bun
- [wayback-machine-downloader by StrawberryMaster](https://github.com/StrawberryMaster/wayback-machine-downloader)

Install Bun dependencies with:

```bash
bun install
```

### Step 1: Downloading wiki archive

To download the wiki up to the snapshot, run:

```bash
ruby wayback_machine_downloader http://x3wiki.com --snapshot-at 20181104113547 --recursive-subdomains --subdomain-depth 1 -c 20
```

This will take some time and produce a directory containing the archived wiki.

> [!NOTE]  
> The archive is only partially viewable as a website (if viewed with something like live server). This is due to how the wiki was archies. To fix a bunch of stuff we will need to run cleanup scripts (see below).

### Step 2: Downloading manifest (snapshot metadata)

The metadata is used by cleanup scripts to generate the viewable wiki as well as extract wikitext. It contains *partial* list of downloaded files.

To download the snapshot metadata, run the following. Note that the metadata is not actually saved to disk, instead it is printed to terminal. To save the output to disk, run:

```bash
ruby wayback_machine_downloader http://x3wiki.com --snapshot-at 20181104113547 --recursive-subdomains --subdomain-depth 1 -c 20 --list 2>&1 | tee snapshots.txt
```

Then open the file and remove logs that were produced while downloading. That will leave us with a JSON file. Rename it to `snapshots.json` and place inside the archive.

### Step 3: Running cleanup scripts

Copy the archive to `archives` folder (create it if it's missing). 

> [!NOTE]  
> The cleanup scripts **are destructive** and will delete and rename files in your archive. Retain the original copy in case of errors.

Navigate to `src/cleanup.ts` and tweak the variables. At the minimum, you must specify the name of the archive directory you've just copied so that the script could find it.

Run the cleanup scripts with:

```bash
bun run cleanup
```

This will run multiple steps of cleaning, such as renaming files, correcting links, adding styles, etc.

> [!NOTE]  
> You will see a lot of warnings. Feel free to investigate them if something ends up not working. It is generally safe to rerun the cleanup scripts to see the warning that stay, but that might have some side effects such as duplicating of styles added to pages, so use this only for debugging purposes.

### Step 4: Viewing the wiki

At this point, all normal wiki pages should be viewable. The cleanup script aims to restore the following pages as the very least:
- Regular pages
- Category pages
- Template pages
- Edit pages containing wikitext

As well as restoring pages, a search functionality is added to the wiki, allowing to search pages like on regular wiki.