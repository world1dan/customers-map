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
            <body
                className={`${geistMono.variable} ${NotoColorEmoji.variable} antialiased`}
                style={{
                    fontFamily: `${geistMono.style.fontFamily}, "Apple Color Emoji", ${NotoColorEmoji.style.fontFamily}`,
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
