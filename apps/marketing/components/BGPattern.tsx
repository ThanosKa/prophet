'use client'

import { cn } from '@/lib/utils'

type BGVariantType = 'dots' | 'diagonal-stripes' | 'grid' | 'horizontal-lines' | 'vertical-lines' | 'checkerboard'
type BGMaskType = 'fade-center' | 'fade-edges' | 'fade-top' | 'fade-bottom' | 'fade-left' | 'fade-right' | 'fade-x' | 'fade-y' | 'none'

type BGPatternProps = React.ComponentProps<'div'> & {
  variant?: BGVariantType
  mask?: BGMaskType
  size?: number
  fill?: string
}

const maskClasses: Record<BGMaskType, string> = {
  'fade-edges': '[mask-image:radial-gradient(ellipse_at_center,black,transparent)]',
  'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,black)]',
  'fade-top': '[mask-image:linear-gradient(to_bottom,transparent,black)]',
  'fade-bottom': '[mask-image:linear-gradient(to_bottom,black,transparent)]',
  'fade-left': '[mask-image:linear-gradient(to_right,transparent,black)]',
  'fade-right': '[mask-image:linear-gradient(to_right,black,transparent)]',
  'fade-x': '[mask-image:linear-gradient(to_right,transparent,black,transparent)]',
  'fade-y': '[mask-image:linear-gradient(to_bottom,transparent,black,transparent)]',
  none: '',
}

function getBgImage(variant: BGVariantType, fill: string, size: number) {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`
    default:
      return undefined
  }
}

export function BGPattern({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = 'var(--border)',
  className,
  style,
  ...props
}: BGPatternProps) {
  const bgSize = `${size}px ${size}px`
  const backgroundImage = getBgImage(variant, fill, size)

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', maskClasses[mask], className)}
      style={{
        backgroundImage,
        backgroundSize: bgSize,
        ...style,
      }}
      {...props}
    />
  )
}
