// Selection lists (the photographer asks for "300 for the main album, 40 from Haldi"): limits, per-set
// progress, the one-by-one queue and the optimistic merge. No Nuxt/Vue imports: scripts/browse.check.ts runs it.

export interface PickList {
    id: string
    name: string
    maxPicks: number | null
    deadline: number | null // unix ms
    setLimits: Array<{ setId: string; max: number }> | null
}
export interface ListFeedback { imageIds: number[]; submittedAt: number | null }
// One heart change for a list, not yet confirmed by the server.
export interface PickOp { listId: string; imageId: number; add: boolean }
interface SetLike { id: string; name: string; ids: number[] }

// Server state + unsynced changes (oldest first) = what the person should see. Idempotent: an op the
// server already applied changes nothing.
export function mergePicks(server: Iterable<number>, ops: PickOp[], listId: string) {
    const out = new Set(server)
    for (const op of ops) if (op.listId === listId) op.add ? out.add(op.imageId) : out.delete(op.imageId)
    return out
}

// Ops for one list -> the request body. The last op per image wins (pick then unpick sends nothing new:
// it sends the unpick, which is a no-op server-side when the pick never landed).
export function netOps(ops: PickOp[]) {
    const last = new Map<number, boolean>()
    for (const op of ops) last.set(op.imageId, op.add)
    const add: number[] = [], remove: number[] = []
    last.forEach((a, id) => (a ? add : remove).push(id))
    return { add, remove }
}

// Progress for each set the list limits ("Haldi 14 / 40"), in the photographer's set order.
// Limits on sets the client cannot see (empty, still uploading) are left out.
export function setProgress(list: PickList | null, sets: SetLike[], picked: Set<number>) {
    if (!list?.setLimits?.length) return []
    return list.setLimits.flatMap(({ setId, max }) => {
        const s = sets.find(x => x.id === setId)
        return s ? [{ setId, name: s.name, picked: s.ids.reduce((n, id) => n + (picked.has(id) ? 1 : 0), 0), max }] : []
    }).sort((a, b) => sets.findIndex(s => s.id === a.setId) - sets.findIndex(s => s.id === b.setId))
}

// Would picking `imageId` break a limit? null = fine. The list limit is checked first: it is the one
// the person was told about first. A photo in two limited sets is blocked by the first full one.
export type PickBlock = { scope: 'list'; name: string; max: number } | { scope: 'set'; setId: string; name: string; max: number }
export function pickBlock(list: PickList, sets: SetLike[], picked: Set<number>, imageId: number): PickBlock | null {
    if (picked.has(imageId)) return null // unpicking never breaks a limit
    if (list.maxPicks !== null && picked.size >= list.maxPicks) return { scope: 'list', name: list.name, max: list.maxPicks }
    for (const p of setProgress(list, sets, picked)) {
        if (p.picked < p.max) continue
        if (sets.find(s => s.id === p.setId)!.ids.includes(imageId)) return { scope: 'set', setId: p.setId, name: p.name, max: p.max }
    }
    return null
}
export const blockMessage = (b: PickBlock) =>
    b.scope === 'list' ? `${b.name} is full: ${b.max} of ${b.max}. Unpick one to make room.`
        : `${b.name} is full: ${b.max} of ${b.max}. Unpick a ${b.name} photo to make room.`

// One by one: the photos in scope not yet decided (picked or skipped), in scope order.
export const triageQueue = <T extends { id: number }>(scope: T[], picked: Set<number>, skipped: Set<number>) =>
    scope.filter(i => !picked.has(i.id) && !skipped.has(i.id))

// "31 Oct": the day and month the way the families write it.
export const shortDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Deadline line. Days counted up to the deadline moment, rounded up: 2.1 days left reads "3 days left".
export function deadlineInfo(deadline: number | null, now: number) {
    if (deadline === null) return null
    const left = deadline - now
    if (left <= 0) return { past: true, label: `Closed on ${shortDate(deadline)}` }
    const days = Math.ceil(left / 86_400_000)
    return { past: false, soon: days <= 2, label: days === 1 ? 'Last day' : `${days} days left` }
}

// What the person may do with a list right now. sent: submitted (read-only until the photographer
// reopens). locked: the server said 423 with no submit we know of. closed: the deadline passed; edits
// stop, sending still works.
export type ListLock = 'sent' | 'locked' | 'closed' | null
export function listLock(list: PickList, fb: ListFeedback | undefined, serverLocked: boolean, now: number): ListLock {
    if (fb?.submittedAt) return 'sent'
    if (serverLocked) return 'locked'
    if (list.deadline !== null && now >= list.deadline) return 'closed'
    return null
}
