import type { Order } from '@polar-sh/sdk/models/components/order.js'
import { OrderCustomer } from '@polar-sh/sdk/models/components/ordercustomer.js'
import countriesDB from 'i18n-iso-countries'
import enCountriesLocale from 'i18n-iso-countries/langs/en.json'
import { ExchangeRate } from './get-exchange-rates'
import { isSameDay } from 'date-fns/isSameDay'

countriesDB.registerLocale(enCountriesLocale)

export interface CountryInfo {
    code: string
    name: string
    flag: string
    totalRevenue: number
    totalCustomers: number
}

export function analyzeOrders(orders: Order[], exchangeRates: ExchangeRate[]) {
    const customers = getUniqueCustomers(orders)
    const countries = getUniqueCustomerCountries(customers)

    const countryInfo = new Map<string, CountryInfo>()

    countries.map((country) => {
        const name = countriesDB.getName(country, 'en', {
            select: 'alias',
        })

        const flag = getCountryEmoji(country)

        if (!name || !flag) {
            throw new Error('Invalid country code')
        }

        countryInfo.set(country, {
            code: country,
            name,
            flag: flag,
            totalRevenue: 0,
            totalCustomers: 0,
        })
    })

    orders.map((order) => {
        if (order.status === 'refunded' || order.status === 'pending') {
            return
        }

        const country = order.customer?.billingAddress?.country
        if (!country) {
            return
        }

        const record = countryInfo.get(country)
        if (!record) {
            return
        }

        let usdRevenue = 0

        if (order.currency === 'usd') {
            usdRevenue = order.netAmount

            if (order.status === 'partially_refunded') {
                usdRevenue -= order.refundedAmount
            }
        } else {
            const exchangeRate = exchangeRates.find(
                (rate) =>
                    rate.quote.toLowerCase() === order.currency &&
                    isSameDay(rate.date, order.createdAt),
            )

            if (exchangeRate) {
                usdRevenue = order.netAmount / exchangeRate.rate

                if (order.status === 'partially_refunded') {
                    usdRevenue -= order.refundedAmount / exchangeRate.rate
                }
            }
        }

        countryInfo.set(country, {
            ...record,
            totalRevenue: record.totalRevenue + usdRevenue,
        })
    })

    return Array.from(countryInfo.values())
        .filter((c) => c.totalRevenue > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Takes an array of OrderCustomers and returns a de-duplicated array of country codes (ISO 3166-1 alpha-2).
 * @param {OrderCustomer[]} customers
 * @returns {string[]} Array of unique country codes (uppercase, no null/empty).
 */
function getUniqueCustomerCountries(customers: OrderCustomer[]): string[] {
    const seen = new Set<string>()
    for (const customer of customers) {
        const code = (
            customer.billingAddress?.country as string | undefined
        )?.toUpperCase()
        if (code && code.length === 2) {
            seen.add(code)
        }
    }
    return Array.from(seen)
}

/**
 * Takes an array of Orders and returns a de-duplicated array of OrderCustomer objects.
 * De-duplication is based on customer id.
 * @param {Order[]} orders
 * @returns {OrderCustomer[]} Array of unique OrderCustomers
 */
function getUniqueCustomers(orders: Order[]): OrderCustomer[] {
    const seen = new Set<string>()
    const uniqueCustomers: OrderCustomer[] = []
    for (const order of orders) {
        const customer = order.customer
        if (
            customer &&
            typeof customer.id === 'string' &&
            !seen.has(customer.id)
        ) {
            seen.add(customer.id)
            uniqueCustomers.push(customer)
        }
    }
    return uniqueCustomers
}

function getCountryEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) {
        return ''
    }
    // A = 0x1F1E6, B = 0x1F1E7, etc.
    const codePoints = [...countryCode.toUpperCase()].map(
        (char) => 0x1f1e6 + char.charCodeAt(0) - 65,
    )
    return String.fromCodePoint(...codePoints)
}
