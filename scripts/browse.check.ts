// Self-check for the browse-v2 row math. Run: node scripts/browse.check.ts
import assert from 'node:assert/strict'
import { browseHead, buildRows, columnsFor, mergeFeedback, resolveSets, setImages, toRows, type ManifestImage } from '../app/utils/browse.ts'

assert.deepEqual(toRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
assert.deepEqual(toRows([], 3), [])
assert.equal(toRows(Array.from({ length: 10000 }, (_, i) => i), 5).length, 2000)
assert.deepEqual([375, 768, 1024, 1279, 1280].map(columnsFor), [2, 3, 4, 4, 5])
// Feedback reload must not undo unsynced changes (queued or in flight), and must be idempotent
// for changes the server already applied.
const fb = { favorites: [1], counts: { 1: 2, 2: 1 }, comments: { 1: [{ clientName: 'me', notes: 'old', createdAt: '' }] } }
const m = mergeFeedback(fb, [
    { imageId: 2, action: 'favorite' },
    { imageId: 1, action: 'unfavorite' },
    { imageId: 3, action: 'comment', notes: 'new' },
    { imageId: 3, action: 'favorite' },
], 'me')
assert.deepEqual([...m.favs].sort(), [2, 3])
assert.deepEqual([...m.counts].sort(), [[1, 1], [2, 2], [3, 1]])
assert.equal(m.comments.get(3)?.[0]?.notes, 'new')
const again = mergeFeedback({ favorites: [2], counts: { 2: 2 }, comments: {} }, [{ imageId: 2, action: 'favorite' }], 'me')
assert.equal(again.counts.get(2), 2) // already applied server-side: no double count

// Grouped browsing
const T0 = Date.UTC(2026, 2, 14, 16, 12) // 4:12 PM naive wall-clock
const img = (id: number, x: Partial<ManifestImage> = {}): ManifestImage =>
    ({ id, f: `${id}.jpg`, t: null, w: 4, h: 5, o: id, c: null, b: null, bc: false, m: null, th: null, ...x })
const ids = (l: ReturnType<typeof buildRows>) => l.rows.map(r => (r.type === 'header' ? r.label : r.tiles.map(t => t.img.id)))

// All-null (every album today): same rows as the plain grid, no headers, visible = input.
const plain = Array.from({ length: 23 }, (_, i) => img(i))
for (const cols of [2, 5]) {
    const l = buildRows(plain, cols, { stackBursts: true })
    assert.deepEqual(l.rows.map(r => r.type === 'images' && r.tiles.map(t => t.img)), toRows(plain, cols))
    assert.deepEqual(l.visible, plain)
    assert.equal(l.moments.length, 0)
    assert.deepEqual(l.rowOf, plain.map((_, i) => Math.floor(i / cols)))
}

// Moments: ordered by first image; within a moment by c then o (upload order 9 shot first).
const min = 60_000
const album = [
    img(1, { m: 'A', c: T0 + 5 * min }), img(2, { m: 'A', c: T0 + 35 * min }), img(9, { m: 'A', c: T0 }),
    img(3, { m: 'B', c: T0 - 120 * min }), img(4, { m: 'B', c: T0 - 119 * min }),
    img(5, { m: 'A', c: T0 + 5 * min }), // same c as 1 -> o breaks the tie
]
assert.deepEqual(ids(buildRows(album, 2, { stackBursts: true })), [
    '2:12–2:13 PM · 2 photos', [3, 4],
    '4:12–4:47 PM · 4 photos', [9, 1], [5, 2],
])
// Date only when days differ (event date counts); AM/PM span; single-minute moment; null-moment bucket last.
const multi = buildRows([
    img(1, { m: 'A', c: Date.UTC(2026, 2, 14, 11, 50) }), img(2, { m: 'A', c: Date.UTC(2026, 2, 14, 12, 20) }),
    img(3, { m: 'B', c: Date.UTC(2026, 2, 15, 9, 0) }), img(4),
], 5, { stackBursts: true })
assert.deepEqual(multi.moments.map(m => m.label), ['Sat, Mar 14 · 11:50 AM–12:20 PM · 2 photos', 'Sun, Mar 15 · 9:00 AM · 1 photo', 'More photos · 1 photo'])
assert.equal(buildRows([img(1, { m: 'A', c: T0 })], 5, { stackBursts: true, eventDate: '2026-03-13' }).moments[0]!.label, 'Sat, Mar 14 · 4:12 PM · 1 photo')
assert.equal(buildRows([img(1, { m: 'A', c: T0 })], 5, { stackBursts: true, eventDate: '2026-03-14' }).moments[0]!.label, '4:12 PM · 1 photo')
assert.deepEqual(multi.moments.map(m => m.row), [0, 2, 4])

// Bursts: stacked -> one tile (cover, else first frame) carrying all frames; unstacked -> every frame.
const burst = [
    img(1, { m: 'A', c: T0 }),
    img(2, { m: 'A', c: T0 + 1000, b: 'x' }), img(3, { m: 'A', c: T0 + 1100, b: 'x', bc: true }), img(4, { m: 'A', c: T0 + 1200, b: 'x' }),
    img(5, { m: 'A', c: T0 + 2000, b: 'y' }), img(6, { m: 'A', c: T0 + 2100, b: 'y' }),
    img(7, { m: 'A', c: T0 + 3000 }),
]
const stacked = buildRows(burst, 5, { stackBursts: true })
const tiles = stacked.rows.flatMap(r => (r.type === 'images' ? r.tiles : []))
assert.deepEqual(tiles.map(t => t.img.id), [1, 3, 5, 7])
assert.deepEqual(tiles.map(t => t.frames?.map(f => f.id)), [undefined, [2, 3, 4], [5, 6], undefined])
assert.deepEqual(stacked.visible.map(i => i.id), [1, 3, 5, 7])
assert.deepEqual(tiles.map(t => t.index), [0, 1, 2, 3])
assert.equal(stacked.moments[0]!.label, '4:12 PM · 7 photos') // counts frames, not tiles
const expanded = buildRows(burst, 5, { stackBursts: false })
assert.deepEqual(expanded.visible.map(i => i.id), [1, 2, 3, 4, 5, 6, 7])
assert.ok(expanded.rows.every(r => r.type === 'header' || r.tiles.every(t => !t.frames)))

// SSR head: first n tiles from the full album + their frames; rendering the head reproduces the full first rows.
const big = [...burst, ...Array.from({ length: 30 }, (_, i) => img(100 + i, { m: 'B', c: T0 + 3600_000 + i * 1000 }))]
const head = browseHead(big, 6, null)
assert.deepEqual(head.images.slice(0, 6).map(i => i.id), [1, 3, 5, 7, 100, 101]) // covers first (preload)
const headRows = ids(buildRows(head.images, 6, { stackBursts: true, labels: head.labels }))
assert.deepEqual(headRows, ids(buildRows(big, 6, { stackBursts: true })).slice(0, 4).map((r, i) => (i === 3 ? (r as number[]).slice(0, 2) : r)))
assert.deepEqual(browseHead(plain, 15, null).images, plain.slice(0, 15)) // all-null: same as today's slice

// Sets: unknown ids (still uploading) dropped, empty/all-unknown sets hidden, cover falls back, order kept.
const sets = resolveSets([
    { id: 's1', name: 'Ceremony', cover: 999, ids: [3, 999, 1, 3] }, // unknown cover + id, duplicate
    { id: 's2', name: 'Empty', cover: null, ids: [] },
    { id: 's3', name: 'Uploading', cover: 998, ids: [998, 997] },
    { id: 's4', name: 'Portraits', cover: 4, ids: [2, 4] },
], album)
assert.deepEqual(sets.map(s => [s.id, s.count, s.cover.id]), [['s1', 2, 3], ['s4', 2, 4]])
assert.deepEqual(resolveSets([], album), [])
// Filtering keeps manifest order; grouping (moments) applies inside the set.
assert.deepEqual(setImages(album, sets[0]!).map(i => i.id), [1, 3])
assert.deepEqual(ids(buildRows(setImages(album, sets[0]!), 2, { stackBursts: true })), ['2:12 PM · 1 photo', [3], '4:17 PM · 1 photo', [1]])
// SSR head of a set reproduces that set's first rows.
const fam = resolveSets([{ id: 'f', name: 'Family', cover: null, ids: big.filter((_, i) => i % 3 === 0).map(i => i.id) }], big)[0]!
const famImgs = setImages(big, fam)
const famHead = browseHead(famImgs, 4, null)
assert.deepEqual(ids(buildRows(famHead.images, 4, { stackBursts: true, labels: famHead.labels })).slice(0, 3), ids(buildRows(famImgs, 4, { stackBursts: true })).slice(0, 3))

console.log('browse.check ok')
