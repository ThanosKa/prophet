import { useState } from 'react'
import {
  Camera,
  MousePointer,
  Type,
  Navigation,
  Image,
  ArrowUpDown,
  FileText,
  Search,
  Keyboard,
  Move,
  Loader2,
  Check,
  X,
  ChevronDown,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ToolCall, ToolName } from '@prophet/shared'

interface ToolCallCollapsibleProps {
  toolCall: ToolCall
  isExecuting?: boolean
}

const toolIcons: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  take_snapshot: Camera,
  click_element_by_uid: MousePointer,
  fill_element_by_uid: Type,
  navigate: Navigation,
  take_screenshot: Image,
  scroll_page: ArrowUpDown,
  get_page_content: FileText,
  search_snapshot: Search,
  press_key: Keyboard,
  hover_element_by_uid: Move,
}

const toolLabels: Record<ToolName, string> = {
  take_snapshot: 'Snapshot',
  click_element_by_uid: 'Click',
  fill_element_by_uid: 'Fill',
  navigate: 'Navigate',
  take_screenshot: 'Screenshot',
  scroll_page: 'Scroll',
  get_page_content: 'Get Content',
  search_snapshot: 'Search',
  press_key: 'Key Press',
  hover_element_by_uid: 'Hover',
}

function formatToolInput(toolCall: ToolCall): string {
  const { name, input } = toolCall
  switch (name) {
    case 'click_element_by_uid':
      return `Click: ${input.uid}`
    case 'fill_element_by_uid':
      return `Fill ${input.uid} with "${input.value}"`
    case 'hover_element_by_uid':
      return `Hover: ${input.uid}`
    case 'navigate': {
      const url = input.url as string | undefined
      return `Go to ${url ? (url.length > 30 ? url.slice(0, 30) + '...' : url) : '...'}`
    }
    case 'scroll_page':
      return `Scroll ${input.direction}`
    case 'search_snapshot':
      return `Search "${input.query}"`
    case 'press_key':
      return `Press ${input.key}`
    default:
      return ''
  }
}

export function ToolCallCollapsible({
  toolCall,
  isExecuting = false,
}: ToolCallCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

  const Icon = toolIcons[toolCall.name] || Camera
  const label = toolLabels[toolCall.name] || toolCall.name
  const inputSummary = formatToolInput(toolCall)

  const getStatusStyles = () => {
    if (isExecuting) return 'border-zinc-500/20 bg-zinc-500/5'
    if (toolCall.isError) return 'border-red-500/20 bg-red-500/5'
    return 'border-zinc-500/20 bg-zinc-500/5'
  }

  const getStatusIcon = () => {
    if (isExecuting) return <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
    if (toolCall.isError) return <X className="h-3 w-3 text-red-500" />
    return <Check className="h-3 w-3 text-zinc-500" />
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs transition-colors',
            getStatusStyles(),
            'hover:bg-accent/50 group'
          )}
        >
          {getStatusIcon()}
          <Icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="font-medium text-foreground/90">{label}</span>

          {inputSummary && (
            <span className="text-muted-foreground truncate max-w-[180px] font-mono opacity-80">
              {inputSummary}
            </span>
          )}

          <span className="ml-auto flex items-center gap-2">
            {toolCall.durationMs !== undefined && !isExecuting && (
              <span className="text-[10px] text-muted-foreground/70 font-mono">{toolCall.durationMs}ms</span>
            )}
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/50 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1 px-3 py-2 rounded-md bg-muted/30 border border-border/30 text-xs space-y-2 animate-in slide-in-from-top-1 duration-200">
          {/* Human-readable result summary */}
          {toolCall.name === 'take_snapshot' && toolCall.result && !isExecuting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Camera className="h-3 w-3" />
              <span>Snapshot captured successfully</span>
            </div>
          )}

          {toolCall.name === 'navigate' && inputSummary && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="h-3 w-3" />
              <span>Navigated to <a href={toolCall.input.url as string} target="_blank" rel="noreferrer" className="underline decoration-muted-foreground/30 hover:text-primary">{inputSummary}</a></span>
            </div>
          )}

          {/* Debug Details Toggle */}
          <div className="pt-2 mt-2 border-t border-border/10">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-1 text-[9px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors font-medium tracking-tighter"
            >
              {showDebug ? 'HIDE DEBUG' : 'DEBUG DETAILS'}
            </button>

            {showDebug && (
              <div className="mt-2 space-y-3 font-mono text-[10px]">
                <div className="space-y-1">
                  <p className="text-muted-foreground opacity-70">Input</p>
                  <pre className="text-foreground/70 whitespace-pre-wrap break-all bg-background/50 p-2 rounded border border-border/20">
                    {JSON.stringify(toolCall.input, null, 2)}
                  </pre>
                </div>
                {toolCall.result && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground opacity-70">Output</p>
                    <pre className="text-foreground/70 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-background/50 p-2 rounded border border-border/20">
                      {typeof toolCall.result === 'string'
                        ? (toolCall.result.length > 500 ? toolCall.result.slice(0, 500) + '...' : toolCall.result)
                        : JSON.stringify(toolCall.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
