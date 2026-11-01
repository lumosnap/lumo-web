import { defineStore } from 'pinia'

export type ChangeAction = 'favorite' | 'unfavorite' | 'comment'

interface Change {
    imageId: number
    action: ChangeAction
    notes?: string
    timestamp: number
}

export const useShareStore = defineStore('share', () => {
    const pendingChanges = ref<Change[]>([])
    const isFlushing = ref(false)
    // Sent but not yet confirmed; a concurrent feedback read may or may not include them.
    let inFlight: Change[] = []
    // Every change sent so far, in order: a feedback read replays the ones sent while it was out.
    const sent: Change[] = []
    const api = useApi()

    function addChange(imageId: number, action: ChangeAction, notes?: string) {
        // Dedup pending changes per image: keep only the latest favorite/unfavorite;
        // comments overwrite prior notes.
        if (action === 'favorite' || action === 'unfavorite') {
            // Collapse prior favorite toggles for this image into one change, except a queued unfavorite before a
            // favorite: it deleted the note on the server's favorite, so it is sent first (the server applies a batch
            // in order) or the note would come back.
            const keepUnfav = action === 'favorite' && pendingChanges.value.some(c => c.imageId === imageId && c.action === 'unfavorite')
            pendingChanges.value = pendingChanges.value.filter(c => c.imageId !== imageId || c.action === 'comment' || (keepUnfav && c.action === 'unfavorite'))
        } else if (action === 'comment') {
            const commentIndex = pendingChanges.value.findIndex(c => c.imageId === imageId && c.action === 'comment')
            if (commentIndex !== -1) {
                pendingChanges.value.splice(commentIndex, 1)
            }
        }

        pendingChanges.value.push({
            imageId,
            action,
            notes,
            timestamp: Date.now()
        })
    }

    // keepalive: the tab is being hidden or closed. That send may run beside a periodic one: the page is leaving.
    // Requests are unordered, so it leaves queued the photos the other one is still sending.
    async function flushChanges(token: string, clientName: string, keepalive = false) {
        if (isFlushing.value && !keepalive) return
        const busy = (c: Change) => inFlight.some(f => f.imageId === c.imageId)
        // Snapshot the changes we are about to send and clear the queue optimistically
        // so new user actions can accumulate independently while the request is in flight.
        const changesToSend = pendingChanges.value.filter(c => !busy(c))
        if (changesToSend.length === 0) return
        isFlushing.value = true
        pendingChanges.value = pendingChanges.value.filter(busy)
        inFlight = [...inFlight, ...changesToSend]
        sent.push(...changesToSend)

        // Format for API: remove timestamp
        const apiChanges = changesToSend.map(({ imageId, action, notes }) => ({ imageId, action, notes }))
        const { status, results } = await api.batchFavorites(token, clientName, apiChanges, keepalive)

        // Offline or a server error: the whole batch again. 4xx (404: the link was revoked, 400: a bad request)
        // would fail the same way forever: dropped. A batch that went through can still fail per item (results[i]
        // answers changes[i]): a photo no longer in the album is dropped, any other item error is sent again.
        const retry = status === 0 || status >= 500 ? changesToSend
            : status >= 400 ? []
            : changesToSend.filter((_, i) => results[i] && !results[i].success && !/not found/i.test(results[i].message ?? ''))
        if (status >= 400 && status < 500) console.error(`Dropped ${changesToSend.length} favorite change(s): HTTP ${status}`)
        // Re-queued ahead of what was queued meanwhile (original order), unless a newer change for the same photo
        // (heart vs note) replaces it: one sent since (resending would undo it), or one queued. A queued favorite
        // does not replace an unfavorite: that deleted a note, which must stay deleted.
        const kind = (c: Change) => (c.action === 'comment' ? 'comment' : 'heart')
        const same = (c: Change) => (p: Change) => p.imageId === c.imageId && kind(p) === kind(c)
        const requeue = retry.filter(c => !sent.slice(sent.indexOf(c) + 1).some(same(c))
            && (c.action === 'unfavorite' || !pendingChanges.value.some(same(c))))
        if (requeue.length) {
            pendingChanges.value = [...requeue, ...pendingChanges.value]
            console.error(`Failed to flush ${requeue.length} change(s), re-queued for retry`)
        }
        inFlight = inFlight.filter(c => !changesToSend.includes(c))
        isFlushing.value = inFlight.length > 0
    }

    // Everything the server may not reflect yet, oldest first. Overlay this on any server reload.
    function unsyncedChanges(): Change[] {
        return [...inFlight, ...pendingChanges.value]
    }
    const sentCount = () => sent.length
    const sentSince = (n: number) => sent.slice(n)

    let flushInterval: ReturnType<typeof setInterval> | null = null

    function startPeriodicFlush(token: string, clientName: string) {
        stopPeriodicFlush() // a new name or album replaces the old one
        flushInterval = setInterval(() => {
            if (pendingChanges.value.length > 0) {
                flushChanges(token, clientName)
            }
        }, 10000) // 10 seconds
    }

    function stopPeriodicFlush() {
        if (flushInterval) {
            clearInterval(flushInterval)
            flushInterval = null
        }
    }

    return {
        pendingChanges,
        addChange,
        flushChanges,
        unsyncedChanges,
        sentCount,
        sentSince,
        startPeriodicFlush,
        stopPeriodicFlush
    }
})
