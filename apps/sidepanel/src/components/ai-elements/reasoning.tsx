"use client"

import * as React from "react"
import { Brain, ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Shimmer } from "./shimmer"

type ReasoningContextValue = {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration: number | undefined
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null)

export const useReasoning = () => {
  const context = React.useContext(ReasoningContext)
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning")
  }
  return context
}

export type ReasoningProps = React.ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  duration?: number
}

const AUTO_CLOSE_DELAY = 1000
const MS_IN_S = 1000

export const Reasoning = React.memo(
  ({
    className,
    isStreaming = false,
    duration: durationProp,
    children,
    defaultOpen = true,
    open: openProp,
    onOpenChange,
    ...props
  }: ReasoningProps) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const [duration, setDuration] = React.useState<number | undefined>(durationProp)
    const [hasAutoClosed, setHasAutoClosed] = React.useState(false)
    const [startTime, setStartTime] = React.useState<number | null>(null)

    const isOpen = openProp !== undefined ? openProp : internalOpen
    const setIsOpen = React.useCallback(
      (open: boolean) => {
        setInternalOpen(open)
        onOpenChange?.(open)
      },
      [onOpenChange]
    )

    React.useEffect(() => {
      if (durationProp !== undefined) {
        setDuration(durationProp)
      }
    }, [durationProp])

    React.useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now())
        }
      } else if (startTime !== null) {
        setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S))
        setStartTime(null)
      }
    }, [isStreaming, startTime])

    React.useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed) {
        const timer = setTimeout(() => {
          setIsOpen(false)
          setHasAutoClosed(true)
        }, AUTO_CLOSE_DELAY)

        return () => clearTimeout(timer)
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed])

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen)
    }

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    )
  }
)

Reasoning.displayName = "Reasoning"

export type ReasoningTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => React.ReactNode
}

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1}>Thinking...</Shimmer>
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>
  }
  return <p>Thought for {duration} seconds</p>
}

export const ReasoningTrigger = React.memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning()

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <Brain className="size-4" />
            {getThinkingMessage(isStreaming, duration)}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    )
  }
)

ReasoningTrigger.displayName = "ReasoningTrigger"

export type ReasoningContentProps = React.ComponentProps<typeof CollapsibleContent> & {
  children: React.ReactNode
}

export const ReasoningContent = React.memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm text-muted-foreground",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <div className="border-l-2 border-muted pl-4">{children}</div>
    </CollapsibleContent>
  )
)

ReasoningContent.displayName = "ReasoningContent"
