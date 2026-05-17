'use client'

import { useEffect, useMemo, useRef } from 'react'

import { SiGithub } from '@icons-pack/react-simple-icons'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { Polar } from '@polar-sh/sdk'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import type { Organization } from '@polar-sh/sdk/models/components/organization.js'

import { analyzeOrders } from '@/lib/analyze-orders'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { ConnectPolarButton, PolarTokenData } from '@/components/connect-polar'
import { ExportImageButton } from '@/components/export-image-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Composition } from '@/components/composition'

const DEFAULT_DISPLAY_COUNTRY_REVENUE = false

export default function Home() {
    const containerRef = useRef<HTMLDivElement>(null)

    const [orders, setOrders] = useLocalStorage<Order[]>('orders', [])
    const [organizationInfo, setOrganizationInfo] =
        useLocalStorage<Organization | null>('organization_info', null)

    const [displayCountryRevenue, setDisplayCountryRevenue] =
        useLocalStorage<boolean>(
            'display_country_revenue',
            DEFAULT_DISPLAY_COUNTRY_REVENUE,
        )

    async function clearState() {
        setOrganizationInfo(null)
        setOrders([])
    }

    async function* onToken(
        token: PolarTokenData,
    ): AsyncGenerator<string, void, unknown> {
        clearState()

        const accessToken = token.access_token

        const polar = new Polar({
            accessToken,
        })

        yield 'Fetching Organization'

        const userInfo = await polar.oauth2.userinfo()

        const organization = await polar.organizations.get({
            id: userInfo.sub,
        })

        let page = 1
        const limit = 100
        let allOrders: Order[] = []
        let totalCount = 0
        let hasMore = true

        while (hasMore) {
            if (totalCount !== 0) {
                yield `Fetching Orders (${page}/${Math.ceil(totalCount / limit)})`
            } else {
                yield 'Fetching Orders'
            }

            const data = await polar.orders.list({
                page,
                limit,
            })

            const result = data.result
            const orders = result.items

            allOrders = allOrders.concat(orders)

            totalCount = result.pagination.totalCount

            if (allOrders.length === result.pagination.totalCount) {
                hasMore = false
            } else {
                page += 1
            }
        }

        setOrganizationInfo(organization)
        setOrders(allOrders)
    }

    function onRedirect() {
        clearState()
    }

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                clearState()
            }
        }
        document.addEventListener('keydown', onKeyDown)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    const countries = useMemo(() => analyzeOrders(orders), [orders])

    return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-4 pb-20! sm:gap-6 sm:p-2 sm:pt-8!">
            <div className="flex w-full items-end justify-end gap-3.5 max-sm:flex-col">
                <ThemeToggle />
                <div className="flex w-full items-end justify-end gap-3.5">
                    {organizationInfo && (
                        <ConnectPolarButton
                            onToken={onToken}
                            onRedirect={onRedirect}
                            disabled={!organizationInfo}
                            className="pr-5 pl-3.5"
                            icon={<ArrowsClockwiseIcon className="h-5 w-5" />}
                        >
                            Regenerate
                        </ConnectPolarButton>
                    )}
                    <ExportImageButton
                        containerRef={containerRef}
                        organizationInfo={organizationInfo}
                        disabled={!organizationInfo}
                    />
                </div>
            </div>
            <div className="outline-border overflow-hidden rounded-2xl shadow-2xl outline">
                <Composition
                    ref={containerRef}
                    organizationInfo={organizationInfo}
                    countries={countries}
                    displayCountryRevenue={displayCountryRevenue}
                    onToken={onToken}
                    onRedirect={onRedirect}
                />
            </div>
            <FieldGroup className="my-4">
                <Field orientation="horizontal">
                    <Checkbox
                        id="terms-checkbox-basic"
                        name="terms-checkbox-basic"
                        checked={displayCountryRevenue}
                        onCheckedChange={(checked) => {
                            if (checked === 'indeterminate') {
                                return
                            }

                            setDisplayCountryRevenue(checked)
                        }}
                    />
                    <FieldLabel htmlFor="terms-checkbox-basic">
                        Show revenue by country
                    </FieldLabel>
                </Field>
            </FieldGroup>
            <p className="text-foreground/70 text-sm">
                Visualize your customers around the world!
            </p>
            <p className="text-foreground/70 text-sm">
                Fetches orders from your Polar organization and highlights every
                country where you&apos;ve ever had paying customers.
            </p>
            <p className="text-foreground/70 text-sm">
                100% private &mdash; all data is fetched locally, and your
                authentication token is never stored.
            </p>
            <footer className="mt-6 flex w-full flex-wrap items-center justify-between gap-8">
                <a
                    className="text-foreground/60 flex items-center gap-2 text-sm font-medium underline underline-offset-3"
                    href="https://github.com/world1dan/customers-map"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiGithub size={16} />
                    Source
                </a>
                <a
                    className="text-foreground/60 flex items-center gap-2 text-sm font-medium underline underline-offset-3"
                    href="https://x.com/world1dan"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    by @world1dan
                </a>
            </footer>
        </div>
    )
}
