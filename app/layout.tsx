import type { Metadata } from 'next'
import { Geist_Mono, Noto_Color_Emoji } from 'next/font/google'

import { Analytics } from '@vercel/analytics/next'

import './globals.css'

import { ThemeProvider } from 'next-themes'

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

const NotoColorEmoji = Noto_Color_Emoji({
    variable: '--font-noto-color-emoji',
    subsets: ['emoji'],
    weight: '400',
})

export const metadata: Metadata = {
    title: 'Polar Customers Map',
    description:
        'Visualize all your paying customers across the world on a beautiful map.',
    metadataBase: process.env.NEXT_PUBLIC_URL,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link
                    rel="icon"
                    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'%3E%3Ctext y='52' font-size='56'%3E🗺️%3C/text%3E%3C/svg%3E"
                    type="image/svg+xml"
                />
            </head>
            <body
                className={`${geistMono.variable} ${NotoColorEmoji.variable} antialiased`}
                style={{
                    fontFamily: `${geistMono.style.fontFamily}, ${NotoColorEmoji.style.fontFamily}`,
                }}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    )
}
