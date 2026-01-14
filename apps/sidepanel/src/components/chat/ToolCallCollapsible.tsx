import { useState } from 'react'
import {
  Camera,
  MousePointer,
  Type,
  Navigation,
  ArrowUpDown,
  FileText,
  Search,
  Move,
  Loader2,
  Check,
  X,
  ChevronDown,
  Clock,
  Layout,
  PlusSquare,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
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
  scroll_page: ArrowUpDown,
  get_page_content: FileText,
  search_snapshot: Search,
  hover_element_by_uid: Move,
  wait_for_selector: Search,
  wait_for_navigation: Clock,
  wait_for_timeout: Clock,
  list_tabs: Layout,
  switch_tab: Layout,
  close_tab: X,
  open_new_tab: PlusSquare,
  go_back: ArrowLeft,
  go_forward: ArrowRight,
  reload_page: RefreshCw,
  get_page_info: Info,
}

const toolLabels: Record<ToolName, string> = {
  take_snapshot: 'Snapshot',
  click_element_by_uid: 'Click',
  fill_element_by_uid: 'Fill',
  navigate: 'Navigate',
  scroll_page: 'Scroll',
  get_page_content: 'Get Content',
  search_snapshot: 'Search',
  hover_element_by_uid: 'Hover',
  wait_for_selector: 'Wait for Selector',
  wait_for_navigation: 'Wait for Navigation',
  wait_for_timeout: 'Wait',
  list_tabs: 'List Tabs',
  switch_tab: 'Switch Tab',
  close_tab: 'Close Tab',
  open_new_tab: 'Open Tab',
  go_back: 'Go Back',
  go_forward: 'Go Forward',
  reload_page: 'Reload',
  get_page_info: 'Page Info',
}

function formatToolInput(toolCall: ToolCall): string {
  const { name, input } = toolCall
  switch (name) {
    case 'click_element_by_uid':
      return 'Click element'
    case 'fill_element_by_uid':
      return typeof input.value === 'string' ? `Type "${input.value}"` : 'Type text'
    case 'hover_element_by_uid':
      return 'Hover element'
    case 'navigate': {
      const url = typeof input.url === 'string' ? input.url : undefined
      return `Go to ${url ? (url.length > 30 ? url.slice(0, 30) + '...' : url) : '...'}`
    }
    case 'scroll_page':
      return typeof input.direction === 'string' ? `Scroll ${input.direction}` : 'Scroll'
    case 'search_snapshot':
      return typeof input.query === 'string' ? `Search "${input.query}"` : 'Search'
    default:
      return ''
  }
}

function formatToolResult(toolCall: ToolCall): string | null {
  if (toolCall.isError) {
    if (typeof toolCall.result === 'string' && toolCall.result.trim()) return toolCall.result
    return 'Tool failed'
  }

  switch (toolCall.name) {
    case 'take_snapshot':
      return 'Snapshot captured'
    case 'wait_for_navigation':
      return 'Navigation complete'
    case 'wait_for_timeout':
      return 'Wait complete'
    case 'wait_for_selector':
      return 'Selector found'
    case 'navigate':
      return 'Navigation complete'
    case 'search_snapshot': {
      if (typeof toolCall.result !== 'string') return 'Search complete'
      const m = toolCall.result.match(/Found\s+(\d+)\s+elements?/i)
      if (m?.[1]) return `Found ${m[1]} matches`
      if (/No elements found/i.test(toolCall.result)) return 'No matches'
      return 'Search complete'
    }
    case 'fill_element_by_uid':
      return 'Typed'
    case 'click_element_by_uid':
      return 'Clicked'
    case 'hover_element_by_uid':
      return 'Hovered'
    default:
      return null
  }
}

export function ToolCallCollapsible({
  toolCall,
  isExecuting = false,
}: ToolCallCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  const Icon = toolIcons[toolCall.name] || Camera
  const label = toolLabels[toolCall.name] || toolCall.name
  const inputSummary = formatToolInput(toolCall)
  const resultSummary = !isExecuting ? formatToolResult(toolCall) : null

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
            'cursor-pointer flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs transition-colors',
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
          {inputSummary && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-3 w-3" />
              <span>{inputSummary}</span>
            </div>
          )}

          {isExecuting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Running…</span>
            </div>
          )}

          {!isExecuting && resultSummary && (
            <div className={cn('flex items-center gap-2', toolCall.isError ? 'text-red-400' : 'text-muted-foreground')}>
              {toolCall.isError ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              <span>{resultSummary}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
