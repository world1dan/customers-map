'use client'

import { useEffect, useState } from 'react'

import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { flushSync } from 'react-dom'

import { Toggle } from '@/components/ui/toggle'

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const isDark = (theme ?? resolvedTheme) === 'dark'

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted)
        return (
            <Toggle
                aria-label="Toggle dark mode"
                disabled
                size="sm"
                pressed
                className="size-10 shrink-0 rounded-full bg-transparent! p-0!"
            />
        )

    async function handleThemeChange() {
        const nextResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

        function update() {
            flushSync(() => {
                setTheme(nextResolvedTheme)
            })

            // Update theme-color meta tag to match CSS variable --background
            const background = getComputedStyle(document.documentElement)
                .getPropertyValue('--background')
                .trim()
            let themeColorMeta = document.querySelector(
                'meta[name="theme-color"]',
            ) as HTMLMetaElement | null
            if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta')
                themeColorMeta.name = 'theme-color'
                document.head.appendChild(themeColorMeta)
            }
            themeColorMeta.content = background
        }

        if (
            document.startViewTransition &&
            nextResolvedTheme !== resolvedTheme
        ) {
            document.documentElement.style.viewTransitionName =
                'theme-transition-quick'

            await document.startViewTransition(update).finished
            document.documentElement.style.viewTransitionName = ''
        } else {
            update()
        }
    }

    return (
        <Toggle
            aria-label="Toggle dark mode"
            pressed={isDark}
            onPressedChange={() => handleThemeChange()}
            size="sm"
            className="text-muted-foreground! hover:text-foreground hover:bg-secondary! size-10 shrink-0 rounded-full bg-transparent! p-0!"
        >
            {isDark ? (
                <MoonIcon className="size-5" weight="bold" />
            ) : (
                <SunIcon className="size-5" weight="bold" />
            )}
        </Toggle>
    )
}
