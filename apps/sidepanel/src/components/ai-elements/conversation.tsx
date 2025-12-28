"use client"

import * as React from "react"
import { ArrowDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

export function Conversation({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col relative h-full">
      {children}
    </div>
  )
}

export function ConversationContent({ children }: { children: React.ReactNode }) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  const scrollToBottom = React.useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  React.useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollButton(distanceFromBottom > 100)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [children, scrollToBottom])

  return (
    <>
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="divide-y divide-border/50">
          {children}
        </div>
      </ScrollArea>
      {showScrollButton && <ConversationScrollButton onClick={scrollToBottom} />}
    </>
  )
}

export function ConversationScrollButton({ onClick }: { onClick?: () => void }) {
  return (
    <div className="absolute bottom-4 right-4 z-10">
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 rounded-full shadow-lg bg-background"
        onClick={onClick}
      >
        <ArrowDown className="h-4 w-4" />
        <span className="sr-only">Scroll to bottom</span>
      </Button>
    </div>
  )
}
