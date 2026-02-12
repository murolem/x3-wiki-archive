import { browseManifestDelimiter, browseManifestName } from './preset';
import { Logger } from './utils/logger';
import MiniSearch, { type SearchResult } from 'minisearch'
import pRetry from 'p-retry';
import { replaceSubstring } from './utils/string/replaceSubstring';
const { logError } = new Logger();

const matchesToDisplay = 15;

const manifestUrl = "/" + browseManifestName;

type BrowseManifestEntry = {
    pageTitle: string,
    pageUrl: string
};
type BrowseManifest = BrowseManifestEntry[];


const manifest: BrowseManifest | null = await fetchManifest();
attachSearch();
attachRandomPage();
attachDisclaimer();

async function fetchManifest(): Promise<BrowseManifest | null> {
    const text = await pRetry(async () => {
        let text: string;
        try {
            text = await fetch(manifestUrl)
                .then(res => res.text())
        } catch (err) {
            logError({
                msg: "failed to load manifest; scheduling retry",
                data: err
            });
            return;
        }

        return text;
    }, { maxTimeout: 10_000 });

    if (!text)
        return null;

    let isValid = true;
    const res = text.split("\n")
        .map(line => {
            const parts = line.split(browseManifestDelimiter);
            if (parts.length !== 2)
                isValid = false;

            return {
                pageTitle: parts[0] ?? '',
                pageUrl: parts[1] ?? ''
            }
        });

    if (!isValid) {
        logError({
            msg: "failed to parse manifest",
            data: {
                error: 'invalid format',
                manifest: res
            }
        });
        return null;
    }

    return res;
}

function attachSearch() {
    const searchInput = document.querySelector('input#searchInput') as HTMLInputElement | null;
    if (!searchInput || !manifest)
        return;
    const formElement = searchInput.parentElement!;

    type BrowseManifestKey = keyof BrowseManifestEntry;
    const searchKeys: BrowseManifestKey[] = ['pageTitle', 'pageUrl'];

    const miniSearch = new MiniSearch({
        fields: searchKeys, // fields to index for full-text search
        storeFields: searchKeys // fields to return with search results
    });

    const documents = manifest
        .map(e => ({
            id: e.pageUrl,
            ...e
        }))
    miniSearch.addAll(documents);

    // =======

    let latestSearchResults: SearchResult[] = [];

    searchInput.classList.add('search-input');

    const suggestsEl = document.createElement('div');
    suggestsEl.classList.add('search-suggest', 'hidden');
    document.body.append(suggestsEl);
    searchInput.addEventListener('input', e => showSuggestForQuery(searchInput.value));
    formElement.addEventListener('submit', e => {
        e.preventDefault();

        if (latestSearchResults.length > 0)
            window.location.href = latestSearchResults[0]!.pageUrl;

        return false;
    });

    function repositionSuggestWindow() {
        const inputElRect = searchInput!.getBoundingClientRect();

        suggestsEl.style.top = window.scrollY + inputElRect.top + inputElRect.height + 'px';
        suggestsEl.style.left = window.scrollX + inputElRect.left + 'px';
    }

    function show() { suggestsEl.classList.remove('hidden'); }
    function hide() { suggestsEl.classList.add('hidden'); }

    function showSuggestForQuery(query: string) {
        repositionSuggestWindow();

        const matches = miniSearch.search(query, { fuzzy: true });
        latestSearchResults = matches;

        suggestsEl.innerHTML = '';
        if (matches.length === 0) {
            const noMatchesNote = document.createElement('span');
            noMatchesNote.classList.add('suggest-no-matches')
            noMatchesNote.innerText = 'no matches';
            suggestsEl.append(noMatchesNote)
        }

        for (let i = 0; i < Math.min(matchesToDisplay, matches.length); i++) {
            const match = matches[i]!;
            const pageTitle = match.pageTitle;
            if (typeof pageTitle !== 'string') {
                logError({
                    msg: "failed to extract page title from a search match",
                    data: {
                        match
                    }
                })
                return;
            }
            const pageTitleLc = pageTitle.toLocaleLowerCase();

            const itemEl = document.createElement('a');
            itemEl.tabIndex = i + 1;
            itemEl.classList.add('suggest-item');
            itemEl.href = match.pageUrl;

            const matchTermIndicesFromEnd: Array<{ term: string, start: number, end: number }> = match.terms
                .map(t => {
                    const start = pageTitleLc.indexOf(t);
                    const end = start + t.length;
                    const term = pageTitle.substring(start, end);
                    return { term, start, end };
                })
                // sort backwards by the ending char
                .sort((a, b) => b.end - a.end);

            // replace each term substring with a span highlight
            let resInnerText = pageTitle;
            for (const m of matchTermIndicesFromEnd) {
                const spanHl = `<span class='suggest-hl'>${m.term}</span>`;
                resInnerText = replaceSubstring(resInnerText, m.start, m.end, spanHl);
            }

            itemEl.innerHTML = resInnerText;

            suggestsEl.append(itemEl);
        }

        show();
    }
}


