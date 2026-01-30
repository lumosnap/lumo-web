// API composable for public routes
export function useApi() {
    const config = useRuntimeConfig()
    const baseUrl = config.public.apiBase

    async function fetchApi<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
        try {
            const response = await $fetch<any>(endpoint, {
                baseURL: baseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers as Record<string, string>,
                },
                ...options as any,
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

    // Get album by share token
    async function getAlbum(token: string, page: number = 1, clientName?: string, favoritesOnly?: boolean, limit?: number) {
        const params = new URLSearchParams()
        params.append('page', page.toString())
        if (clientName) params.append('clientName', clientName)
        if (favoritesOnly) params.append('favorites', 'true')
        if (limit) params.append('limit', limit.toString())

        return fetchApi<{
            album: {
                id: string
                title: string
                eventDate: string | null
                totalImages: number
                shareLinkToken: string
                favoritedPhotosCount: number
                ownerName: string
            }
            images: Array<{
                id: number
                originalFilename: string
                width: number
                height: number
                createdAt: string
                url: string
                thumbnailUrl: string
                favoriteCount: number
                comments: Array<{
                    clientName: string
                    notes: string | null
                    createdAt: string
                }>
                userFavorite: {
                    id: number
                    notes: string | null
                    createdAt: string
                } | null
            }>
            pagination: {
                currentPage: number
                totalPages: number
                totalImages: number
                hasNextPage: boolean
                hasPrevPage: boolean
            }
        }>(`/api/v1/share/${token}?${params.toString()}`)
    }

    // Create favorite
    async function createFavorite(token: string, imageId: number, clientName: string, notes?: string) {
        return fetchApi<{
            id: number
            albumId: string
            imageId: number
            clientName: string
            notes: string | null
            createdAt: string
        }>(`/api/v1/share/${token}/favorites`, {
            method: 'POST',
            body: JSON.stringify({ imageId, clientName, notes }),
        })
    }

    // Update favorite notes
    async function updateFavoriteNotes(token: string, favoriteId: number, clientName: string, notes: string) {
        return fetchApi<{
            id: number
            albumId: string
            imageId: number
            clientName: string
            notes: string | null
            createdAt: string
        }>(`/api/v1/share/${token}/favorites/${favoriteId}/notes`, {
            method: 'PATCH',
            body: JSON.stringify({ clientName, notes }),
        })
    }

    // Batch update favorites/comments
    async function batchFavorites(token: string, clientName: string, changes: Array<{ imageId: number; action: 'favorite' | 'unfavorite' | 'comment'; notes?: string }>) {
        return fetchApi<{
            success: boolean
            message: string
            results: Array<{
                imageId: number
                success: boolean
                message?: string
            }>
        }>(`/api/v1/share/${token}/favorites/batch`, {
            method: 'PATCH',
            body: JSON.stringify({ clientName, changes }),
        })
    }

    // Delete favorite
    async function deleteFavorite(token: string, favoriteId: number, clientName: string) {
        return fetchApi<void>(`/api/v1/share/${token}/favorites/${favoriteId}`, {
            method: 'DELETE',
            body: JSON.stringify({ clientName }),
        })
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
        getAlbum,
        createFavorite,
        deleteFavorite,
        updateFavoriteNotes,
        batchFavorites,
        getPhotographer,
        createBooking,
    }
}
