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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCall, ToolName } from '@prophet/shared'

interface ToolCallCardProps {
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
  take_snapshot: 'Taking snapshot',
  click_element_by_uid: 'Clicking element',
  fill_element_by_uid: 'Filling input',
  navigate: 'Navigating',
  take_screenshot: 'Taking screenshot',
  scroll_page: 'Scrolling page',
  get_page_content: 'Getting content',
  search_snapshot: 'Searching',
  press_key: 'Pressing key',
  hover_element_by_uid: 'Hovering element',
}

export function ToolCallCard({ toolCall, isExecuting = false }: ToolCallCardProps) {
  const Icon = toolIcons[toolCall.name] || Camera
  const label = toolLabels[toolCall.name] || toolCall.name

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
        isExecuting
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          : toolCall.isError
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-green-500/10 border-green-500/30 text-green-400'
      )}
    >
      {isExecuting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : toolCall.isError ? (
        <X className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      <Icon className="h-4 w-4" />
      <span className="flex-1 truncate">
        {isExecuting ? label : toolCall.isError ? 'Failed' : 'Done'}
        {': '}
        {formatToolInput(toolCall)}
      </span>
      {toolCall.durationMs !== undefined && !isExecuting && (
        <span className="text-xs opacity-70">{toolCall.durationMs}ms</span>
      )}
    </div>
  )
}

function formatToolInput(toolCall: ToolCall): string {
  const { name, input } = toolCall

  switch (name) {
    case 'click_element_by_uid':
    case 'fill_element_by_uid':
    case 'hover_element_by_uid':
      return `uid=${input.uid}${input.value ? ` "${input.value}"` : ''}`
    case 'navigate':
      return input.url as string
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

interface ToolCallListProps {
  toolCalls: ToolCall[]
  currentToolCall?: ToolCall | null
}

export function ToolCallList({ toolCalls, currentToolCall }: ToolCallListProps) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      {toolCalls.map((tc) => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}
      {currentToolCall && (
        <ToolCallCard toolCall={currentToolCall} isExecuting />
      )}
    </div>
  )
}
