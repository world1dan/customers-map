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

// Cache the Chromium executable path to avoid re-downloading on subsequent requests
let cachedExecutablePath: string | null = null
let downloadPromise: Promise<string> | null = null

/**
 * Downloads and caches the Chromium executable path.
 * Uses a download promise to prevent concurrent downloads.
 */
async function getChromiumPath(): Promise<string> {
    // Return cached path if available
    if (cachedExecutablePath) return cachedExecutablePath

    // Prevent concurrent downloads by reusing the same promise
    if (!downloadPromise) {
        const chromium = (await import('@sparticuz/chromium-min')).default
        downloadPromise = chromium
            .executablePath(CHROMIUM_PACK_URL)
            .then((path) => {
                cachedExecutablePath = path
                console.log('Chromium path resolved:', path)
                return path
            })
            .catch((error) => {
                console.error('Failed to get Chromium path:', error)
                downloadPromise = null // Reset on error to allow retry
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
const [notoColorEmoji, geistMonoRegular, geistMonoItalic] = await Promise.all([
    fs.readFile(path.join(fontsPath, 'NotoColorEmoji-Regular.ttf')),
    fs.readFile(path.join(fontsPath, 'GeistMono-VariableFont_wght.ttf')),
    fs.readFile(path.join(fontsPath, 'GeistMono-Italic-VariableFont_wght.ttf')),
])

const fontFaces = [
    toBase64FontFace(notoColorEmoji, 'Noto Color Emoji', 'normal'),
    toBase64FontFace(geistMonoRegular, 'Geist Mono', 'normal'),
    toBase64FontFace(geistMonoItalic, 'Geist Mono', 'italic'),
].join('\n')

export async function GET(request: NextRequest) {
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

    const organizationInfo = await polar.organizations.get({
        id: organizationId,
    })

    let page = 1
    const limit = 100
    let allOrders: Order[] = []
    let hasMore = true

    while (hasMore) {
        const data = await polar.orders.list({ page, limit })
        const result = data.result
        allOrders = allOrders.concat(result.items)

        if (allOrders.length === result.pagination.totalCount) {
            hasMore = false
        } else {
            page += 1
        }
    }

    const countries = analyzeOrders(allOrders)

    const html = renderToStaticMarkup(
        <Composition
            organizationInfo={organizationInfo}
            countries={countries}
            displayCountryRevenue={false}
            mode="server"
        />,
    )

    let browser: Browser | null = null

    try {
        // Configure browser based on environment
        const isVercel = !!process.env.VERCEL_ENV
        let puppeteer: any,
            launchOptions: LaunchOptions = {
                headless: true,
                args: ['--disable-web-security'],
            }

        if (isVercel) {
            // Vercel: Use puppeteer-core with downloaded Chromium binary
            const chromium = (await import('@sparticuz/chromium-min')).default
            puppeteer = await import('puppeteer-core')
            const executablePath = await getChromiumPath()
            launchOptions = {
                ...launchOptions,
                args: chromium.args,
                executablePath,
            }
            console.log(
                'Launching browser with executable path:',
                executablePath,
            )
        } else {
            // Local: Use regular puppeteer with bundled Chromium
            puppeteer = await import('puppeteer')
        }

        // Launch browser and capture screenshot
        browser = await puppeteer.launch(launchOptions)
        const page = await browser!.newPage()
        await page.setViewport({
            width: 600,
            height: 1000,
            deviceScaleFactor: 3,
        })
        page.setContent(
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

        const mapViewContainer = await page.$('#map-view-container')

        const dimensions = await mapViewContainer?.boundingBox()

        await page.setViewport({
            width: 600,
            height: dimensions?.height ? Math.round(dimensions.height) : 1000,
            deviceScaleFactor: 3,
        })

        const screenshot = await page.screenshot({ type: 'png' })

        return new NextResponse(screenshot as unknown as BodyInit, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': 'inline; filename="customers-map.png"',
            },
        })
    } catch (error) {
        console.error('Error:', error)
        return new NextResponse('An error occurred while generating the map.', {
            status: 500,
        })
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}
