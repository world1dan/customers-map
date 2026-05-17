import type { Browser, LaunchOptions } from 'puppeteer-core'
import { ms } from './perf'

const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
    : 'https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar'

const BASE_LAUNCH_ARGS = [
    '--disable-web-security',
    '--autoplay-policy=user-gesture-required',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-sync',
    '--hide-scrollbars',
    '--ignore-gpu-blacklist',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain',
]

// Module-level cache — survives across warm Vercel invocations.
let cachedExecutablePath: string | null = null
let downloadPromise: Promise<string> | null = null

async function getChromiumPath(): Promise<string> {
    if (cachedExecutablePath) {
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

/**
 * Launches a Puppeteer browser, using a bundled Chromium on Vercel and the
 * locally installed browser in development.
 */
export async function launchBrowser(): Promise<Browser> {
    const isVercel = !!process.env.VERCEL_ENV

    const baseLaunchOptions: LaunchOptions = {
        headless: true,
        args: BASE_LAUNCH_ARGS,
    }

    let puppeteer: any
    let launchOptions: LaunchOptions

    if (isVercel) {
        const chromium = (await import('@sparticuz/chromium-min')).default
        puppeteer = await import('puppeteer-core')

        const chromiumStart = performance.now()
        const executablePath = await getChromiumPath()
        console.log(`[puppeteer] Chromium path ready in ${ms(chromiumStart)}`)

        launchOptions = {
            ...baseLaunchOptions,
            args: chromium.args,
            executablePath,
        }
    } else {
        puppeteer = await import('puppeteer')
        launchOptions = baseLaunchOptions
    }

    const launchStart = performance.now()
    const browser = await puppeteer.launch(launchOptions)
    console.log(`[puppeteer] Browser launched in ${ms(launchStart)}`)

    return browser
}
