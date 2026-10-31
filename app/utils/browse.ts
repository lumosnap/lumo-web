// Shared helpers for the share page: browse-v2 grid rows and the PhotoSwipe UI.
// Kept free of Nuxt/Vue imports so scripts/browse.check.ts can run it under plain node.

export interface ManifestImage {
    id: number
    f: string
    t: string | null
    w: number
    h: number
    o: number
    c: number | null
    b: string | null
    bc: boolean
    m: string | null
    th: string | null
    g?: string[] | null // AI tag slugs from the desktop app (see tag-vocab.ts); absent/null = untagged
}

export interface ShareComment {
    clientName: string
    notes: string | null
    createdAt: string
}

export const imageUrl = (base: string, img: ManifestImage) => `${base}/${img.f}`
export const thumbUrl = (base: string, img: ManifestImage) => (img.t ? `${base}/${img.t}` : imageUrl(base, img))
export const fileName = (img: ManifestImage) => img.f.split('/').pop() || img.f

// Same breakpoints as the v1 grid: grid-cols-2 md:3 lg:4 xl:5 (Tailwind defaults).
export function columnsFor(viewportWidth: number) {
    if (viewportWidth >= 1280) return 5
    if (viewportWidth >= 1024) return 4
    if (viewportWidth >= 768) return 3
    return 2
}

export function toRows<T>(items: T[], cols: number): T[][] {
    const rows: T[][] = []
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols))
    return rows
}

// ---- Grouped browsing (moments + bursts) ----

export interface Tile { img: ManifestImage; index: number; frames?: ManifestImage[] } // index into `visible`
export type BrowseRow =
    | { type: 'header'; key: string; moment: string; label: string }
    | { type: 'images'; key: string; tiles: Tile[] }
export interface BrowseLayout {
    rows: BrowseRow[]
    visible: ManifestImage[] // flat list the main lightbox indexes (burst covers when stacked)
    rowOf: number[] // visible index -> row index
    moments: { label: string; row: number }[] // header rows, empty when the album has no moments
}

// Last capture time in a group (groups are sorted by time, nulls last). Loop, not findLast: Safari < 15.4.
function lastTime(g: ManifestImage[]) {
    for (let i = g.length - 1; i >= 0; i--) if (g[i]!.c !== null) return g[i]!.c
    return null
}

const byTime = (a: ManifestImage, b: ManifestImage) => (a.c ?? Infinity) - (b.c ?? Infinity) || a.o - b.o

// Deterministic (no Intl/locale): server and client render the same text. EXIF times are naive
// wall-clock encoded as UTC, so the UTC fields are the photographer's local time.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
function clock(ms: number) {
    const d = new Date(ms)
    const h = d.getUTCHours()
    return { t: `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}`, p: h < 12 ? 'AM' : 'PM' }
}

function momentLabel(imgs: ManifestImage[], key: string | null, showDate: boolean) {
    const count = `${imgs.length} photo${imgs.length === 1 ? '' : 's'}`
    const start = imgs[0]?.c ?? null
    if (key === null) return `More photos · ${count}`
    if (start === null) return count
    const end = lastTime(imgs)!
    const a = clock(start), b = clock(end)
    const range = a.t === b.t && a.p === b.p ? `${a.t} ${a.p}` : a.p === b.p ? `${a.t}–${b.t} ${b.p}` : `${a.t} ${a.p}–${b.t} ${b.p}`
    const d = new Date(start)
    const date = showDate ? `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ` : ''
    return `${date}${range} · ${count}`
}

// Rows for the v2 grid. Moments ordered by their first image; within a moment by capture time then
// upload order. With stackBursts a burst becomes one tile (its cover, else first frame).
// All moment ids null (every album today) -> no headers, rows identical to toRows(images, cols).
// `labels` overrides header labels (SSR head: computed from the full manifest, see browseHead).
export function buildRows(
    images: ManifestImage[],
    cols: number,
    opts: { stackBursts: boolean; eventDate?: string | null; labels?: Record<string, string> }
): BrowseLayout {
    const groups = new Map<string | null, ManifestImage[]>()
    for (const img of images) {
        const g = groups.get(img.m)
        if (g) g.push(img)
        else groups.set(img.m, [img])
    }
    const ordered = [...groups].map(([k, g]) => [k, g.sort(byTime)] as const)
        .sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : byTime(a[1][0]!, b[1][0]!)))
    const headed = ordered.some(([k]) => k !== null)

    // Show the date only when the album spans more than one day (including the event date).
    const days = new Set<string>()
    if (headed) {
        if (opts.eventDate) days.add(opts.eventDate.slice(0, 10))
        for (const [, g] of ordered) {
            const end = lastTime(g)
            if (g[0]!.c !== null) days.add(dayOf(g[0]!.c))
            if (end != null) days.add(dayOf(end))
        }
    }

    const out: BrowseLayout = { rows: [], visible: [], rowOf: [], moments: [] }
    for (const [key, g] of ordered) {
        if (headed) {
            const label = opts.labels?.[key ?? ''] ?? momentLabel(g, key, days.size > 1)
            out.moments.push({ label, row: out.rows.length })
            out.rows.push({ type: 'header', key: `m:${key}`, moment: key ?? '', label })
        }
        const stacks: ManifestImage[][] = []
        const bursts = new Map<string, ManifestImage[]>()
        for (const img of g) {
            const stack = opts.stackBursts && img.b !== null ? bursts.get(img.b) : undefined
            if (stack) { stack.push(img); continue }
            const s = [img]
            if (opts.stackBursts && img.b !== null) bursts.set(img.b, s)
            stacks.push(s)
        }
        const tiles = stacks.map((frames): Tile => {
            const img = frames.find(f => f.bc) ?? frames[0]!
            const index = out.visible.push(img) - 1
            return frames.length > 1 ? { img, index, frames } : { img, index }
        })
        for (const chunk of toRows(tiles, cols)) {
            for (const _ of chunk) out.rowOf.push(out.rows.length)
            out.rows.push({ type: 'images', key: `i:${chunk[0]!.img.id}`, tiles: chunk })
        }
    }
    return out
}

