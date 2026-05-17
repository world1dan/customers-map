/**
 * Returns elapsed milliseconds since `start` as a human-readable string.
 * Intended for structured console logging: `ms(t0)` → `"123.4ms"`
 */
export function ms(start: number): string {
    return `${(performance.now() - start).toFixed(1)}ms`
}
