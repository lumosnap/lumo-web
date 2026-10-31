import type { VectorReply, VectorRequest } from '~/workers/vectors.worker'

// One worker per page, created on the first call (client only). Calls resolve in any order; each has an id.
let worker: Worker | null = null
let seq = 0
const pending = new Map<number, (r: VectorReply) => void>()

function call(req: VectorRequest): Promise<VectorReply> {
    if (!worker) {
        worker = new Worker(new URL('../workers/vectors.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e: MessageEvent<{ id: number; reply: VectorReply; ms: number }>) => {
            if (import.meta.dev) console.debug(`vectors: ${e.data.ms.toFixed(1)} ms`)
            pending.get(e.data.id)?.(e.data.reply)
            pending.delete(e.data.id)
        }
        worker.onerror = () => { pending.forEach(r => r({ ok: false, error: 'load' })); pending.clear() }
    }
    const id = ++seq
    return new Promise(resolve => {
        pending.set(id, resolve)
        worker!.postMessage({ id, req })
    })
}

export const useVectors = () => ({
    // Warm up: fetch and parse the album's file and the tag vectors (search focus: the first results do not wait).
    // `live`: the manifest's image ids; ids the file holds beyond them (deleted photos) never come back.
    load: (url: string, live: number[]) => call({ op: 'phrase', url, live, slugs: [] }),
    similarTo: (url: string, live: number[], imageId: number, k: number, allowed?: number[]) => call({ op: 'similarTo', url, live, imageId, k, allowed }),
    nearest: (url: string, live: number[], vec: Float32Array, k: number, allowed?: number[]) => call({ op: 'nearest', url, live, vec, k, allowed }),
    phrase: (url: string, live: number[], slugs: string[], allowed?: number[], exclude?: number[]) => call({ op: 'phrase', url, live, slugs, allowed, exclude }),
})
