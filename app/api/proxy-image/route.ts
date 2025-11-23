import { NextRequest, NextResponse } from 'next/server'

const IMAGE_PROXY_ALLOWED_HOSTNAMES = ['polar-public-files.s3.amazonaws.com']

// Fixes CORS issues when exporting.
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const url = searchParams.get('url')

    if (!url) {
        return NextResponse.json(
            { error: 'Missing "url" query parameter.' },
            { status: 400 },
        )
    }

    try {
        const parsedUrl = new URL(url)

        if (!IMAGE_PROXY_ALLOWED_HOSTNAMES.includes(parsedUrl.hostname)) {
            return NextResponse.json(
                {
                    error: `Invalid domain. Only the following hostnames are allowed: ${IMAGE_PROXY_ALLOWED_HOSTNAMES.join(', ')}`,
                },
                { status: 403 },
            )
        }

        const range = req.headers.get('Range')

        const response = await fetch(parsedUrl.toString(), {
            cache: 'force-cache',
            headers: range ? { Range: range } : {},
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch the media.' },
                { status: response.status },
            )
        }

        const headers = new Headers(response.headers)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        headers.set(
            'Access-Control-Allow-Origin',
            req.headers.get('origin') || '',
        )
        headers.set('Vary', 'Origin') // To ensure proper handling of CORS requests.

        // If the Range header is present, propagate the partial content status.
        const status = response.status === 206 ? 206 : response.status

        // Pipe the response back to the client.
        const stream = new ReadableStream({
            start(controller) {
                const reader = response.body?.getReader()

                if (reader) {
                    void (async () => {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) {
                                controller.close()
                                break
                            }
                            controller.enqueue(value)
                        }
                    })()
                }
            },
        })

        return new NextResponse(stream, {
            status,
            headers,
        })
    } catch (error) {
        console.error('Error proxying media:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 },
        )
    }
}
