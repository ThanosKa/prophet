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
  Clock,
  Layout,
  PlusSquare,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
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
  take_snapshot: 'Taking snapshot',
  click_element_by_uid: 'Clicking element',
  fill_element_by_uid: 'Filling input',
  navigate: 'Navigating',
  scroll_page: 'Scrolling page',
  get_page_content: 'Getting content',
  search_snapshot: 'Searching',
  hover_element_by_uid: 'Hovering element',
  wait_for_selector: 'Waiting for selector',
  wait_for_navigation: 'Waiting for navigation',
  wait_for_timeout: 'Waiting',
  list_tabs: 'Listing tabs',
  switch_tab: 'Switching tab',
  close_tab: 'Closing tab',
  open_new_tab: 'Opening tab',
  go_back: 'Going back',
  go_forward: 'Going forward',
  reload_page: 'Reloading page',
  get_page_info: 'Getting page info',
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
      return 'Click element'
    case 'fill_element_by_uid':
      return typeof input.value === 'string' ? `Type "${input.value}"` : 'Type text'
    case 'hover_element_by_uid':
      return 'Hover element'
    case 'navigate':
      return typeof input.url === 'string' ? input.url : ''
    case 'scroll_page':
      return typeof input.direction === 'string' ? input.direction : ''
    case 'search_snapshot':
      return typeof input.query === 'string' ? `"${input.query}"` : ''
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
