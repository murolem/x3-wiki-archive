import { manifestSchema, type Manifest, type ManifestNoMethods } from './Manifest';
import { browseManifestDelimiter, browseManifestName, processedManifestName } from './preset';
import { Logger } from './utils/logger';
import { z } from 'zod';
const { logError } = new Logger();

const manifestUrl = "/" + browseManifestName;
let manifest: null | BrowseManifest;

const browseManifestEntrySchema = z.object({
    pageTitle: z.string(),
    pageUrl: z.string()
});
const browseManifestSchema = browseManifestEntrySchema.array();
type BrowseManifest = z.infer<typeof browseManifestSchema>;


fetchManifest();
addSearchInput();
addRandomPageLogic();

async function fetchManifest() {
    let text: string;
    try {
        text = await fetch(manifestUrl)
            .then(res => res.text())
    } catch (err) {
        logError({
            msg: "failed to load manifest)",
            data: err
        });
        return;
    }

    const parsedRes = browseManifestSchema.safeParse(
        text.split("\n")
            .map(e => {
                const parts = e.split(browseManifestDelimiter);
                return {
                    pageTitle: parts[0],
                    pageUrl: parts[1]
                }
            })
    )

    if (parsedRes.error) {
        logError({
            msg: "failed to parse manifest",
            data: {
                error: z.prettifyError(parsedRes.error)
            }
        });
        return;
    }

    manifest = parsedRes.data;
    console.log(manifest);
}

function addSearchInput() {
    const searchInput = document.querySelector('input#searchInput') as HTMLInputElement | null;
    if (!searchInput)
        return;

    searchInput.classList.add('search-input');

    const suggestsEl = document.createElement('div');
    suggestsEl.classList.add('search-suggest', 'hidden');
    document.body.append(suggestsEl);
    console.log(suggestsEl)

    function showSuggestForQuery(query: string) {
        const inputElRect = searchInput!.getBoundingClientRect();

        suggestsEl.style.top = inputElRect.top + inputElRect.height + 'px';
        suggestsEl.style.left = inputElRect.left + 'px';

        // ===

        const matchingEntries = manifest?.filter(e => {
            return e.pageTitle.toLocaleLowerCase().includes(query);
        }) ?? [];

        suggestsEl.innerHTML = '';
        for(let i = 0; i < Math.min(20, matchingEntries.length); i++) {
            const e = matchingEntries[i]!;
            const item = document.createElement('a');
            item.classList.add('suggest-item');
            item.href = e.pageUrl;
            item.innerText = e.pageTitle;

            suggestsEl.append(item);
        }

        // ===

        suggestsEl.classList.remove('hidden');
    }

    function hideSuggest() {
        suggestsEl.classList.add('hidden');
    }

    searchInput.addEventListener('input', e => showSuggestForQuery(searchInput.value));
}


function addRandomPageLogic() {
    const randomPageLinkEl = document.querySelector('#n-randompage > a') as HTMLLinkElement | null;
    if(!randomPageLinkEl)
        return;

    
    console.log(randomPageLinkEl)
    randomPageLinkEl.href = 'javascript:void(0)';
    randomPageLinkEl.addEventListener('click', navigateToRandomPage);
    
    function randomIndex(arr: any[]): number {
        return arr.length === 0 ? -1 : Math.floor(Math.random() * arr.length);
    }
    
    function navigateToRandomPage() {
        if(!manifest || manifest.length === 0)
            return;
        
        const page = manifest[randomIndex(manifest)]!;
        window.open(page.pageUrl, "_self");
    }
}