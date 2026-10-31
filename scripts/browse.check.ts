// Self-check for the browse-v2 row math. Run: node scripts/browse.check.ts
import assert from 'node:assert/strict'
import { andIds, joinNames, peopleByImage, queryPeople, avatarCrop, browseHead, peopleIds, resolvePeople, buildRows, columnsFor, filterIds, mergeFeedback, parseTags, resolveSets, setImages, tagEntries, tagIndex, tagLabel, toRows, topTags, type ManifestImage } from '../app/utils/browse.ts'
import { createTagSearch } from '../app/utils/search.ts'
import { TAG_VOCAB } from '../app/utils/tag-vocab.ts'
import { blockMessage, deadlineInfo, listLock, mergePicks, netOps, pickBlock, setProgress, triageQueue, type PickList } from '../app/utils/picks.ts'

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

// Tag search: vocabulary -> slugs -> image ids.
const tagged = [
    img(1, { g: ['haldi', 'bride', 'rituals'] }), img(2, { g: ['ceremony', 'couple', 'sacred-fire'] }),
    img(3, { g: ['cake', 'couple', 'reception'] }), img(4, { g: ['dance', 'friends', 'night'] }),
    img(5, { g: ['bride', 'jewellery'] }), img(6, { g: null }), img(7, { g: ['church-wedding', 'couple'] }),
    img(8, { g: ['floating-lanterns'] }), // unknown slug from a newer desktop app
]
const tidx = tagIndex(tagged)
const ts = createTagSearch(tagEntries(tidx.keys(), TAG_VOCAB))
const find = (q: string, tags: string[] = []) => {
    const r = filterIds(tidx, [...ts.groups(q), ...tags.map(t => [t])])
    return r && [...r].sort((a, b) => a - b)
}
assert.equal(ts.match('kalyanam')[0], 'ceremony') // romanised synonym
assert.equal(ts.match('turmeric')[0], 'haldi') // English synonym
assert.equal(ts.match('മഞ്ഞൾ')[0], 'haldi') // Malayalam script
assert.equal(ts.match('शादी')[0], 'ceremony') // Hindi script
assert.equal(ts.match('தாலி').length, 0) // thali not in this album: only present slugs are indexed
assert.equal(ts.match('cak')[0], 'cake') // prefix
assert.equal(ts.match('recepton')[0], 'reception') // typo (1 edit)
assert.equal(ts.match('haldhi')[0], 'haldi')
assert.ok(!ts.match('wedding').includes('cake')) // "wedding cake" phrase doesn't pull cake into "wedding"
assert.deepEqual(find('wedding'), [2, 7])
assert.deepEqual(find('kalyanam'), [2])
assert.deepEqual(find('nach'), [4])
assert.equal(find(''), null) // no filter
assert.equal(find('photos of the'), null) // stop words only
assert.deepEqual(find('lanterns'), [8]) // unknown slug searchable by its title-cased label
assert.equal(tagLabel('floating-lanterns', TAG_VOCAB), 'Floating Lanterns')
assert.equal(tagLabel('haldi', TAG_VOCAB), 'Haldi')
// AND when every word matches some tag, else OR over the words that matched.
assert.deepEqual(find('bride haldi'), [1])
assert.deepEqual(find('couple cake'), [3])
assert.deepEqual(find('bride xyzzy'), [1, 5])
assert.deepEqual(find('xyzzy'), [])
// Chips AND with each other and with the query.
assert.deepEqual(find('', ['couple']), [2, 3, 7])
assert.deepEqual(find('', ['couple', 'cake']), [3])
assert.deepEqual(find('wedding', ['sacred-fire']), [2])
assert.deepEqual(find('', ['nope']), [])
assert.equal(ts.suggest('dancce', () => true), 'dance')
assert.equal(ts.suggest('dancce', s => s !== 'dance'), null)
// Chips: most frequent in scope; active ones outside the top go first, inside it keep their place.
const tt = topTags(tagged, 2, ['night'])
assert.deepEqual(tt.top.map(t => t.slug), ['night', 'couple', 'bride'])
assert.deepEqual(topTags(tagged, 2, ['bride']).top.map(t => t.slug), ['couple', 'bride'])
assert.equal(tt.counts.get('couple'), 3)
assert.deepEqual(parseTags('a, b,,a'), ['a', 'b'])
assert.deepEqual(parseTags(undefined), [])
// Untagged album (every manifest today): empty index -> search UI hidden.
assert.equal(tagIndex(album).size, 0)
assert.equal(tagIndex(plain.map(i => ({ ...i, g: null }))).size, 0)
// Non-wedding vocab (birthday / corporate / baby / concert slugs).
const ev = createTagSearch(tagEntries(['birthday', 'naming-ceremony', 'speaker', 'baby', 'party', 'reception', 'kids', 'singer', 'performance'], TAG_VOCAB))
assert.equal(ev.match('bday')[0], 'birthday')
assert.equal(ev.match('जन्मदिन')[0], 'birthday')
assert.equal(ev.match('പിറന്നാൾ')[0], 'birthday')
assert.equal(ev.match('noolukettu')[0], 'naming-ceremony')
assert.equal(ev.match('speakers')[0], 'speaker')
assert.equal(ev.match('kunju')[0], 'baby')
assert.equal(ev.match('party')[0], 'party') // label beats reception's "party" synonym
assert.equal(ev.match('singer')[0], 'singer')
// 10k images: index + filter stay cheap.
const SL = Object.keys(TAG_VOCAB)
const tenK = Array.from({ length: 10000 }, (_, i) => img(i, { g: [SL[i % SL.length]!, SL[(i * 7) % SL.length]!, 'couple'] }))
let t1 = performance.now()
const bigIdx = tagIndex(tenK)
const bigTs = createTagSearch(tagEntries(bigIdx.keys(), TAG_VOCAB))
assert.ok(filterIds(bigIdx, [...bigTs.groups('couple wedding'), ['couple']])!.size > 0)
assert.ok(performance.now() - t1 < 200, `10k index+filter took ${performance.now() - t1}ms`)
t1 = performance.now()
for (let k = 0; k < 20; k++) filterIds(bigIdx, bigTs.groups('couple dance'))
assert.ok((performance.now() - t1) / 20 < 10)

