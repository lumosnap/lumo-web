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
    const api = useApi()

    function addChange(imageId: number, action: ChangeAction, notes?: string) {
        // Dedup pending changes per image: keep only the latest favorite/unfavorite;
        // comments overwrite prior notes.
        const existingIndex = pendingChanges.value.findIndex(c => c.imageId === imageId && c.action !== 'comment')

        if (action === 'favorite' || action === 'unfavorite') {
            if (existingIndex !== -1) {
                // Collapse prior favorite toggles for this image into one change.
                pendingChanges.value.splice(existingIndex, 1)
            }
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

    async function flushChanges(token: string, clientName: string) {
        if (pendingChanges.value.length === 0) return
        if (isFlushing.value) return

        isFlushing.value = true
        // Snapshot the changes we are about to send and clear the queue optimistically
        // so new user actions can accumulate independently while the request is in flight.
        const changesToSend = [...pendingChanges.value]
        pendingChanges.value = []
        inFlight = changesToSend

        try {
            // Format for API: remove timestamp
            const apiChanges = changesToSend.map(({ imageId, action, notes }) => ({
                imageId,
                action,
                notes
            }))

            await api.batchFavorites(token, clientName, apiChanges)
        } catch (e) {
            // Re-queue the changes that failed to send so favorite/notes edits are not
            // lost on a flaky network. Prepend them ahead of anything queued while the
            // request was in flight so they are applied in the original order on retry.
            pendingChanges.value = [...changesToSend, ...pendingChanges.value]
            const message = e instanceof Error ? e.message : String(e)
            console.error('Failed to flush changes, re-queued for retry:', message)
        } finally {
            inFlight = []
            isFlushing.value = false
        }
    }

    // Everything the server may not reflect yet, oldest first. Overlay this on any server reload.
    function unsyncedChanges(): Change[] {
        return [...inFlight, ...pendingChanges.value]
    }

    let flushInterval: ReturnType<typeof setInterval> | null = null

    function startPeriodicFlush(token: string, clientName: string) {
        if (flushInterval) return
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
        startPeriodicFlush,
        stopPeriodicFlush
    }
})