function attachRandomPage() {
    const el = document.querySelector('#n-randompage > a') as HTMLLinkElement | null;
    if (!el)
        return;

    el.href = 'javascript:void(0)';
    const listener = () => {
        if (!manifest || manifest.length === 0)
            return;

        const page = manifest[randomIndex(manifest)]!;
        el.href = page.pageUrl;
        el.removeEventListener('click', listener);
        el.click();
    };
    el.addEventListener('click', listener);

    function randomIndex(arr: any[]): number {
        return arr.length === 0 ? -1 : Math.floor(Math.random() * arr.length);
    }
}

function attachDisclaimer() {
    const storageKey = 'disclaimer-state';
    if (localStorage.getItem(storageKey))
        return;

    const html = `\
<b>DISCLAIMER:</b> This is a <b>readonly</b> copy of the X3 Wiki scrapped from Wayback Machine. Preserve 🧡 Enjoy!<br><a href="https://github.com/murolem/x3-wiki-archive"><b>Project page</b></a>
<button class="remove">
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
    <svg width="800px" height="800px" viewBox="0 0 25 25" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns">
        
        <title>cross</title>
        <desc>Created with Sketch Beta.</desc>
        <defs>

    </defs>
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">
            <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-469.000000, -1041.000000)" fill="#000000">
                <path d="M487.148,1053.48 L492.813,1047.82 C494.376,1046.26 494.376,1043.72 492.813,1042.16 C491.248,1040.59 488.712,1040.59 487.148,1042.16 L481.484,1047.82 L475.82,1042.16 C474.257,1040.59 471.721,1040.59 470.156,1042.16 C468.593,1043.72 468.593,1046.26 470.156,1047.82 L475.82,1053.48 L470.156,1059.15 C468.593,1060.71 468.593,1063.25 470.156,1064.81 C471.721,1066.38 474.257,1066.38 475.82,1064.81 L481.484,1059.15 L487.148,1064.81 C488.712,1066.38 491.248,1066.38 492.813,1064.81 C494.376,1063.25 494.376,1060.71 492.813,1059.15 L487.148,1053.48" id="cross" sketch:type="MSShapeGroup">

    </path>
            </g>
        </g>
    </svg>
</button>
`;

    const el = document.createElement('div');
    el.classList.add('wiki-disclaimer-i-love-furries', 'fade-in');
    el.innerHTML = html;

    const removeButton = el.querySelector<HTMLButtonElement>('button.remove');
    if (!removeButton)
        return;

    removeButton.addEventListener('click', () => {
        el.classList.add('fade-out');
        setTimeout(() => el.remove(), 400 /* also in css */);
        localStorage.setItem(storageKey, ":3");
    });

    document.body.append(el);
    setTimeout(() => el.classList.remove('fade-in'), 2000 /* also in css */);
}