// Tag search for browse v2: indexes the tag VOCABULARY (labels + synonyms), never the images.
// A query maps to tag slugs; browse.ts filterIds turns slugs into image ids. Loaded lazily (dynamic
// import) so minisearch stays out of the page chunk. No Nuxt/Vue or relative imports: plain node
// runs it from scripts/browse.check.ts, so entries come from browse.ts tagEntries.
import MiniSearch from 'minisearch'

const STOP = new Set(['and', 'the', 'of', 'a', 'an', 'in', 'at', 'with', 'on', 'photo', 'photos', 'pic', 'pics', 'picture', 'pictures', 'image', 'images'])
// Lowercase, drop Latin accents (décor -> decor). Only U+0300-036F: Indic vowel signs must stay.
const processTerm = (t: string) => {
    const w = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return w && !STOP.has(w) ? w : null
}
const tokenize = MiniSearch.getDefault('tokenize') as (s: string) => string[]

export function createTagSearch(entries: { slug: string; label: string; syn: string[] }[]) {
    const ms = new MiniSearch<{ id: string; label: string; syn: string; phrase: string }>({
        fields: ['label', 'syn', 'phrase'],
        processTerm,
        // Whole-word synonyms beat a word inside a multi-word phrase ("wedding" -> ceremony, not cake).
        searchOptions: { boost: { label: 2, syn: 1.5, phrase: 0.3 } },
    })
    ms.addAll(entries.map(({ slug, label, syn }) => ({
        id: slug,
        label,
        syn: [slug.replace(/-/g, ''), ...syn.filter(s => !/\s/.test(s))].join(' '),
        phrase: syn.filter(s => /\s/.test(s)).join(' '),
    })))

    // Slugs for one word, ranked; keeps the close runners-up only.
    const match = (word: string): string[] => {
        const r = ms.search(word, { fuzzy: 0.2, prefix: true })
        const best = r[0]?.score ?? 0
        return r.filter(x => x.score >= best * 0.5).slice(0, 5).map(x => x.id as string)
    }

    // Query -> slug groups for filterIds (AND across groups, OR inside). Every word matched -> one
    // group per word (AND); otherwise a single group of whatever matched (OR). [] = no filter.
    const groups = (q: string): string[][] => {
        const per = tokenize(q).map(processTerm).filter((w): w is string => !!w).map(match)
        if (!per.length) return []
        return per.every(p => p.length) ? per : [[...new Set(per.flat())]]
    }

    // Closest tag with photos in scope (looser fuzziness), for "did you mean".
    const suggest = (q: string, has: (slug: string) => boolean): string | null =>
        (ms.search(q, { fuzzy: 0.4, prefix: true }).find(x => has(x.id as string))?.id as string | undefined) ?? null

    return { match, groups, suggest }
}
export type TagSearch = ReturnType<typeof createTagSearch>
