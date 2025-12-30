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
    case 'fill_element_by_uid':
    case 'hover_element_by_uid':
      return input.uid as string
    case 'navigate':
      const url = input.url as string | undefined
      return url ? (url.length > 40 ? url.slice(0, 40) + '...' : url) : '...'
    case 'scroll_page':
      return input.direction as string
    case 'search_snapshot':
      return `"${input.query}"`
    case 'press_key':
      return input.key as string
    default:
      return ''
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

  const getStatusStyles = () => {
    if (isExecuting) return 'border-blue-500/30 bg-blue-500/5'
    if (toolCall.isError) return 'border-red-500/30 bg-red-500/5'
    return 'border-green-500/30 bg-green-500/5'
  }

  const getStatusIcon = () => {
    if (isExecuting) return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
    if (toolCall.isError) return <X className="h-3 w-3 text-red-500" />
    return <Check className="h-3 w-3 text-green-500" />
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs transition-colors',
            getStatusStyles(),
            'hover:bg-accent/50'
          )}
        >
          {getStatusIcon()}
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{label}</span>
          {inputSummary && (
            <span className="text-muted-foreground truncate max-w-[120px]">
              {inputSummary}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {toolCall.durationMs !== undefined && !isExecuting && (
              <span className="text-muted-foreground">{toolCall.durationMs}ms</span>
            )}
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 px-2 py-2 rounded-md bg-muted/50 text-xs">
          <p className="font-medium mb-1">Input:</p>
          <pre className="text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
          {toolCall.result && (
            <>
              <p className="font-medium mt-2 mb-1">Result:</p>
              <pre className="text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-auto">
                {typeof toolCall.result === 'string' 
                  ? (toolCall.result.length > 500 ? toolCall.result.slice(0, 500) + '...' : toolCall.result)
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
