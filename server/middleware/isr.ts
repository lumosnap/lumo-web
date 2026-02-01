export default defineEventHandler(async (event) => {
    // Only cache /share/ routes
    if (!event.path.startsWith('/share/')) {
        return
    }

    // Skip if not running on Cloudflare Workers (e.g. local dev)
    if (!event.context.cloudflare) {
        return
    }

    // Cloudflare Workers caches.default
    const cache = (caches as any).default
    const url = new URL(event.node.req.url!, `https://${event.node.req.headers.host}`)

    // Check for cache hit
    const response = await cache.match(url)
    if (response) {
        return response
    }

    // If cache miss, hook into response to cache it
    const nitroApp = useNitroApp()
    nitroApp.hooks.hookOnce('beforeResponse', async (event, { body }) => {
        // Only cache successful responses
        if (event.node.res.statusCode !== 200) {
            return
        }

        // Create a clone of the response to store in cache
        const response = new Response(body as BodyInit, {
            headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                'Cache-Control': 'public, max-age=60', // Browser cache
            }
        })

        // Cache for 1 hour (ISR)
        response.headers.append('Cache-Control', 's-maxage=3600')

        // Use waitUntil to not block the response
        event.context.cloudflare.waitUntil(
            cache.put(url, response)
        )
    })
})
