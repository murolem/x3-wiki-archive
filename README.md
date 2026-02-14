# x3-wiki-archive
An archive of X3 Wiki.

### [> CLICK THERE TO VISIT THE WIKI <](http://x3wiki.aliser.space/index.php/Main_Page)

The wiki is hosted on Github Pages with a custom domain via `gh-pages` branch.

If you want to download the wiki, there are multiple ways:
- If you want a version from Wayback Machine, head to [its release page](https://github.com/murolem/x3-wiki-archive/releases/tag/archive-20181104113547). Please note that it's barely functional.
- If you want the working version that's being hosted, simply clone the `gh-pages` branch. Alternatively, run the fixes yourself (see [Fixing Wayback Version of the Wiki](#Fixing_Wayback_Version_of_the_Wiki) section). 

## Downloading from the Wayback Machine

For the download, I used [wayback-machine-downloader by StrawberryMaster](https://github.com/StrawberryMaster/wayback-machine-downloader).

The last snapshot of the wiki that I've found before it was gone was `20181104113547`. You can download it from [its release page](https://github.com/murolem/x3-wiki-archive/releases/tag/archive-20181104113547). 

### Prerequisites

- Bun
- [wayback-machine-downloader by StrawberryMaster](https://github.com/StrawberryMaster/wayback-machine-downloader)

Install Bun dependencies with:

```bash
bun install
```

### Terminology

- Mainline Page - Page within `index.php` directory. Those are pages like `Falcon Prototype`, `Ryu`, etc - "main" content pages. Excludes majority of pages with gibberish names in archive root that the Wayback crawler was unable to name properly (edit pages, api pages, history pages, etc.).
- Disk path - Path to a directory or file in the archive.
  - Relative disk path - Disk path that's relative to the archive directory.
  - Full disk path - Disk path that's relative to current working directory (project directory).

- URL path - Path to a directory or file in the archive to use in URLs. Main difference is URL paths point to directories (eg `index.php/Barren_Shores`), while disk paths point to actual HTML pages (eg `index.php/Barren_Shores/index.html`).
  - Relative URL path - Url path that's relative to the archive directory.
  - Full URL path - Url path that's relative to current working directory (project directory).

### Step 1: Downloading wiki archive

To download the wiki up to the snapshot, run:

```bash
ruby wayback_machine_downloader http://x3wiki.com --snapshot-at 20181104113547 --recursive-subdomains --subdomain-depth 1 -c 20
```

This will take some time and produce a directory containing the archived wiki.

> [!NOTE]  
> The archive is only partially viewable as a website (if viewed with something like live server). This is due to how the wiki was archies. To fix a bunch of stuff we will need to run cleanup scripts (see (see [Fixing Wayback Version of the Wiki](#Fixing_Wayback_Version_of_the_Wiki) section for details).

### Step 2: Downloading manifest (snapshot metadata)

The metadata is used by cleanup scripts to generate the viewable wiki as well as extract wikitext. It contains *partial* list of downloaded files.

To download the snapshot metadata, run the following. Note that the metadata is not actually saved to disk, instead it is printed to terminal. To save the output to disk, run:

```bash
ruby wayback_machine_downloader http://x3wiki.com --snapshot-at 20181104113547 --recursive-subdomains --subdomain-depth 1 -c 20 --list 2>&1 | tee snapshots.txt
```

Then open the file and remove logs that were produced while downloading. That will leave us with a JSON file. Rename it to `snapshots.json` and place inside the archive.

## Fixing Wayback Version of the Wiki

### Step 1: Running cleanup scripts

Copy the archive to `archives` folder (create it if it's missing). 

> [!NOTE]  
> The cleanup scripts **are destructive** and will **delete, rename and modify files** in your archive. Retain the original copy in case of errors.

Navigate to `src/preset.ts` and tweak the variables. At the minimum, you must specify the name of the archive directory you've just copied so that the script could find it.

Run the cleanup scripts with:

```bash
bun run cleanup
```

This will run multiple steps of cleaning, such as renaming files, correcting links, adding styles, etc.

> [!NOTE]  
> You will see a lot of warnings. Feel free to investigate them if something ends up not working. It is generally safe to rerun the cleanup scripts to see the warning that stay, but that might have some side effects such as duplicating of styles added to pages, so use this only for debugging purposes.

The cleanup script aims to restore the following pages as the very least:
- Regular pages
- Category pages
- Template pages
<!-- - Source pages (pages containing wikitext) -->

In additions, a few more things are added:
- **Search functionality**. Simply type in the search bar and a list of suggestion will pop up.
- **Random page**. Exploring random stuff is fun, so the magic button has been restored as well!

### Step 2: Viewing the wiki

At this point, all normal wiki pages should be viewable. Use any software that allows to create a live server to view the wiki. For example, with Python installed, navigate to your archive and run:

```python
python3 -m http.server 3000
```