// People: unknown ids dropped, people with no visible photo hidden, named cover keeps its box,
// fallback cover (first visible id) has none.
const ppl = resolvePeople([
    { id: 'bride', name: 'Anjali', cover: 1, box: [0.4, 0.2, 0.2, 0.16], ids: [1, 2, 3, 5, 999] },
    { id: 'nani', name: 'Nani', cover: 999, box: [0.1, 0.1, 0.1, 0.1], ids: [999, 3, 5, 3] }, // cover still uploading
    { id: 'ghost', name: 'Uploading', cover: 998, box: null, ids: [998] },
    { id: 'none', name: 'Nobody', cover: null, box: null, ids: [] },
], album)
assert.deepEqual(ppl.map(p => [p.id, p.cover.id, p.box, p.ids]), [['bride', 1, [0.4, 0.2, 0.2, 0.16], [1, 2, 3, 5]], ['nani', 3, null, [3, 5]]])
assert.deepEqual(resolvePeople([], album), []) // no people -> row hidden
// AND across people ("Anjali and Nani together"); unknown/hidden ids ignored; none -> no filter.
assert.deepEqual([...peopleIds(ppl, ['bride', 'nani'])!].sort(), [3, 5])
assert.deepEqual([...peopleIds(ppl, ['bride', 'ghost', 'zzz'])!].sort(), [1, 2, 3, 5])
assert.equal(peopleIds(ppl, ['ghost']), null)
assert.equal(peopleIds(ppl, []), null)
// Either: union ("Nani or Anjali"), same unknown-id rules.
assert.deepEqual([...peopleIds(ppl, ['bride', 'nani'], 'any')!].sort(), [1, 2, 3, 5])
assert.equal(peopleIds(ppl, ['ghost'], 'any'), null)
// Search: a word naming a person is lifted out, the rest goes to the tag search.
const named = [{ id: 'n', name: 'Nani' }, { id: 'a', name: 'Arjun Krishnamoorthy' }, { id: 'j', name: 'Joseph uncle' }, { id: 'e', name: 'Élodie' }]
assert.deepEqual(queryPeople('nani', named), { ids: ['n'], rest: '' })
assert.deepEqual(queryPeople('Nani cake', named), { ids: ['n'], rest: 'cake' })
assert.deepEqual(queryPeople('nan', named), { ids: ['n'], rest: '' }) // prefix while typing
assert.deepEqual(queryPeople('na', named), { ids: [], rest: 'na' }) // too short to guess
assert.deepEqual(queryPeople('krish and joseph uncle', named), { ids: ['a', 'j'], rest: 'and' })
assert.deepEqual(queryPeople('elodie', named), { ids: ['e'], rest: '' }) // accents folded
assert.deepEqual(queryPeople('cake dance', named), { ids: [], rest: 'cake dance' })
assert.equal(joinNames(['Anjali']), 'Anjali')
assert.equal(joinNames(['Anjali', 'Nani']), 'Anjali and Nani')
assert.equal(joinNames(['Anjali', 'Nani', 'Rahul']), 'Anjali, Nani and Rahul')
assert.equal(joinNames(['Anjali', 'Nani'], 'or'), 'Anjali or Nani')
const onImg = peopleByImage(ppl)
assert.deepEqual(onImg.get(3)?.map(p => p.id), ppl.filter(p => p.ids.includes(3)).map(p => p.id))
assert.equal(onImg.get(4242), undefined)
// Composes with tag filters.
assert.deepEqual([...andIds(new Set([2, 3, 9]), peopleIds(ppl, ['nani']))!], [3])
assert.equal(andIds(null, null), null)
assert.deepEqual([...andIds(null, new Set([4]))!], [4])
// Avatar crop: face box -> square of 1.8x its longer side around its centre, clamped to the image.
// 1600x2000, box 0.4,0.2,0.2,0.16 -> 320x320 face, side 576, centre (800, 560): left 512 of 1024 free, top 272 of 1424.
assert.deepEqual(avatarCrop([0.4, 0.2, 0.2, 0.16], 1600, 2000), { backgroundSize: '277.78% 347.22%', backgroundPosition: '50% 19.1%' })
// Face in the corner: square pinned to the edge, never past it.
assert.deepEqual(avatarCrop([0, 0, 0.1, 0.1], 1000, 1000).backgroundPosition, '0% 0%')
assert.deepEqual(avatarCrop([0.95, 0.95, 0.05, 0.05], 1000, 1000).backgroundPosition, '100% 100%')
// Face bigger than the image allows: square capped at the short side (landscape 2000x1000 -> side 1000).
assert.deepEqual(avatarCrop([0.25, 0, 0.5, 1], 2000, 1000), { backgroundSize: '200% 100%', backgroundPosition: '50% 50%' })
// Out-of-range box values are clamped; no box or bad size -> plain cover thumbnail.
assert.deepEqual(avatarCrop([-1, 2, 0.1, 0.1], 1000, 1000).backgroundPosition, '0% 100%')
assert.deepEqual(avatarCrop(null, 1600, 2000), { backgroundSize: 'cover', backgroundPosition: 'center' })
assert.deepEqual(avatarCrop([0.4, 0.2, 0.2, 0.2], 0, 0), { backgroundSize: 'cover', backgroundPosition: 'center' })

