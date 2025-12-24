import { useEffect, useState } from 'react'

import DottedMapComponent from 'dotted-map'
import DottedMapWithoutCountries from 'dotted-map/without-countries'
import countriesDB from 'i18n-iso-countries'

import { Skeleton } from '@/components/ui/skeleton'

import precomputedMap from './precomputed-map.json'

const DEFAULT_WORLD_REGION = {
    lat: { min: -56, max: 71 },
    lng: { min: -176, max: 179 },
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

        // Convert only supported countries to ISO Alpha-3 codes.
        // We must filter for countries included in https://github.com/NTag/dotted-map/blob/main/src/countries.geo.json
        // (the supported set in dotted-map), otherwise an error will be thrown.
        const countriesAlpha3 = countries
            .map((country) => countriesDB.alpha2ToAlpha3(country)!)
            .filter((country) => COUNTRIES.includes(country))

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
            countries: countriesAlpha3,
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
        <div
            className="relative h-[20em] w-full overflow-hidden"
            style={{
                maskImage: `linear-gradient(to bottom, transparent 0.2em, black 0.2em)`,
            }}
        >
            <div
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: fullMap }}
                className="-translate-x-[0.4em]"
            />
            <div
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: paidCustomersMap }}
                className="absolute top-0 left-0 -translate-x-[0.35em]"
            />
        </div>
    )
}

const COUNTRIES = [
    'AFG',
    'AGO',
    'ALB',
    'ARE',
    'ARG',
    'ARM',
    'ATA',
    'ATF',
    'AUS',
    'AUT',
    'AZE',
    'BDI',
    'BEL',
    'BEN',
    'BFA',
    'BGD',
    'BGR',
    'BHS',
    'BIH',
    'BLR',
    'BLZ',
    'BMU',
    'BOL',
    'BRA',
    'BRN',
    'BTN',
    'BWA',
    'CAF',
    'CAN',
    'CHE',
    'CHL',
    'CHN',
    'CIV',
    'CMR',
    'COD',
    'COG',
    'COL',
    'CRI',
    'CUB',
    '-99',
    'CYP',
    'CZE',
    'DEU',
    'DJI',
    'DNK',
    'DOM',
    'DZA',
    'ECU',
    'EGY',
    'ERI',
    'ESP',
    'EST',
    'ETH',
    'FIN',
    'FJI',
    'FLK',
    'FRA',
    'GAB',
    'GBR',
    'GEO',
    'GHA',
    'GIN',
    'GMB',
    'GNB',
    'GNQ',
    'GRC',
    'GRL',
    'GTM',
    'GUF',
    'GUY',
    'HND',
    'HRV',
    'HTI',
    'HUN',
    'IDN',
    'IND',
    'IRL',
    'IRN',
    'IRQ',
    'ISL',
    'ISR',
    'ITA',
    'JAM',
    'JOR',
    'JPN',
    'KAZ',
    'KEN',
    'KGZ',
    'KHM',
    'KOR',
    'CS-KM',
    'KWT',
    'LAO',
    'LBN',
    'LBR',
    'LBY',
    'LKA',
    'LSO',
    'LTU',
    'LUX',
    'LVA',
    'MAR',
    'MDA',
    'MDG',
    'MEX',
    'MKD',
    'MLI',
    'MLT',
    'MMR',
    'MNE',
    'MNG',
    'MOZ',
    'MRT',
    'MYS',
    'NAM',
    'NCL',
    'NER',
    'NGA',
    'NIC',
    'NLD',
    'NOR',
    'NPL',
    'NZL',
    'OMN',
    'PAK',
    'PAN',
    'PER',
    'PHL',
    'PNG',
    'POL',
    'PRI',
    'PRK',
    'PRT',
    'PRY',
    'QAT',
    'ROU',
    'RUS',
    'RWA',
    'ESH',
    'SAU',
    'SDN',
    'SSD',
    'SEN',
    'SLB',
    'SLE',
    'SLV',
    '-99',
    'SOM',
    'SRB',
    'SUR',
    'SVK',
    'SVN',
    'SWE',
    'SWZ',
    'SYR',
    'TCD',
    'TGO',
    'THA',
    'TJK',
    'TKM',
    'TLS',
    'TTO',
    'TUN',
    'TUR',
    'TWN',
    'TZA',
    'UGA',
    'UKR',
    'URY',
    'USA',
    'UZB',
    'VEN',
    'VNM',
    'VUT',
    'PSE',
    'YEM',
    'ZAF',
    'ZMB',
    'ZWE',
]
