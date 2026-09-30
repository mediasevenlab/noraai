import { forwardRef, type ComponentType, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import { useIconPack } from '@/components/icon-pack-store'
import type { LucideIcon, LucideProps } from 'lucide-react'

import { PACK_GLYPHS, type PackGlyphProps } from './pack-glyphs'

type AnimatedIcon = ComponentType<{
  className?: string
  size?: number
  strokeWidth?: number | string
  color?: LucideProps['color']
  style?: CSSProperties
  'aria-hidden'?: LucideProps['aria-hidden']
  'aria-label'?: string
  onClick?: LucideProps['onClick']
  'data-nora-animated-icon'?: string
}>

/**
 * Lucide glyph unless another pack has a match.
 * Lucide Animated uses the vendored motion icons, and falls back to a hover scale
 * on glyphs that pack does not ship. Hugeicons uses that same hover scale on every glyph.
 */
export function packIcon<T extends LucideIcon>(
  Lucide: T,
  Animated?: AnimatedIcon,
  glyphKey?: string,
): T {
  const Packed = forwardRef<SVGSVGElement, LucideProps>(function PackedIcon(props, ref) {
    const pack = useIconPack()
    const Icon = Lucide as LucideIcon
    const Glyph = glyphKey ? PACK_GLYPHS[glyphKey]?.[pack] : undefined
    const spinning = props.className?.includes('animate-spin')
    const hoverScale = pack === 'hugeicons' && !spinning

    if (Glyph) {
      return (
        <Glyph
          aria-hidden={props['aria-hidden']}
          aria-label={props['aria-label']}
          className={cn(props.className, hoverScale && 'nora-pack-fallback')}
          color={props.color == null ? undefined : String(props.color)}
          onClick={props.onClick as PackGlyphProps['onClick']}
          size={typeof props.size === 'number' ? props.size : 24}
          strokeWidth={props.strokeWidth}
          style={props.style as CSSProperties | undefined}
        />
      )
    }

    if (pack !== 'lucide-animated') {
      return (
        <Icon
          ref={ref}
          {...props}
          className={cn(props.className, hoverScale && 'nora-pack-fallback')}
        />
      )
    }

    if (!Animated) {
      return (
        <Icon
          ref={ref}
          {...props}
          className={cn(props.className, !spinning && 'nora-pack-fallback')}
          data-nora-animated-icon=""
        />
      )
    }

    const numericSize = typeof props.size === 'number' ? props.size : undefined
    return (
      <Animated
        aria-hidden={props['aria-hidden']}
        aria-label={props['aria-label']}
        className={props.className}
        color={props.color}
        data-nora-animated-icon=""
        onClick={props.onClick}
        size={numericSize}
        strokeWidth={props.strokeWidth}
        style={props.style as CSSProperties | undefined}
      />
    )
  })

  Packed.displayName = Lucide.displayName ?? 'PackedIcon'
  return Packed as unknown as T
}
