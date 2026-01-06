import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  className?: string
}

export function Header({ title, className }: HeaderProps) {
  const { toggleDrawer } = useUIStore()

  return (
    <header
      className={cn(
        'flex items-center justify-between h-12 px-3 border-b bg-[var(--chatbot-muted)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--chatbot-muted)]/60',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={toggleDrawer}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {title ? (
        <span className="text-sm font-medium truncate max-w-[180px]">
          {title}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Prophet" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold">Prophet AI - Assistant</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserAvatar />
      </div>
    </header>
  )
}
