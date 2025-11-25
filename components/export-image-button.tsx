import { useState } from 'react'

import { ExportIcon, SpinnerIcon } from '@phosphor-icons/react'
import { Organization } from '@polar-sh/sdk/models/components/organization.js'
import save from 'file-saver'
import { domToBlob } from 'modern-screenshot'
import { flushSync } from 'react-dom'

import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'

export function ExportImageButton({
    containerRef,
    organizationInfo,
    className,
    disabled,
    ...restProps
}: {
    containerRef: React.RefObject<HTMLDivElement | null>
    organizationInfo: Organization | null
} & ButtonProps) {
    const [isPending, setIsPending] = useState(false)

    async function exportImage() {
        if (!containerRef.current || !organizationInfo) {
            return
        }

        // Ensure that the spinner is shown before we start the export,
        // because it causes huge lag on the main thread.
        flushSync(() => {
            setIsPending(true)
        })

        const blob = await domToBlob(containerRef.current!, {
            scale: 4,
            type: `image/png`,
            style: { overflow: 'hidden' },
        })

        save(blob, `${organizationInfo.slug}-customers-map.png`)

        setIsPending(false)
    }

    return (
        <Button
            className={cn('shrink-0 rounded-full pr-5 pl-3.5', className)}
            size="lg"
            onClick={exportImage}
            disabled={isPending || disabled}
            {...restProps}
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
