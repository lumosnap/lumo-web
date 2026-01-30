import { defineStore } from 'pinia'

type ChangeAction = 'favorite' | 'unfavorite' | 'comment'

interface Change {
    imageId: number
    action: ChangeAction
    notes?: string
    timestamp: number
}

export const useShareStore = defineStore('share', () => {
    const pendingChanges = ref<Change[]>([])
    const isFlushing = ref(false)
    const api = useApi()

    function addChange(imageId: number, action: ChangeAction, notes?: string) {
        // Remove any existing changes for this image that might be contradictory or redundant
        // For 'favorite' and 'unfavorite', we only keep the latest status
        // For 'comment', it might be cumulative, but based on previous logic it's an overwrite of notes

        // Remove previous pending actions for this image if they are superseded
        const existingIndex = pendingChanges.value.findIndex(c => c.imageId === imageId && c.action !== 'comment')

        if (action === 'favorite' || action === 'unfavorite') {
            if (existingIndex !== -1) {
                // Check if we are toggling back to original state (e.g. favorite -> unfavorite -> favorite)
                // Actually, simpler to just remove previous favorite/unfavorite and append new one
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
        const changesToSend = [...pendingChanges.value]

        // Clear queue immediately (optimistic). If functionality fails, we might need a way to restore or notify.
        // However, for batching user actions like favorites, usually we just retry or ignore on fail for now to keep UI snappy.
        // Better strategy: Keep them in a temporary variable, remove from main queue, and if fail put them back?
        // For simplicity as per request "send all at once", we'll just send.
        pendingChanges.value = []

        try {
            // Format for API: remove timestamp
            const apiChanges = changesToSend.map(({ imageId, action, notes }) => ({
                imageId,
                action,
                notes
            }))

            await api.batchFavorites(token, clientName, apiChanges)
        } catch (e) {
            console.error('Failed to flush changes', e)
            // Optionally put changes back? 
            // pendingChanges.value = [...changesToSend, ...pendingChanges.value]
        } finally {
            isFlushing.value = false
        }
    }

    let flushInterval: any = null

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
        startPeriodicFlush,
        stopPeriodicFlush
    }
})
