// LSV1: the album's photo vectors (SigLIP 2, 768 dims), int8 per dimension around a shared mean.
// Also the format of public/tag-vectors.bin (one vector per tag slug, ids = index in TAG_VECTOR_SLUGS).
// Pure functions, no Nuxt/Vue: the worker and scripts/browse.check.ts both run them.
//
// Layout, little-endian, every section 4-byte aligned (typed-array views, no copies):
//   header 64 B: "LSV1" | u16 version (1) | u16 dims | u32 count | 16 B model (ASCII, NUL-padded) | 36 B reserved
//   mean dims×f32 | scale dims×f32 | ids count×u32 | codes count×dims×i8, code = round((x − mean) / scale)

export interface VectorFile {
    dims: number
    count: number
    model: string
    mean: Float32Array
    scale: Float32Array
    ids: Uint32Array
    codes: Int8Array
    row: Map<number, number> // id -> row, live photos only (see keepIds)
}

const HEADER = 64

// `live`: the manifest's image ids. The desktop does not rebuild the file when photos are only deleted, so it
// can hold ids the album no longer has: those rows are dropped from `row` and never returned or used as a query.
export function parseLSV1(buf: ArrayBuffer, live?: Iterable<number>): VectorFile {
    if (buf.byteLength < HEADER) throw new Error('LSV1: file too short')
    const v = new DataView(buf)
    const magic = String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3))
    if (magic !== 'LSV1') throw new Error('LSV1: bad magic')
    if (v.getUint16(4, true) !== 1) throw new Error('LSV1: unknown version')
    const dims = v.getUint16(6, true)
    const count = v.getUint32(8, true)
    const model = String.fromCharCode(...new Uint8Array(buf, 12, 16)).replace(/\0+$/, '')
    const idsOff = HEADER + 8 * dims
    const codesOff = idsOff + 4 * count
    if (dims === 0) throw new Error('LSV1: no dimensions')
    if (buf.byteLength < codesOff + count * dims) throw new Error('LSV1: file truncated')
    const ids = new Uint32Array(buf, idsOff, count)
    const f = {
        dims, count, model, ids, row: new Map<number, number>(),
        mean: new Float32Array(buf, HEADER, dims),
        scale: new Float32Array(buf, HEADER + 4 * dims, dims),
        codes: new Int8Array(buf, codesOff, count * dims),
    }
    if (!f.mean.every(Number.isFinite) || !f.scale.every(Number.isFinite)) throw new Error('LSV1: bad mean or scale')
    return keepIds(f, live)
}

// Restrict a parsed file to the live ids (no argument: every id in the file).
export function keepIds(f: VectorFile, live?: Iterable<number>) {
    const ok = live ? new Set(live) : null
    f.row.clear()
    f.ids.forEach((id, i) => { if (!ok || ok.has(id)) f.row.set(id, i) })
    return f
}

// Unit vectors -> LSV1 (the desktop's encoder, for the tag asset and the tests).
export function encodeLSV1(items: { id: number; vec: ArrayLike<number> }[], model: string, dims = 768): ArrayBuffer {
    const n = items.length
    const buf = new ArrayBuffer(HEADER + 8 * dims + 4 * n + n * dims)
    const v = new DataView(buf)
    'LSV1'.split('').forEach((c, i) => v.setUint8(i, c.charCodeAt(0)))
    v.setUint16(4, 1, true)
    v.setUint16(6, dims, true)
    v.setUint32(8, n, true)
    for (let i = 0; i < Math.min(16, model.length); i++) v.setUint8(12 + i, model.charCodeAt(i))
    const unit = items.map(({ vec }) => normalize(Float32Array.from(vec)))
    const mean = new Float32Array(buf, HEADER, dims)
    const scale = new Float32Array(buf, HEADER + 4 * dims, dims)
    const ids = new Uint32Array(buf, HEADER + 8 * dims, n)
    const codes = new Int8Array(buf, HEADER + 8 * dims + 4 * n, n * dims)
    for (let d = 0; d < dims; d++) {
        let s = 0
        for (const u of unit) s += u[d]!
        mean[d] = n ? s / n : 0
        let dev = 0
        for (const u of unit) dev = Math.max(dev, Math.abs(u[d]! - mean[d]!))
        scale[d] = dev > 0 ? dev / 127 : 1e-12
    }
    unit.forEach((u, i) => {
        ids[i] = items[i]!.id
        for (let d = 0; d < dims; d++) codes[i * dims + d] = Math.max(-127, Math.min(127, Math.round((u[d]! - mean[d]!) / scale[d]!)))
    })
    return buf
}

export function normalize(x: Float32Array) {
    let s = 0
    for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!
    const k = s > 0 ? 1 / Math.sqrt(s) : 0
    for (let i = 0; i < x.length; i++) x[i]! *= k
    return x
}

// Row i, decoded and made unit length again (the query for "more like this").
export function decodeRow(f: VectorFile, i: number) {
    const out = new Float32Array(f.dims)
    for (let d = 0, o = i * f.dims; d < f.dims; d++) out[d] = f.mean[d]! + f.scale[d]! * f.codes[o + d]!
    return normalize(out)
}

