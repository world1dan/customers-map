import { useEffect, useState } from 'react'

import DottedMapComponent from 'dotted-map'
import DottedMapWithoutCountries from 'dotted-map/without-countries'
import countriesDB from 'i18n-iso-countries'

import { Skeleton } from '@/components/ui/skeleton'

import precomputedMap from './precomputed-map.json'

const DEFAULT_WORLD_REGION = {
    lat: { min: -56, max: 71 },
    lng: { min: -179, max: 179 },
}

interface DottedMapProps {
    countries: string[]
}

export const DottedMap = ({ countries }: DottedMapProps) => {
    const [fullMap, setFullMap] = useState<string | null>(null)
    const [paidCustomersMap, setPaidCustomersMap] = useState<string | null>(
        null,
    )

    useEffect(() => {
        if (countries.length === 0) {
            setFullMap(null)
            setPaidCustomersMap(null)
            return
        }

        const countriesAlpha3 = countries.map(
            (country) => countriesDB.alpha2ToAlpha3(country)!,
        )

        const map = new DottedMapWithoutCountries({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            map: precomputedMap,
        })

        setFullMap(
            map.getSVG({
                radius: 0.25,
                color: 'color-mix(in oklab, var(--foreground) 35%, transparent)',
                shape: 'circle',
                backgroundColor: 'transparent',
            }),
        )

        if (countriesAlpha3.length === 0) {
            return
        }

        const map2 = new DottedMapComponent({
            height: 38,
            grid: 'diagonal',
            countries: countriesAlpha3.filter(
                (c) => c !== 'HKG' && c !== 'TWN' && c !== 'PYF',
            ),
            region: DEFAULT_WORLD_REGION,
        })

        setPaidCustomersMap(
            map2.getSVG({
                radius: 0.35,
                color: 'var(--primary)',
                shape: 'circle',
                backgroundColor: 'transparent',
            }),
        )
    }, [countries])

    if (fullMap === null || paidCustomersMap === null) {
        return <Skeleton className="h-[20em] w-full" />
    }

    return (
        <div className="relative h-[20em] w-full">
            <div
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: fullMap }}
            />
            <div
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: paidCustomersMap }}
                className="absolute top-0 left-0"
            />
        </div>
    )
}
