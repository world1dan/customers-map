import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { readFileSync, writeFileSync } from 'fs'

const css = readFileSync('app/globals.css')
const result = await postcss([tailwind]).process(css, {
    from: 'app/globals.css',
})

// Write as a JS module so it's importable with a stable name
writeFileSync(
    'assets/generated/map-styles.ts',
    `export const mapStyles = ${JSON.stringify(result.css)}\n`,
)
