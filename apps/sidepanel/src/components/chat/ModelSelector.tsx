import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { MODEL_CONFIG } from '@prophet/shared'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  disabled?: boolean
  compact?: boolean
}

export function ModelSelector({ disabled, compact }: ModelSelectorProps) {
  const { selectedModel, setSelectedModel } = useUIStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 text-muted-foreground hover:text-foreground',
            compact ? 'h-6 px-2 text-xs' : 'h-7 px-2 text-xs'
          )}
          disabled={disabled}
        >
          {MODEL_CONFIG.find(model => model.id === selectedModel)?.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {MODEL_CONFIG.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className="flex flex-col items-start"
          >
            <span className="font-medium">{model.label}</span>
            <span className="text-xs text-muted-foreground">
              {model.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
