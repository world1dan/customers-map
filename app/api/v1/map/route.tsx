import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { analyzeOrders } from '@/lib/analyze-orders'
import { renderToStaticMarkup } from 'react-dom/server.browser'
import { mapStyles } from '@/assets/generated/map-styles'
import { Composition } from '@/components/composition'
import { launchBrowser } from './browser'
import { fetchAllOrders } from './orders'
import { ms } from './perf'

// ── Parameter types & validation ──

type ImageFormat = 'png' | 'jpeg' | 'webp'
type ColorScheme = 'light' | 'dark'

const VALID_FORMATS = new Set<ImageFormat>(['png', 'jpeg', 'webp'])
const VALID_COLOR_SCHEMES = new Set<ColorScheme>(['light', 'dark'])
const CONTENT_TYPES: Record<ImageFormat, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
}

// ── Route handler ──

export async function GET(request: NextRequest) {
    const requestStart = performance.now()

    const searchParams = request.nextUrl.searchParams
    const polarAccessToken = searchParams.get('polar_access_token')
    const organizationId = searchParams.get('organization_id')

    if (!polarAccessToken) {
        return NextResponse.json('Missing Polar access token.', { status: 400 })
    }
    if (!organizationId) {
        return NextResponse.json('Missing organization ID.', { status: 400 })
    }

    // format
    const rawFormat = searchParams.get('format') ?? 'png'
    if (!VALID_FORMATS.has(rawFormat as ImageFormat)) {
        return NextResponse.json(
            `Invalid format "${rawFormat}". Must be one of: ${[...VALID_FORMATS].join(', ')}.`,
            { status: 400 },
        )
    }
    const format = rawFormat as ImageFormat

    // scale
    const rawScale = searchParams.get('scale')
    const scale = rawScale !== null ? Number(rawScale) : 2
    if (!Number.isFinite(scale) || scale < 1 || scale > 3) {
        return NextResponse.json(
            `Invalid scale "${rawScale}". Must be a number between 1 and 3.`,
            { status: 400 },
        )
    }
    const deviceScaleFactor = Math.round(scale) as 1 | 2 | 3

    // displayCountryRevenue
    const displayCountryRevenue =
        searchParams.get('displayCountryRevenue') === 'true'

    // colorScheme
    const rawColorScheme = searchParams.get('colorScheme') ?? 'light'
    if (!VALID_COLOR_SCHEMES.has(rawColorScheme as ColorScheme)) {
        return NextResponse.json(
            `Invalid colorScheme "${rawColorScheme}". Must be one of: ${[...VALID_COLOR_SCHEMES].join(', ')}.`,
            { status: 400 },
        )
    }
    const colorScheme = rawColorScheme as ColorScheme

    // Kick off the browser in parallel with the Polar API calls
    const browserPromise = launchBrowser()

    const polar = new Polar({ accessToken: polarAccessToken })

    // Fetch org + all orders concurrently
    const orgStart = performance.now()
    const [organizationInfo, allOrders] = await Promise.all([
        polar.organizations.get({ id: organizationId }).then((info) => {
            console.log(`[polar] Organization fetched in ${ms(orgStart)}`)
            return info
        }),
        fetchAllOrders(polar),
    ])

    const countries = analyzeOrders(allOrders)

    // HTML Rendering
    const html = renderToStaticMarkup(
        <Composition
            organizationInfo={organizationInfo}
            countries={countries}
            displayCountryRevenue={displayCountryRevenue}
            mode="server"
        />,
    )

    let browser = await browserPromise.catch(() => null)

    try {
        if (!browser) throw new Error('Browser failed to launch')

        const page = await browser.newPage()
        await page.setViewport({ width: 600, height: 1000, deviceScaleFactor })

        const contentStart = performance.now()
        await page.setContent(
            `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Customers Map</title>
        <style>${mapStyles}</style>
        <style>
            html { font-family: 'Geist Mono', 'Noto Color Emoji', sans-serif; }
        </style>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
    </head>
    <body class="${colorScheme}">
        <div id="map-view-container">${html}</div>
    </body>
</html>`,
        )
        console.log(`[puppeteer] Page content set in ${ms(contentStart)}`)

        const container = await page.$('#map-view-container')
        const dimensions = await container?.boundingBox()

        await page.setViewport({
            width: 600,
            height: dimensions?.height ? Math.round(dimensions.height) : 1000,
            deviceScaleFactor,
        })

        const screenshotStart = performance.now()
        const screenshot = await page.screenshot({
            type: format,
            optimizeForSpeed: true,
            ...(format !== 'png' && { quality: 90 }),
        })
        console.log(
            `[puppeteer] Screenshot captured in ${ms(screenshotStart)}` +
                ` (${(screenshot as Buffer).length} bytes)`,
        )

        console.log(`[request] Total time: ${ms(requestStart)}`)

        return new NextResponse(screenshot as unknown as BodyInit, {
            headers: {
                'Content-Type': CONTENT_TYPES[format],
                'Content-Disposition': `inline; filename="customers-map.${format}"`,
            },
        })
    } catch (error) {
        console.error(`[request] Failed after ${ms(requestStart)}:`, error)
        return new NextResponse('An error occurred while generating the map.', {
            status: 500,
        })
    } finally {
        if (browser) {
            const closeStart = performance.now()
            await browser.close()
            console.log(`[puppeteer] Browser closed in ${ms(closeStart)}`)
        }
    }
}