// Selection lists: limits, per-set progress, one-by-one queue, optimistic merge.
const L: PickList = { id: 'main', name: 'Main album', maxPicks: 4, deadline: null, setLimits: [{ setId: 'h', max: 2 }, { setId: 'gone', max: 9 }, { setId: 'c', max: 3 }] }
const S = [{ id: 'c', name: 'Ceremony', ids: [5, 6, 7] }, { id: 'h', name: 'Haldi', ids: [1, 2, 3] }]
// Progress in set order (Ceremony before Haldi), limits on unknown sets dropped.
assert.deepEqual(setProgress(L, S, new Set([1, 5, 9])), [{ setId: 'c', name: 'Ceremony', picked: 1, max: 3 }, { setId: 'h', name: 'Haldi', picked: 1, max: 2 }])
assert.deepEqual(setProgress({ ...L, setLimits: null }, S, new Set([1])), [])
assert.equal(pickBlock(L, S, new Set([1]), 2), null)
assert.deepEqual(pickBlock(L, S, new Set([1, 2]), 3), { scope: 'set', setId: 'h', name: 'Haldi', max: 2 })
assert.equal(pickBlock(L, S, new Set([1, 2]), 5), null) // Haldi full, Ceremony is not
assert.deepEqual(pickBlock(L, S, new Set([1, 5, 6, 9]), 7), { scope: 'list', name: 'Main album', max: 4 }) // list first
assert.equal(pickBlock(L, S, new Set([1, 2, 5, 9]), 2), null) // unpicking is always allowed
assert.equal(pickBlock({ ...L, maxPicks: null, setLimits: null }, S, new Set(Array.from({ length: 999 }, (_, i) => i)), 5000), null)
assert.equal(blockMessage({ scope: 'list', name: 'Main album', max: 300 }), 'Main album is full: 300 of 300. Unpick one to make room.')
assert.match(blockMessage({ scope: 'set', setId: 'h', name: 'Haldi', max: 40 }), /^Haldi is full: 40 of 40\./)
// Merge: queued + in-flight ops over the server list; ops of other lists ignored; idempotent.
const ops = [{ listId: 'main', imageId: 2, add: true }, { listId: 'main', imageId: 1, add: false }, { listId: 'x', imageId: 7, add: true }, { listId: 'main', imageId: 3, add: true }, { listId: 'main', imageId: 3, add: false }]
assert.deepEqual([...mergePicks([1, 4], ops, 'main')].sort(), [2, 4])
assert.deepEqual([...mergePicks([2, 4], ops, 'main')].sort(), [2, 4]) // server already has the pick
assert.deepEqual(netOps(ops.filter(o => o.listId === 'main')), { add: [2], remove: [1, 3] })
// Queue: scope order, decided photos out.
assert.deepEqual(triageQueue([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], new Set([2]), new Set([3])).map(i => i.id), [1, 4])
// Deadline: rounded up to whole days; past closes edits.
const NOW = Date.UTC(2026, 9, 28, 12)
assert.equal(deadlineInfo(null, NOW), null)
assert.equal(deadlineInfo(NOW + 2.1 * 86_400_000, NOW)!.label, '3 days left')
assert.equal(deadlineInfo(NOW + 3_600_000, NOW)!.label, 'Last day')
assert.deepEqual(deadlineInfo(Date.UTC(2026, 9, 31, 6), NOW + 4 * 86_400_000), { past: true, label: 'Closed on 31 Oct' })
assert.equal(listLock(L, { imageIds: [], submittedAt: NOW }, false, NOW), 'sent')
assert.equal(listLock(L, { imageIds: [], submittedAt: null }, true, NOW), 'locked')
assert.equal(listLock({ ...L, deadline: NOW }, undefined, false, NOW), 'closed')
assert.equal(listLock({ ...L, deadline: NOW + 1 }, undefined, false, NOW), null)

console.log('browse.check ok')