// score_i = q·mean + Σ_d (q_d·scale_d)·code_id: w = q⊙scale once, then one int8 dot product per row.
// `rows` limits the scan (null = all rows).
export function scoreRows(f: VectorFile, q: Float32Array, rows: Iterable<number> | null = null) {
    const { dims, codes } = f
    const w = new Float32Array(dims)
    let base = 0
    for (let d = 0; d < dims; d++) { w[d] = q[d]! * f.scale[d]!; base += q[d]! * f.mean[d]! }
    // Four running sums: shorter dependency chains, about 2x faster in V8 than one sum.
    const one = (i: number) => {
        let s0 = 0, s1 = 0, s2 = 0, s3 = 0
        const o = i * dims
        const c = codes.subarray(o, o + dims)
        let d = 0
        for (; d + 3 < dims; d += 4) {
            s0 += w[d]! * c[d]!
            s1 += w[d + 1]! * c[d + 1]!
            s2 += w[d + 2]! * c[d + 2]!
            s3 += w[d + 3]! * c[d + 3]!
        }
        for (; d < dims; d++) s0 += w[d]! * c[d]!
        return base + s0 + s1 + s2 + s3
    }
    if (rows === null) {
        const out = new Float32Array(f.count)
        for (let i = 0; i < f.count; i++) out[i] = one(i)
        return { rows: null, scores: out }
    }
    const list = Int32Array.from(rows)
    const out = new Float32Array(list.length)
    for (let k = 0; k < list.length; k++) out[k] = one(list[k]!)
    return { rows: list, scores: out }
}

// Best k ids by score, high first; `min` drops weaker ones. `allowed` = ids the caller may show (null = any).
export function nearest(f: VectorFile, q: Float32Array, k: number, allowed: Iterable<number> | null = null, min = -Infinity) {
    let rows: number[] | null = null
    if (allowed) {
        rows = []
        for (const id of allowed) { const r = f.row.get(id); if (r !== undefined) rows.push(r) }
    } else if (f.row.size < f.count) rows = [...f.row.values()]
    const s = scoreRows(f, q, rows)
    // Only the best k are sorted: the k-th best score comes from a plain numeric sort (no comparator: fast).
    const cut = Math.max(min, k > 0 && k < s.scores.length ? Float32Array.from(s.scores).sort()[s.scores.length - k]! : -Infinity)
    const order: number[] = []
    for (let k2 = 0; k2 < s.scores.length; k2++) if (s.scores[k2]! >= cut) order.push(k2)
    order.sort((a, b) => s.scores[b]! - s.scores[a]!)
    const top = order.slice(0, k)
    return {
        ids: top.map(j => f.ids[s.rows ? s.rows[j]! : j]!),
        scores: top.map(j => s.scores[j]!),
    }
}

// One query from several unit vectors (tag prompts): their mean, unit length again.
export function meanVector(vs: Float32Array[]) {
    const out = new Float32Array(vs[0]?.length ?? 0)
    for (const v of vs) for (let d = 0; d < out.length; d++) out[d]! += v[d]!
    return normalize(out)
}

// Search by meaning: photos whose score for a phrase stands out, as the desktop picks tags, but looser (they
// show under their own "looks like" line, after the tagged matches). In SigLIP logits (scale·cos + bias):
// at least MIN_LOGIT, and MARGIN above the album's mean for this phrase (some phrases score every photo high).
// The margin is the desktop's tag margin for people and things (2 logits); the floor is looser than its -6.2.
// ponytail: calibrated on the 15-photo LumoTest album only (couple, temple, stage, flowers, kids: 1 extra each;
// beach, dance, food: none; margin 1.5 gave 4 "temple" photos of 15). Retune on a bigger labelled album.
export const MEANING = { minLogit: -8.5, margin: 2, max: 60 }
// Tags SigLIP cannot tell apart (the desktop's STRICT_TAGS: haldi on any Kerala photo, thali on every bride):
// a phrase made only of these needs the desktop's near-certain bar, so it adds almost nothing by meaning.
export const STRICT_SLUGS = new Set(['thali', 'pheras', 'varmala', 'nikah', 'engagement', 'baraat', 'sangeet', 'mehendi', 'haldi',
    'sacred-fire', 'church-wedding', 'getting-ready', 'sadya', 'team-photo', 'cake-cutting', 'backstage'])
export const MEANING_STRICT = { minLogit: 1.5, margin: 4, max: 60 }
export function byMeaning(
    f: VectorFile, q: Float32Array, logit: { scale: number; bias: number },
    allowed: Set<number> | null, exclude: Set<number>, opts = MEANING,
) {
    const { scores } = scoreRows(f, q)
    let mean = 0
    for (let i = 0; i < scores.length; i++) mean += scores[i]!
    mean = scores.length ? mean / scores.length : 0
    const min = Math.max((opts.minLogit - logit.bias) / logit.scale, mean + opts.margin / logit.scale)
    const rows: number[] = []
    for (let i = 0; i < scores.length; i++) {
        const id = f.ids[i]!
        if (scores[i]! >= min && f.row.get(id) === i && !exclude.has(id) && (!allowed || allowed.has(id))) rows.push(i)
    }
    rows.sort((a, b) => scores[b]! - scores[a]!)
    const top = rows.slice(0, opts.max)
    return { ids: top.map(i => f.ids[i]!), scores: top.map(i => scores[i]!) }
}
