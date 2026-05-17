import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import { promises as fs } from 'fs'
import path from 'path'
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

function toBase64FontFace(
    buffer: Buffer,
    family: string,
    style: 'normal' | 'italic',
) {
    const base64 = buffer.toString('base64')
    return `
@font-face {
    font-family: '${family}';
    src: url('data:font/truetype;base64,${base64}') format('truetype');
    font-style: ${style};
    font-display: block;
}`
}

const fontsPath = path.join(process.cwd(), 'assets', 'fonts')
const fontLoadStart = performance.now()
const [notoColorEmoji, geistMonoRegular, geistMonoItalic] = await Promise.all([
    fs.readFile(path.join(fontsPath, 'NotoColorEmoji-Regular.ttf')),
    fs.readFile(path.join(fontsPath, 'GeistMono-VariableFont_wght.ttf')),
    fs.readFile(path.join(fontsPath, 'GeistMono-Italic-VariableFont_wght.ttf')),
])
console.log(`[fonts] Loaded from disk in ${ms(fontLoadStart)}`)

const fontFaceStart = performance.now()
const fontFaces = [
    toBase64FontFace(notoColorEmoji, 'Noto Color Emoji', 'normal'),
    toBase64FontFace(geistMonoRegular, 'Geist Mono', 'normal'),
    toBase64FontFace(geistMonoItalic, 'Geist Mono', 'italic'),
].join('\n')
console.log(`[fonts] Base64 encoded in ${ms(fontFaceStart)}`)

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

    // Paginate orders
    const ordersStart = performance.now()
    let page = 1
    const limit = 100
    let allOrders: Order[] = []
    let hasMore = true

    while (hasMore) {
        const pageStart = performance.now()
        const data = await polar.orders.list({ page, limit })
        const result = data.result
        allOrders = allOrders.concat(result.items)
        console.log(
            `[polar] Orders page ${page} fetched in ${ms(pageStart)} ` +
                `(${result.items.length} items, ${allOrders.length}/${result.pagination.totalCount} total)`,
        )

        if (allOrders.length === result.pagination.totalCount) {
            hasMore = false
        } else {
            page += 1
        }
    }
    console.log(
        `[polar] All ${allOrders.length} orders fetched in ${ms(ordersStart)}`,
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
            <style>${fontFaces}${mapStyles}</style>
            <style>
                html {
                    font-family: 'Geist Mono', 'Noto Color Emoji', sans-serif;
                }
            </style>
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
