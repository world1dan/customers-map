/* eslint-disable @next/next/no-img-element */
'use client'

import { useRef } from 'react'
import Image from 'next/image'

import polarLogotypeBlack from '@/assets/polar_logotype_black.svg'
import polarLogotypeWhite from '@/assets/polar_logotype_white.svg'
import { SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { Polar } from '@polar-sh/sdk'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import type { Organization } from '@polar-sh/sdk/models/components/organization.js'

import { analyzeOrders } from '@/lib/analyze-orders'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectPolarButton, PolarTokenData } from '@/components/connect-polar'
import { ExportImageButton } from '@/components/export-image-button'
import { DottedMap } from '@/components/map'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
    const containerRef = useRef<HTMLDivElement>(null)

    const [orders, setOrders] = useLocalStorage<Order[]>('orders', [])
    const [organizationInfo, setOrganizationInfo] =
        useLocalStorage<Organization | null>('organization_info', null)

    async function onToken(token: PolarTokenData) {
        setOrganizationInfo(null)
        setOrders([])

        const accessToken = token.access_token

        const polar = new Polar({
            accessToken,
        })

        const userInfo = await polar.oauth2.userinfo()

        const organization = await polar.organizations.get({
            id: userInfo.sub,
        })

        setOrganizationInfo(organization)

        let page = 1
        const limit = 100
        let allOrders: Order[] = []
        let hasMore = true

        while (hasMore) {
            const data = await polar.orders.list({
                page,
                limit,
            })

            const result = data.result
            const orders = result.items

            allOrders = allOrders.concat(orders)

            if (orders.length === result.pagination.totalCount) {
                hasMore = false
            } else {
                page += 1
            }
        }

        setOrders(allOrders)
    }

    function onRedirect() {
        setOrganizationInfo(null)
        setOrders([])
    }

    const countries = analyzeOrders(orders)

    return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-10 p-2 pt-10 pb-20">
            <div className="flex w-full gap-2.5">
                <ThemeToggle />
                <div className="ml-auto flex gap-3.5">
                    {!organizationInfo && (
                        <ConnectPolarButton
                            onToken={onToken}
                            onRedirect={onRedirect}
                            icon={null}
                        >
                            Authenticate with Polar
                        </ConnectPolarButton>
                    )}
                    {organizationInfo && (
                        <>
                            <ConnectPolarButton
                                onToken={onToken}
                                onRedirect={onRedirect}
                                icon={
                                    <ArrowsClockwiseIcon className="h-5 w-5" />
                                }
                            >
                                Regenerate
                            </ConnectPolarButton>
                            <ExportImageButton
                                containerRef={containerRef}
                                organizationInfo={organizationInfo}
                            />
                        </>
                    )}
                </div>
            </div>
            <div className="outline-border overflow-hidden rounded-2xl shadow-2xl outline">
                <div
                    className="bg-background @container text-nowrap"
                    ref={containerRef}
                >
                    <div
                        className="bg-accent/15"
                        style={{
                            fontSize: '2.21cqw',
                        }}
                    >
                        <div className="flex items-center gap-[0.75em] px-[1.5em] py-[1.25em]">
                            {organizationInfo ? (
                                <>
                                    {organizationInfo.avatarUrl && (
                                        <img
                                            src={`/api/proxy-image?url=${organizationInfo.avatarUrl}`}
                                            className="outline-border size-[1.5em] shrink-0 rounded-full outline"
                                            alt="Organization logo"
                                        />
                                    )}
                                    <div className="flex w-full items-center gap-[0.875em]">
                                        <p>{organizationInfo.name}</p>
                                        <p className="text-foreground/70 underline underline-offset-[0.15em]">
                                            {organizationInfo.website
                                                ?.replace(/\/$/, '')
                                                .replace(/^https?:\/\//, '')}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex w-full items-center gap-[0.875em]">
                                    <Skeleton className="size-[1.5em] shrink-0 rounded-full" />
                                    <Skeleton className="h-[1.5em] w-[6em]" />
                                    <Skeleton className="h-[1.5em] w-[6em]" />
                                </div>
                            )}
                            <p className="ml-auto shrink-0">Paying Customers</p>
                        </div>
                        <Separator />
                        <DottedMap
                            countries={countries.map((c) => c.code)}
                            className="p-[1.5em]"
                        />
                        <Separator />
                        <div className="via-accent/35 bg-linear-to-bl from-transparent to-transparent p-[1.5em]">
                            {countries.length > 0 ? (
                                <ol
                                    className="grid list-decimal grid-flow-col grid-cols-4 gap-[0.65em]"
                                    style={{
                                        gridTemplateRows: `repeat(${Math.round(countries.length / 4)},1fr)`,
                                    }}
                                >
                                    {countries.map((country) => {
                                        return (
                                            <li
                                                key={country.code}
                                                className="marker:text-foreground/70 list-inside truncate text-[0.775em] text-nowrap"
                                            >
                                                <span className="mr-[0.5em] inline-block">
                                                    {country.flag}
                                                </span>
                                                {country.name}
                                            </li>
                                        )
                                    })}
                                </ol>
                            ) : (
                                <ol
                                    className="grid grid-flow-col grid-cols-4 gap-[0.65em]"
                                    style={{
                                        gridTemplateRows: `repeat(6, 1fr)`,
                                    }}
                                >
                                    {new Array(24).fill(0).map((_, i) => {
                                        return (
                                            <li key={i}>
                                                <Skeleton className="h-[1.5em]" />
                                            </li>
                                        )
                                    })}
                                </ol>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between px-[1.5em] py-[1.25em]">
                            <p className="text-foreground/70 flex w-fit items-center gap-[0.875em]">
                                Data from
                                <Image
                                    src={polarLogotypeBlack}
                                    alt="Polar Logo"
                                    data-hide-on-theme="dark"
                                    className="h-[1.25em] w-fit"
                                />
                                <Image
                                    src={polarLogotypeWhite}
                                    alt="Polar Logo"
                                    data-hide-on-theme="light"
                                    className="h-[1.25em] w-fit"
                                />
                            </p>
                            <p className="text-foreground/70 text-center underline underline-offset-[0.15em]">
                                customers-map.vercel.app
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <footer className="mt-16 flex w-full flex-wrap items-center justify-between gap-8">
                <a
                    className="text-foreground/70 flex items-center gap-2 text-sm font-medium opacity-65 transition-opacity hover:underline hover:underline-offset-4 hover:opacity-100"
                    href="https://github.com/world1dan/customers-map"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiGithub size={16} />
                    Source
                </a>
                <a
                    className="text-foreground/70 flex items-center gap-2 text-sm font-medium opacity-65 transition-opacity hover:underline hover:underline-offset-4 hover:opacity-100"
                    href="https://x.com/world1dan"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiX size={16} /> @world1dan
                </a>
            </footer>
        </div>
    )
}
