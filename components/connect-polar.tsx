'use client'

import { ReactNode, useEffect, useState } from 'react'

import { SpinnerIcon } from '@phosphor-icons/react'

import { Button, ButtonProps } from '@/components/ui/button'

export interface PolarTokenData {
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string
    token_type: string
}

interface ConnectPolarButtonProps extends ButtonProps {
    onToken?: (token: PolarTokenData) => Promise<void>
    onRedirect?: () => void
    idleText?: string
    icon?: ReactNode
}

/**
 * Component for connecting to Polar via OAuth.
 *
 * Handles code_verifier and PKCE.
 * Calls onToken with access token data when finished.
 */
export function ConnectPolarButton({
    onToken,
    onRedirect,
    icon,
    children,
    ...restProps
}: ConnectPolarButtonProps) {
    const [loading, setLoading] = useState(false)

    async function redirectToPolarOauth(): Promise<void> {
        setLoading(true)
        const codeVerifier = generateCodeVerifier()
        localStorage.setItem('polar_oauth_code_verifier', codeVerifier)
        const codeChallenge = await generateCodeChallenge(codeVerifier)

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.NEXT_PUBLIC_POLAR_CLIENT_ID!,
            redirect_uri: getRedirectUri(),
            scope: 'openid orders:read organizations:read',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        })

        onRedirect?.()

        const redirectUrl = `https://polar.sh/oauth2/authorize?${params.toString()}`
        window.location.href = redirectUrl
        setLoading(false)
    }

    useEffect(() => {
        if (!onToken || loading) return
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (!code) return

        async function handleAuthCode() {
            setLoading(true)
            const codeVerifier = localStorage.getItem(
                'polar_oauth_code_verifier',
            )
            if (!codeVerifier) {
                alert('Missing PKCE code verifier. Please try again.')
                setLoading(false)
                return
            }
            // Prepare data for token exchange with PKCE
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code!,
                client_id: process.env.NEXT_PUBLIC_POLAR_CLIENT_ID!,
                redirect_uri: getRedirectUri(),
                code_verifier: codeVerifier,
            })

            // Exchange code for access token
            const tokenRes = await fetch(
                'https://api.polar.sh/v1/oauth2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                },
            )

            if (!tokenRes.ok) {
                setLoading(false)
                return
            }

            const tokenData: PolarTokenData = await tokenRes.json()

            // Clear verifier for security
            localStorage.removeItem('polar_oauth_code_verifier')

            // Remove code parameter from URL after handling (in-place, no reload)
            url.searchParams.delete('code')
            window.history.replaceState({}, '', url.toString())

            if (onToken) {
                await onToken(tokenData)
            }

            setLoading(false)
        }

        handleAuthCode()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onToken])

    return (
        <Button
            variant="secondary"
            size="lg"
            onClick={redirectToPolarOauth}
            type="button"
            disabled={loading}
            {...restProps}
        >
            {loading ? (
                <SpinnerIcon className="mr-1 h-4 w-4 shrink-0 animate-spin" />
            ) : (
                icon
            )}
            {children}
        </Button>
    )
}

function getRedirectUri(): string {
    return `${process.env.NEXT_PUBLIC_URL!}/`
}

// Generate code_verifier for PKCE
function generateCodeVerifier(length = 128) {
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let text = ''
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}

function base64urlencode(str: ArrayBuffer) {
    return btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(str))),
    )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

async function generateCodeChallenge(codeVerifier: string) {
    if (
        typeof window !== 'undefined' &&
        window.crypto &&
        window.crypto.subtle &&
        window.TextEncoder
    ) {
        try {
            const encoder = new TextEncoder()
            const data = encoder.encode(codeVerifier)
            const digest = await window.crypto.subtle.digest('SHA-256', data)
            return base64urlencode(digest)
        } catch (e) {
            // fallback below
        }
    }

    let fallbackSalt = ''
    for (let i = 0; i < 16; i++) {
        fallbackSalt += String.fromCharCode(Math.floor(Math.random() * 256))
    }
    const combined = codeVerifier + fallbackSalt
    const utf8 = Array.from(new TextEncoder().encode(combined))
    const base64 = btoa(String.fromCharCode.apply(null, utf8))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    return base64
}