// SSR payload for v2: images behind the first n tiles (in final order, burst frames included) and
// the labels of their moments computed from the whole album, so the server-rendered first rows match
// what the full manifest renders. Tile covers come first (preload hints use the head's first images).
export function browseHead(images: ManifestImage[], n: number, eventDate: string | null) {
    const { rows } = buildRows(images, n, { stackBursts: true, eventDate })
    const covers: ManifestImage[] = []
    const extra: ManifestImage[] = []
    const labels: Record<string, string> = {}
    for (const row of rows) {
        if (covers.length >= n) break
        if (row.type === 'header') { labels[row.moment] = row.label; continue }
        for (const t of row.tiles.slice(0, n - covers.length)) {
            covers.push(t.img)
            extra.push(...(t.frames ?? []).filter(f => f !== t.img))
        }
    }
    return { images: [...covers, ...extra], labels }
}

// ---- Sets (photographer-defined groups) ----

export interface ManifestSet { id: string; name: string; cover: number | null; ids: number[] }
export interface BrowseSet { id: string; name: string; cover: ManifestImage; count: number; ids: number[] }

// Sets as the client sees them: ids not in the manifest (still uploading) dropped, empty sets hidden,
// cover falls back to the first visible image. Order kept.
export function resolveSets(sets: ManifestSet[], images: ManifestImage[]): BrowseSet[] {
    const byId = new Map(images.map(i => [i.id, i]))
    return sets.flatMap(s => {
        const ids = [...new Set(s.ids)].filter(id => byId.has(id))
        if (!ids.length) return []
        return [{ id: s.id, name: s.name, cover: byId.get(s.cover ?? NaN) ?? byId.get(ids[0]!)!, count: ids.length, ids }]
    })
}

export function setImages(images: ManifestImage[], set: BrowseSet) {
    const ids = new Set(set.ids)
    return images.filter(i => ids.has(i.id))
}

// ---- Tags (search + chips; the vocabulary search lives in search.ts) ----

export type TagVocab = Record<string, { label: string; syn: string[] }>

// Unknown slugs (newer desktop app) -> "Title cased".
export const tagLabel = (slug: string, vocab: TagVocab) =>
    vocab[slug]?.label ?? slug.split('-').filter(Boolean).map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ')

// slug -> ids of images carrying it. Built once per manifest; filtering is then Set lookups only.
export function tagIndex(images: ManifestImage[]) {
    const idx = new Map<string, Set<number>>()
    for (const img of images) for (const slug of img.g ?? []) {
        const s = idx.get(slug)
        if (s) s.add(img.id)
        else idx.set(slug, new Set([img.id]))
    }
    return idx
}

// Search entries for createTagSearch: one per slug present in the album, known or not.
export const tagEntries = (slugs: Iterable<string>, vocab: TagVocab) =>
    [...slugs].map(slug => ({ slug, label: tagLabel(slug, vocab), syn: vocab[slug]?.syn ?? [] }))

// Ids matching every group (AND), where a group matches any of its slugs (OR). [] -> null (no filter).
export function filterIds(idx: Map<string, Set<number>>, groups: string[][]): Set<number> | null {
    if (!groups.length) return null
    const sets = groups.map(g => {
        if (g.length === 1) return idx.get(g[0]!) ?? new Set<number>()
        const u = new Set<number>()
        for (const slug of g) idx.get(slug)?.forEach(id => u.add(id))
        return u
    }).sort((a, b) => a.size - b.size)
    const out = new Set<number>()
    for (const id of sets[0]!) if (sets.every(s => s.has(id))) out.add(id)
    return out
}

