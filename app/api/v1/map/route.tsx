import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import { analyzeOrders } from '@/lib/analyze-orders'
import { renderToStaticMarkup } from 'react-dom/server.browser'
import { mapStyles } from '@/assets/generated/map-styles'
import { Browser, LaunchOptions } from 'puppeteer-core'
import { Composition } from '@/components/composition'

const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
    : 'https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar'

let cachedExecutablePath: string | null = null
let downloadPromise: Promise<string> | null = null

function ms(start: number) {
    return `${(performance.now() - start).toFixed(1)}ms`
}

async function getChromiumPath(): Promise<string> {
    if (cachedExecutablePath) {
        console.log('[chromium] Using cached executable path')
        return cachedExecutablePath
    }

    if (!downloadPromise) {
        const chromium = (await import('@sparticuz/chromium-min')).default
        const dlStart = performance.now()
        console.log('[chromium] Starting download/resolve...')
        downloadPromise = chromium
            .executablePath(CHROMIUM_PACK_URL)
            .then((path) => {
                cachedExecutablePath = path
                console.log(`[chromium] Path resolved in ${ms(dlStart)}:`, path)
                return path
            })
            .catch((error) => {
                console.error(`[chromium] Failed after ${ms(dlStart)}:`, error)
                downloadPromise = null
                throw error
            })
    }

    return downloadPromise
}

export async function GET(request: NextRequest) {
    const requestStart = performance.now()
    console.log('[request] Handler started')

    const searchParams = request.nextUrl.searchParams
    const polarAccessToken = searchParams.get('polar_access_token')
    const organizationId = searchParams.get('organization_id')

    if (!polarAccessToken) {
        return NextResponse.json('Missing Polar access token.', { status: 400 })
    }

    if (!organizationId) {
        return NextResponse.json('Missing organization ID.', { status: 400 })
    }

    const polar = new Polar({ accessToken: polarAccessToken })

    // Fetch org info
    const orgStart = performance.now()
    const organizationInfo = await polar.organizations.get({
        id: organizationId,
    })
    console.log(`[polar] Organization fetched in ${ms(orgStart)}`)

    const limit = 100
    const fetchStart = performance.now()

    // Fetch first page to learn the total count
    const firstData = await polar.orders.list({ page: 1, limit })
    const { items, pagination } = firstData.result
    const totalCount = pagination.totalCount
    const totalPages = Math.ceil(totalCount / limit)

    console.log(
        `[polar] Orders page 1 fetched in ${ms(fetchStart)} (${items.length} items, ${items.length}/${totalCount} total)`,
    )

    // Fetch all remaining pages in parallel
    const remainingPages = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2,
    )
    const remainingResults = await Promise.all(
        remainingPages.map(async (page) => {
            const pageStart = performance.now()
            const data = await polar.orders.list({ page, limit })
            const result = data.result
            console.log(
                `[polar] Orders page ${page} fetched in ${ms(pageStart)} ` +
                    `(${result.items.length} items)`,
            )
            return result.items
        }),
    )

    const allOrders: Order[] = [items, ...remainingResults].flat()
    console.log(
        `[polar] All ${allOrders.length} orders fetched in ${ms(fetchStart)}`,
    )

    // Analyze orders
    const analyzeStart = performance.now()
    const countries = analyzeOrders(allOrders)
    console.log(
        `[analyze] Orders analyzed in ${ms(analyzeStart)} (${Object.keys(countries).length} countries)`,
    )

    // Server-side render HTML
    const ssrStart = performance.now()
    const html = renderToStaticMarkup(
        <Composition
            organizationInfo={organizationInfo}
            countries={countries}
            displayCountryRevenue={false}
            mode="server"
        />,
    )
    console.log(`[ssr] HTML rendered in ${ms(ssrStart)} (${html.length} chars)`)

    let browser: Browser | null = null

    try {
        const isVercel = !!process.env.VERCEL_ENV
        let puppeteer: any,
            launchOptions: LaunchOptions = {
                headless: true,
                args: ['--disable-web-security'],
            }

        if (isVercel) {
            const chromium = (await import('@sparticuz/chromium-min')).default
            puppeteer = await import('puppeteer-core')
            const chromiumStart = performance.now()
            const executablePath = await getChromiumPath()
            console.log(
                `[puppeteer] Chromium path ready in ${ms(chromiumStart)}`,
            )
            launchOptions = {
                ...launchOptions,
                args: chromium.args,
                executablePath,
            }
        } else {
            puppeteer = await import('puppeteer')
        }

        // Launch browser
        const launchStart = performance.now()
        browser = await puppeteer.launch(launchOptions)
        console.log(`[puppeteer] Browser launched in ${ms(launchStart)}`)

        const pageStart = performance.now()
        const page = await browser!.newPage()
        await page.setViewport({
            width: 600,
            height: 1000,
            deviceScaleFactor: 3,
        })
        console.log(
            `[puppeteer] New page + initial viewport set in ${ms(pageStart)}`,
        )

        // Set HTML content
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
                html {
                    font-family: 'Geist Mono', 'Noto Color Emoji', sans-serif;
                }
            </style>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
        </head>
        <body class="light">
            <div id="map-view-container">
            ${html}
            </div>
        </body>
    </html>`,
        )
        console.log(`[puppeteer] Page content set in ${ms(contentStart)}`)

        // Measure layout
        const layoutStart = performance.now()
        const mapViewContainer = await page.$('#map-view-container')
        const dimensions = await mapViewContainer?.boundingBox()
        console.log(
            `[puppeteer] Bounding box measured in ${ms(layoutStart)}: ` +
                `${dimensions?.width ?? '?'}x${dimensions?.height ?? '?'}`,
        )

        await page.setViewport({
            width: 600,
            height: dimensions?.height ? Math.round(dimensions.height) : 1000,
            deviceScaleFactor: 3,
        })

        // Screenshot
        const screenshotStart = performance.now()
        const screenshot = await page.screenshot({ type: 'png' })
        console.log(
            `[puppeteer] Screenshot captured in ${ms(screenshotStart)} (${(screenshot as Buffer).length} bytes)`,
        )

        console.log(`[request] Total handler time: ${ms(requestStart)}`)

        return new NextResponse(screenshot as unknown as BodyInit, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': 'inline; filename="customers-map.png"',
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
