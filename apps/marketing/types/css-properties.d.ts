import 'react'

declare module 'react' {
  interface CSSProperties {
    '--shiny-width'?: string
    '--sidebar-width'?: string
    '--sidebar-width-icon'?: string
    '--skeleton-width'?: string
  }
}
