import type { NitroFetchOptions } from 'nitropack'
import type { ChangeAction } from '~/stores/share'
import type { ManifestImage, ManifestPerson, ManifestSet, ShareFeedback } from '~/utils/browse'

export interface ShareManifest {
    v: 1
    album: { id: string; title: string; eventDate: string | null; totalImages: number; ownerName: string | null }
    base: string
    images: ManifestImage[]
    sets?: ManifestSet[] // photographer-defined groups; ids may reference images still uploading
    people?: ManifestPerson[] // named faces; same id rules as sets, box is on the cover image
    vectors?: { url: string; count: number; model: string } | null // LSV1 photo vectors (utils/vectors.ts); null = none yet
}

// API composable for public routes
export function useApi() {
    const config = useRuntimeConfig()
    const baseUrl = config.public.apiBase

    async function fetchApi<T>(
        endpoint: string,
        options: NitroFetchOptions<string> = {}
    ): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
        try {
            const response = await $fetch<{ data?: T; message?: string }>(endpoint, {
                baseURL: baseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers as Record<string, string>,
                },
                ...options,
            })

            return {
                success: true,
                data: response.data,
                message: response.message,
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.data?.message || error.message || 'Network error',
            }
        }
    }

    // Full image manifest (bare JSON body, CDN-cacheable). status 404: no such album (expired, revoked);
    // anything else (0: offline) is worth a retry.
    async function getManifest(token: string) {
        return $fetch<ShareManifest>(`/api/v1/share/${token}/manifest`, { baseURL: baseUrl }).then(
            data => ({ ok: true as const, data }),
            (e: { status?: number }) => ({ ok: false as const, status: e.status ?? 0 }))
    }

    // Browse v2: this client's favorites + all comments. Null on failure.
    async function getFeedback(token: string, clientName: string) {
        return $fetch<ShareFeedback>(`/api/v1/share/${token}/feedback`, {
            baseURL: baseUrl,
            query: { clientName },
        }).catch(() => null)
    }

    // Batch update favorites/comments. status 0: the request did not get through (offline). results[i] answers
    // changes[i]. keepalive: the request outlives the page (the tab is hidden or closed).
    async function batchFavorites(token: string, clientName: string, changes: Array<{ imageId: number; action: ChangeAction; notes?: string }>, keepalive = false) {
        try {
            const res = await fetch(`${baseUrl}/api/v1/share/${token}/favorites/batch`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientName, changes }),
                keepalive,
            })
            const body = await res.json().catch(() => null) as { results?: Array<{ imageId: number; success: boolean; message?: string }> } | null
            return { status: res.status, results: body?.results ?? [] }
        } catch {
            return { status: 0, results: [] }
        }
    }

    // Get photographer public details
    async function getPhotographer(photographerId: string) {
        return fetchApi<{
            id: string
            businessName: string
            phone: string
        }>(`/api/v1/photographer/${photographerId}`)
    }

    // Create booking for a photographer
    async function createBooking(
        photographerId: string,
        data: {
            eventType: string
            name: string
            phone: string
            eventDate: string
            location: string
            details?: string
        }
    ) {
        return fetchApi<{
            id: number
            photographerId: string
            eventType: string
            name: string
            phone: string
            eventDate: string
            location: string
            details: string | null
            createdAt: string
            updatedAt: string
        }>(`/api/v1/photographer/${photographerId}/booking`, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    return {
        getManifest,
        getFeedback,
        batchFavorites,
        getPhotographer,
        createBooking,
    }
}
