import { defineStore } from 'pinia'
import type { PickResult } from '~/composables/useApi'
import { netOps, type PickOp } from '~/utils/picks'

// Selection-list writes, with share.ts's guarantees: queued, sent in batches (one request per list),
// re-queued on a network failure, and exposed as unsyncedOps() so a feedback reload replays them.
// Picks go out sooner than favorites (1.5 s after the last tap, not 10 s): a limit is checked on the
// server, and another device of the same person may be filling the same list.
export type FlushOutcome = { listId: string; ops: PickOp[]; result: PickResult }

export const usePicksStore = defineStore('picks', () => {
    const queue = ref<PickOp[]>([])
    let inFlight: PickOp[] = []
    let flushing: Promise<FlushOutcome[]> | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let onOutcome: ((o: FlushOutcome[]) => void) | null = null
    const api = useApi()

    function addOp(op: PickOp) {
        queue.value = [...queue.value.filter(o => !(o.listId === op.listId && o.imageId === op.imageId)), op]
    }

    // Undo of an op that has not left yet: drop it instead of sending a pick and its unpick.
    const dropOp = (listId: string, imageId: number) => {
        queue.value = queue.value.filter(o => !(o.listId === listId && o.imageId === imageId))
    }

    async function run(token: string, clientName: string): Promise<FlushOutcome[]> {
        const sending = queue.value
        queue.value = []
        inFlight = sending
        const out: FlushOutcome[] = []
        try {
            for (const listId of new Set(sending.map(o => o.listId))) {
                const ops = sending.filter(o => o.listId === listId)
                const { add, remove } = netOps(ops)
                const result = await api.pickList(token, listId, clientName, add, remove)
                // Network: back to the front of the queue, in order, ahead of anything tapped meanwhile.
                // A limit refuses the request as a whole; the unpicks in it cannot break a limit, so they go again.
                const again = result.ok ? [] : result.error === 'network' ? ops : result.error === 'limit' ? ops.filter(o => !o.add) : []
                if (again.length) queue.value = [...again.filter(o => !queue.value.some(q => q.listId === o.listId && q.imageId === o.imageId)), ...queue.value]
                inFlight = inFlight.filter(o => o.listId !== listId)
                out.push({ listId, ops, result })
            }
        } finally {
            inFlight = []
        }
        return out
    }

    // One flush at a time; a second call waits for the running one, then sends what is left.
    async function flush(token: string, clientName: string): Promise<FlushOutcome[]> {
        if (timer) { clearTimeout(timer); timer = null }
        if (flushing) await flushing.catch(() => [])
        if (!queue.value.length) return []
        flushing = run(token, clientName)
        try {
            const out = await flushing
            onOutcome?.(out)
            return out
        } finally {
            flushing = null
        }
    }

    function schedule(token: string, clientName: string) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { timer = null; flush(token, clientName) }, 1500)
    }

    const unsyncedOps = (): PickOp[] => [...inFlight, ...queue.value]

    function start(token: string, clientName: string, handler: (o: FlushOutcome[]) => void) {
        onOutcome = handler
        if (interval) return
        interval = setInterval(() => { if (queue.value.length) flush(token, clientName) }, 10000) // retry after a network failure
    }
    function stop() {
        if (interval) clearInterval(interval)
        if (timer) clearTimeout(timer)
        interval = timer = null
    }

    return { queue, addOp, dropOp, flush, schedule, unsyncedOps, start, stop }
})
