import { useEffect, useState } from 'react'

/**
 * Persist and sync a value in localStorage, with SSR safety.
 * Usage:
 *   const [value, setValue] = useLocalStorage<string | null>('my-key', null)
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    const getStoredValue = (): T => {
        if (typeof window === 'undefined') {
            return initialValue
        }
        try {
            const item = window.localStorage.getItem(key)
            return item !== null ? (JSON.parse(item) as T) : initialValue
        } catch {
            return initialValue
        }
    }

    const [storedValue, setStoredValue] = useState<T>(initialValue)

    useEffect(() => {
        setStoredValue(getStoredValue())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Save to localStorage when value changes
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue))
        } catch {}
    }, [key, storedValue])

    // Sync across tabs
    useEffect(() => {
        if (typeof window === 'undefined') return
        const handler = (event: StorageEvent) => {
            if (event.key === key) {
                setStoredValue(
                    event.newValue !== null
                        ? JSON.parse(event.newValue)
                        : initialValue,
                )
            }
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return [storedValue, setStoredValue] as const
}
