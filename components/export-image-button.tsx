import { useState } from 'react'

import { ExportIcon, SpinnerIcon } from '@phosphor-icons/react'
import { Organization } from '@polar-sh/sdk/models/components/organization.js'
import save from 'file-saver'
import { createContext, domToBlob } from 'modern-screenshot'

import { Button } from '@/components/ui/button'

const WORKER_URL = new URL('modern-screenshot/dist/worker.js', import.meta.url)
    .href

export function ExportImageButton({
    containerRef,
    organizationInfo,
}: {
    containerRef: React.RefObject<HTMLDivElement | null>
    organizationInfo: Organization | null
}) {
    const [isPending, setIsPending] = useState(false)

    async function exportImage() {
        if (!containerRef.current || !organizationInfo) {
            return
        }

        setIsPending(true)

        const context = await createContext(containerRef.current, {
            scale: 3,
            autoDestruct: true,
            workerNumber: 1,
            type: `image/png`,
            style: { overflow: 'hidden' },
            workerUrl: WORKER_URL,
        })

        const blob = await domToBlob(context)

        save(blob, `polar-customers-map-${organizationInfo.slug}.png`)

        setIsPending(false)
    }
    return (
        <Button
            className="shrink-0 rounded-full"
            size="lg"
            onClick={exportImage}
            disabled={isPending}
        >
            {isPending ? (
                <SpinnerIcon className="h-5 w-5 animate-spin" />
            ) : (
                <ExportIcon className="h-5 w-5" />
            )}
            Export Image
        </Button>
    )
}
