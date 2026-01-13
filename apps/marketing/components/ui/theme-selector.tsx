'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'

interface ThemeSelectorProps {
  variant?: 'dropdown' | 'submenu'
  align?: 'start' | 'center' | 'end'
}

function ThemeMenuItems() {
  const { setTheme } = useTheme()

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme('light')}>
        <Sun className="mr-2 h-4 w-4" />
        Light
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('system')}>
        <Monitor className="mr-2 h-4 w-4" />
        System
      </DropdownMenuItem>
    </>
  )
}

export function ThemeSelectorDropdown({ align = 'end' }: { align?: 'start' | 'center' | 'end' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme" suppressHydrationWarning>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeSelectorSubmenu() {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
        <span>Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <ThemeMenuItems />
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}

export function ThemeSelector({ variant = 'dropdown', align = 'end' }: ThemeSelectorProps) {
  if (variant === 'submenu') {
    return <ThemeSelectorSubmenu />
  }
  return <ThemeSelectorDropdown align={align} />
}
