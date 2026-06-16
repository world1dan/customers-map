import type { PresentmentCurrency } from '@polar-sh/sdk/models/components/presentmentcurrency.js'

export interface ExchangeRate {
    date: string
    base: PresentmentCurrency
    quote: PresentmentCurrency
    rate: number
}

export async function getExchangeRates({
    quotes,
    from,
    to,
}: {
    quotes: PresentmentCurrency[]
    from?: Date
    to?: Date
}): Promise<ExchangeRate[]> {
    const searchParams = new URLSearchParams()

    searchParams.set('base', 'USD')
    searchParams.set('quotes', quotes.join(',').toUpperCase())

    if (from) {
        searchParams.set('from', from.toISOString().split('T')[0])
    }

    if (to) {
        searchParams.set('to', to.toISOString().split('T')[0])
    }

    const url =
        'https://api.frankfurter.dev/v2/rates?' + searchParams.toString()

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(
            `Frankfurter API error: ${response.status} ${response.statusText}`,
        )
    }

    return response.json() as Promise<ExchangeRate[]>
}
