

export default defineEventHandler(async (event) => {
    // Run only on Cloudflare Workers
    const cf = event.context.cloudflare
    if (!cf || typeof caches === "undefined") {
        return
    }

    // Only cache /share/ routes
    if (!event.path.startsWith('/share/')) {
        return
    }

    const req = event.node.req
    if (req.method !== "GET") {
        return
    }

    // Bypass cache for revalidation requests to prevent infinite loop
    if (req.headers['x-isr-revalidate'] === 'true') {
        return
    }

    // Fix: Construct URL with host to avoid invalid URL error
    const url = new URL(req.url!, `https://${req.headers.host}`)
    // Cloudflare Workers caches.default
    const cache = (caches as any).default
    const cacheKey = new Request(url.toString(), { method: "GET" })

    const REVALIDATE_SECONDS = 60

    // Try cache
    const cached = await cache.match(cacheKey)
    if (cached) {
        const generatedAt = Number(
            cached.headers.get("x-generated-at") || "0"
        )
        const ageSeconds = (Date.now() - generatedAt) / 1000

        // Fresh
        if (ageSeconds < REVALIDATE_SECONDS) {
            return cached
        }

        // Stale: serve + background revalidate
        // Fix: cf.waitUntil is typically on the context itself in Nitro
        const waitUntil = cf.waitUntil || cf.ctx?.waitUntil
        if (waitUntil) {
            waitUntil(revalidate(cacheKey))
        }
        return cached
    }

    // Cache miss: let Nuxt render, then capture response
    captureAndCache(event, cacheKey, cf)
})

/* ---------------- internal helpers ---------------- */

function captureAndCache(event: any, cacheKey: Request, cf: any) {
    const res = event.node.res
    const originalEnd = res.end

    const chunks: Uint8Array[] = []

    res.write = function (chunk: any) {
        if (chunk) {
            chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
        }
        return true
    }

    res.end = function (chunk: any) {
        if (chunk) {
            chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
        }

        // Concatenate chunks
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
        const body = new Uint8Array(totalLength)
        let offset = 0
        for (const c of chunks) {
            body.set(c, offset)
            offset += c.length
        }

        const headers = new Headers()

        const rawHeaders = res.getHeaders()
        for (const key in rawHeaders) {
            const value = rawHeaders[key]
            if (typeof value === "string") {
                headers.set(key, value)
            }
        }

        if (
            res.statusCode === 200 &&
            !headers.has("set-cookie")
        ) {
            headers.set("Cache-Control", "public, max-age=0")
            headers.set("x-generated-at", Date.now().toString())

            const response = new Response(body, {
                status: res.statusCode,
                headers,
            })

            // Use waitUntil to cache without blocking and handle errors
            const waitUntil = cf.waitUntil || cf.ctx?.waitUntil
            if (waitUntil) {
                waitUntil(
                    (caches as any).default.put(cacheKey, response).catch((e: Error) => {
                        console.error('Cache put failed:', e)
                    })
                )
            }
        }

        return originalEnd.call(res, chunk)
    }
}

async function revalidate(cacheKey: Request) {
    try {
        // Add bypass header to prevent infinite loop
        const response = await fetch(cacheKey.url, {
            headers: { 'x-isr-revalidate': 'true' }
        })
        if (!response.ok) return

        const headers = new Headers(response.headers)
        headers.set("Cache-Control", "public, max-age=0")
        headers.set("x-generated-at", Date.now().toString())

        const cached = new Response(await response.arrayBuffer(), {
            status: response.status,
            headers,
        })

        // Cloudflare Workers caches.default
        await (caches as any).default.put(cacheKey, cached)
    } catch (e) {
        console.error('Revalidation failed:', e)
    }
}
