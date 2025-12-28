import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useUIStore, CLAUDE_MODELS } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { AgentModel } from '@/store/uiStore'

const MODEL_LABELS: Record<AgentModel, string> = {
  [CLAUDE_MODELS.HAIKU]: 'Haiku 4.5',
  [CLAUDE_MODELS.SONNET]: 'Sonnet 4.5',
  [CLAUDE_MODELS.OPUS]: 'Opus 4.5',
}

const MODEL_DESCRIPTIONS: Record<AgentModel, string> = {
  [CLAUDE_MODELS.HAIKU]: 'Fast & efficient',
  [CLAUDE_MODELS.SONNET]: 'Balanced',
  [CLAUDE_MODELS.OPUS]: 'Most capable',
}

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
          {MODEL_LABELS[selectedModel]}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {Object.values(CLAUDE_MODELS).map((model) => (
          <DropdownMenuItem
            key={model}
            onClick={() => setSelectedModel(model)}
            className="flex flex-col items-start"
          >
            <span className="font-medium">{MODEL_LABELS[model]}</span>
            <span className="text-xs text-muted-foreground">
              {MODEL_DESCRIPTIONS[model]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
