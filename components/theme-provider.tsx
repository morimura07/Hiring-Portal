'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// next-themes' exported props type doesn't reliably surface `children` under this
// React types setup, so we add it explicitly and forward via createElement (whose
// children arg is typed independently of the component's props).
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  children?: React.ReactNode
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return React.createElement(NextThemesProvider, props, children)
}
