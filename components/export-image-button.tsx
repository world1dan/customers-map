import { useState } from 'react'

import { ExportIcon, SpinnerIcon } from '@phosphor-icons/react'
import { Organization } from '@polar-sh/sdk/models/components/organization.js'
import save from 'file-saver'
import { createContext, domToBlob } from 'modern-screenshot'

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

        setIsPending(true)

        try {
            const context = await createContext(containerRef.current, {
                scale: 3,
                autoDestruct: true,
                type: `image/png`,
                style: { overflow: 'hidden' },
                debug: true,
            })

            const blob = await domToBlob(context)

            save(blob, `polar-customers-map-${organizationInfo.slug}.png`)
        } catch (error) {
            console.error(error)
        }

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
