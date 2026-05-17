import type { Polar } from '@polar-sh/sdk'
import type { Order } from '@polar-sh/sdk/models/components/order.js'

const PAGE_LIMIT = 100

/**
 * Fetches every order for the authenticated Polar client, transparently
 * handling pagination. All pages beyond the first are fetched in parallel.
 */
export async function fetchAllOrders(polar: Polar): Promise<Order[]> {
    const firstData = await polar.orders.list({ page: 1, limit: PAGE_LIMIT })
    const { items, pagination } = firstData.result
    const totalPages = Math.ceil(pagination.totalCount / PAGE_LIMIT)

    if (totalPages <= 1) {
        return items
    }

    const remainingPages = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2,
    )
    const remainingResults = await Promise.all(
        remainingPages.map(async (page) => {
            const data = await polar.orders.list({ page, limit: PAGE_LIMIT })
            const result = data.result

            return result.items
        }),
    )

    const allOrders: Order[] = [items, ...remainingResults].flat()

    return allOrders
}
