// Photo vectors off the main thread: "More like this" and search by meaning. Created on first use (never in SSR).
// The album's LSV1 file and the tag phrase vectors are fetched once, then kept in memory.
import { byMeaning, decodeRow, keepIds, meanVector, MEANING, MEANING_STRICT, nearest, parseLSV1, STRICT_SLUGS, type VectorFile } from '../utils/vectors'
import { LOGIT_BIAS, LOGIT_SCALE, TAG_VECTOR_SLUGS } from '../utils/tag-vector-slugs'

// `live`: the manifest's image ids (the file may still hold deleted photos). Sent when the manifest changes, then
// left out: the worker keeps the last one.
type Base = { url: string; live?: number[] }
export type VectorRequest =
    | Base & { op: 'similarTo'; imageId: number; k: number; allowed?: number[] }
    | Base & { op: 'nearest'; vec: Float32Array; k: number; allowed?: number[] }
    | Base & { op: 'phrase'; slugs: string[]; allowed?: number[]; exclude?: number[] }
export type VectorReply = { ok: true; ids: number[]; scores: number[] } | { ok: false; error: 'missing' | 'load' | 'model' }

const files = new Map<string, Promise<VectorFile>>()
const load = (url: string) => {
    let p = files.get(url)
    if (!p) {
        p = fetch(url).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))).then(parseLSV1)
        p.catch(() => files.delete(url)) // a failed fetch can be tried again
        files.set(url, p)
    }
    return p
}
const TAGS_URL = new URL('../assets/tag-vectors.bin', import.meta.url).href
let live: number[] | undefined
let liveVer = 0
const applied = new Map<string, number>() // url -> the `live` version its rows were restricted to
let albumUrl = ''

async function run(m: VectorRequest): Promise<VectorReply> {
    if (m.live) { live = m.live; liveVer++ }
    if (m.url !== albumUrl) { files.delete(albumUrl); applied.delete(albumUrl); albumUrl = m.url } // a new file (URL rotated)
    let f: VectorFile
    try { f = await load(m.url) } catch { return { ok: false, error: 'load' } }
    if (applied.get(m.url) !== liveVer) { keepIds(f, live); applied.set(m.url, liveVer) } // the manifest changed
    const allowed = m.allowed ? new Set(m.allowed) : null
    if (m.op === 'similarTo') {
        const row = f.row.get(m.imageId)
        if (row === undefined) return { ok: false, error: 'missing' } // uploaded after the file was built
        return { ok: true, ...nearest(f, decodeRow(f, row), m.k, allowed) }
    }
    if (m.op === 'nearest') return m.vec.length === f.dims ? { ok: true, ...nearest(f, m.vec, m.k, allowed) } : { ok: false, error: 'model' }
    let t: VectorFile
    try { t = await load(TAGS_URL) } catch { return { ok: false, error: 'load' } }
    if (t.model !== f.model || t.dims !== f.dims) return { ok: false, error: 'model' } // another model: no common space
    const rows = m.slugs.map(s => TAG_VECTOR_SLUGS.indexOf(s)).filter(i => i >= 0)
    if (!rows.length) return { ok: true, ids: [], scores: [] }
    const q = meanVector(rows.map(i => decodeRow(t, i)))
    const strict = m.slugs.every(sl => STRICT_SLUGS.has(sl))
    return { ok: true, ...byMeaning(f, q, { scale: LOGIT_SCALE, bias: LOGIT_BIAS }, allowed, new Set(m.exclude ?? []), strict ? MEANING_STRICT : MEANING) }
}

self.onmessage = async (e: MessageEvent<{ id: number; req: VectorRequest }>) => {
    const t0 = performance.now()
    // Every request gets a reply, or its caller would wait forever
    const reply = await run(e.data.req).catch((): VectorReply => ({ ok: false, error: 'load' }))
    self.postMessage({ id: e.data.id, reply, ms: performance.now() - t0 })
}