// Chips: the n most frequent tags in `images` (the current scope). Active chips outside that go first,
// so they stay visible; active chips inside it keep their place (toggling never reorders).
export function topTags(images: ManifestImage[], n: number, keep: string[] = []) {
    const counts = new Map<string, number>()
    for (const img of images) for (const slug of img.g ?? []) counts.set(slug, (counts.get(slug) ?? 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([slug, count]) => ({ slug, count }))
    const extra = keep.filter(slug => !top.some(t => t.slug === slug)).map(slug => ({ slug, count: counts.get(slug) ?? 0 }))
    return { top: [...extra, ...top], counts }
}

// ?tags=a,b -> ['a', 'b'] (deduped, order kept).
export const parseTags = (v: unknown) =>
    [...new Set((typeof v === 'string' ? v : '').split(',').map(s => s.trim()).filter(Boolean))]

export interface ShareFeedback {
    favorites: number[]
    counts: Record<string, number>
    comments: Record<string, ShareComment[]>
}

export interface UnsyncedChange {
    imageId: number
    action: 'favorite' | 'unfavorite' | 'comment'
    notes?: string
}

// Server feedback + changes the server may not have applied yet (queued or in flight) = what the
// user should see. Replays changes exactly like the optimistic handlers do, so a feedback reload
// never undoes a heart or comment. Idempotent: a change the server already applied is a no-op.
export function mergeFeedback(fb: ShareFeedback, changes: UnsyncedChange[], clientName: string) {
    const favs = new Set(fb.favorites)
    const counts = new Map(Object.entries(fb.counts).map(([id, n]) => [Number(id), n]))
    const comments = new Map(Object.entries(fb.comments).map(([id, list]) => [Number(id), list]))
    for (const ch of changes) {
        const id = ch.imageId
        if (ch.action === 'comment') {
            const others = (comments.get(id) ?? []).filter(c => c.clientName !== clientName)
            comments.set(id, [...others, { clientName, notes: ch.notes ?? null, createdAt: new Date().toISOString() }])
        } else if ((ch.action === 'favorite') !== favs.has(id)) {
            if (ch.action === 'favorite') favs.add(id)
            else favs.delete(id)
            counts.set(id, Math.max(0, (counts.get(id) ?? 0) + (ch.action === 'favorite' ? 1 : -1)))
        }
    }
    return { favs, counts, comments }
}

// Builds the ShareImage shape CommentSidebar expects from manifest + feedback state.
export function toShareImage(
    img: ManifestImage,
    base: string,
    favorited: boolean,
    favoriteCount: number,
    comments: ShareComment[],
    clientName: string
) {
    const mine = comments.find(c => c.clientName === clientName)
    return {
        id: img.id,
        originalFilename: fileName(img),
        width: img.w,
        height: img.h,
        createdAt: '',
        url: imageUrl(base, img),
        thumbnailUrl: thumbUrl(base, img),
        favoriteCount,
        notesCount: comments.filter(c => c.notes?.trim()).length,
        comments,
        userFavorite: favorited ? { id: 0, notes: mine?.notes ?? null, createdAt: '' } : null
    }
}

export const PSWP_BASE_OPTIONS = {
    padding: { top: 0, bottom: 0, left: 0, right: 0 }, // Edge to edge
    bgOpacity: 0.95,
    showHideOpacity: true,
    trapFocus: false, // Allow focus on our custom modal
    doubleTapAction: false as const, // Disable default double-tap zoom - we'll use custom double-tap to favorite
    pinchToClose: true, // Keep pinch to close gesture
    arrowPrev: false, // Disable arrow navigation
    arrowNext: false, // Disable arrow navigation
    closeSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>',
    zoomSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
    preload: [4, 8] as [number, number],
}

// Repaints the custom favorite/notes buttons in the open PhotoSwipe UI.
export function renderLightboxButtons(s: { favorited: boolean; favCount: number; pending: boolean; hasNote: boolean; noteCount: number }) {
    const heartIcon = document.querySelector('.pswp-favorite-icon')
    if (heartIcon) {
        let html = ''
        if (s.favorited) {
            html = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart text-rose-500 ${s.pending ? 'animate-pulse' : ''}"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        } else {
            html = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart text-white ${s.pending ? 'animate-pulse' : ''}"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        }

        if (s.favCount > 0) {
            html += `<span class="text-xs font-bold text-white ml-1.5 shadow-sm">${s.favCount}</span>`
        }

        heartIcon.innerHTML = html

        // Add or remove pending state class to the button
        const favButton = document.querySelector('.pswp__button--favorite-button')
        if (favButton) {
            if (s.pending) {
                favButton.classList.add('opacity-70', 'cursor-wait')
            } else {
                favButton.classList.remove('opacity-70', 'cursor-wait')
            }
        }
    }

    const commentIcon = document.querySelector('.pswp-comment-icon')
    if (commentIcon) {
        let html = ''
        if (s.hasNote) {
            html = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
        } else {
            html = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square text-white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
        }

        if (s.noteCount > 0) {
            html += `<span class="text-xs font-bold text-white ml-1.5 shadow-sm">${s.noteCount}</span>`
        }

        commentIcon.innerHTML = html
    }
}
