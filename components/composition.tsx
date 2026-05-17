import { CountryInfo } from '@/lib/analyze-orders'
import { cn } from '@/lib/utils'
import type { Organization } from '@polar-sh/sdk/models/components/organization.js'
import { ComponentProps } from 'react'
import { Separator } from '@/components/ui/separator'
import { ConnectPolarButton, PolarTokenData } from './connect-polar'
import { DottedMap as DottedMapClient } from '@/components/map'
import { Skeleton } from '@/components/ui/skeleton'
import { DottedMap as DottedMapServer } from '@/components/map-server'

export interface CompositionProps extends ComponentProps<'div'> {
    mode?: 'server' | 'client'
    organizationInfo: Organization | null
    countries: CountryInfo[]
    displayCountryRevenue: boolean
    onToken?: (token: PolarTokenData) => AsyncGenerator<string, void, unknown>
    onRedirect?: () => void
}

export function Composition({
    mode = 'client',
    organizationInfo,
    countries,
    displayCountryRevenue,
    ref,
    className,
    onToken,
    onRedirect,
    ...restProps
}: CompositionProps) {
    const colsCount = displayCountryRevenue ? 3 : 4

    return (
        <div
            className={cn('bg-background @container text-nowrap', className)}
            ref={ref}
            {...restProps}
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
                                    src={`${process.env.NEXT_PUBLIC_URL}/api/proxy-image?url=${organizationInfo.avatarUrl!}`}
                                    className="outline-border size-[1.5em] shrink-0 rounded-full outline"
                                    alt="Organization logo"
                                />
                            )}
                            <div className="flex w-full items-center gap-[0.875em]">
                                <p>{organizationInfo.name}</p>
                                {organizationInfo.website && (
                                    <a
                                        target="_blank"
                                        href={organizationInfo.website}
                                        className="text-foreground/70 underline underline-offset-[0.2em]"
                                    >
                                        {organizationInfo.website
                                            .replace(/\/$/, '')
                                            .replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </div>
                        </>
                    ) : (
                        <div
                            className={`flex w-full items-center gap-[0.875em] ${!organizationInfo && '**:animate-none'}`}
                        >
                            <Skeleton className="size-[1.5em] shrink-0 rounded-full" />
                            <Skeleton className="h-[1.5em] w-[6em]" />
                            <Skeleton className="h-[1.5em] w-[6em]" />
                        </div>
                    )}
                    <p className="ml-auto shrink-0">Paying Customers</p>
                </div>
                <Separator />
                {organizationInfo ? (
                    <div className="via-accent/40 bg-linear-to-br from-transparent to-transparent p-[1.5em]">
                        {mode === 'client' ? (
                            <DottedMapClient
                                countries={countries.map((c) => c.code)}
                            />
                        ) : (
                            <DottedMapServer
                                countries={countries.map((c) => c.code)}
                            />
                        )}
                    </div>
                ) : (
                    <div className="p-[1.5em]">
                        <div className="grid h-[20em] place-content-center">
                            <ConnectPolarButton
                                onToken={onToken}
                                onRedirect={onRedirect}
                                variant="default"
                                className="w-68"
                                icon={
                                    <img
                                        src="/polar_logomark_white.svg"
                                        alt="Polar Logo"
                                        className="mr-1 h-4 w-fit"
                                    />
                                }
                            >
                                Authenticate with Polar
                            </ConnectPolarButton>
                        </div>
                    </div>
                )}
                <Separator />
                <div className="via-accent/40 bg-linear-to-bl from-transparent to-transparent p-[1.5em]">
                    {countries.length > 0 ? (
                        <ol
                            className="grid list-decimal grid-flow-col gap-[0.65em]"
                            style={{
                                gridTemplateColumns: `repeat(${colsCount}, 1fr)`,
                                gridTemplateRows: `repeat(${Math.ceil(countries.length / colsCount)}, 1fr)`,
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
                                        {displayCountryRevenue && (
                                            <span className="text-muted-foreground! ml-[0.5em] inline-block">
                                                {Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD',
                                                    maximumFractionDigits: 0,
                                                }).format(
                                                    country.totalRevenue / 100,
                                                )}
                                            </span>
                                        )}
                                    </li>
                                )
                            })}
                        </ol>
                    ) : (
                        <ol
                            className="grid grid-flow-col grid-cols-4 gap-[0.65em]"
                            style={{
                                gridTemplateRows: `repeat(8, 1fr)`,
                            }}
                        >
                            {new Array(32).fill(0).map((_, i) => {
                                return (
                                    <li key={i}>
                                        <Skeleton
                                            className={`h-[1.5em] ${!organizationInfo && 'animate-none'}`}
                                        />
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
                        <a
                            href="https://polar.sh"
                            target="_blank"
                            className="w-[4em]"
                            rel="noopener noreferrer"
                        >
                            <img
                                src={`${process.env.NEXT_PUBLIC_URL}/polar_logotype_black.svg`}
                                alt="Polar Logo"
                                data-hide-on-theme="dark"
                                className="h-[1.25em]"
                            />
                            <img
                                src={`${process.env.NEXT_PUBLIC_URL}/polar_logotype_white.svg`}
                                alt="Polar Logo"
                                data-hide-on-theme="light"
                                className="h-[1.25em]"
                            />
                        </a>
                    </p>
                    <p className="text-foreground/70 text-center underline underline-offset-[0.2em]">
                        customers-map.vercel.app
                    </p>
                </div>
            </div>
        </div>
    )
}
