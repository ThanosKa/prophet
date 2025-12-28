"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ContextProps {
  maxTokens: number
  modelId: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cachedInputTokens?: number
    reasoningTokens?: number
  }
  usedTokens: number
  children: React.ReactNode
}

interface ContextValue {
  maxTokens: number
  modelId: string
  usage: ContextProps["usage"]
  usedTokens: number
}

const ContextContext = React.createContext<ContextValue | null>(null)

function useContext() {
  const context = React.useContext(ContextContext)
  if (!context) {
    throw new Error("Context components must be used within <Context>")
  }
  return context
}

export function Context({ maxTokens, modelId, usage, usedTokens, children }: ContextProps) {
  return (
    <ContextContext.Provider value={{ maxTokens, modelId, usage, usedTokens }}>
      <Popover>
        {children}
      </Popover>
    </ContextContext.Provider>
  )
}

export function ContextTrigger() {
  const { usedTokens, maxTokens } = useContext()
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100)

  // Color based on usage
  const getColor = () => {
    if (percentage >= 80) return "stroke-red-500"
    if (percentage >= 50) return "stroke-yellow-500"
    return "stroke-green-500"
  }

  const radius = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <PopoverTrigger asChild>
      <button className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
        <svg width="24" height="24" viewBox="0 0 24 24" className="relative">
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted"
            opacity="0.2"
          />
          {/* Progress circle */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            strokeWidth="2"
            className={cn("transition-all duration-300", getColor())}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="sr-only">View token usage</span>
      </button>
    </PopoverTrigger>
  )
}

export function ContextContent({ children }: { children: React.ReactNode }) {
  return (
    <PopoverContent side="top" align="end" className="w-64 p-0">
      {children}
    </PopoverContent>
  )
}

export function ContextContentHeader() {
  const { modelId } = useContext()

  return (
    <div className="px-3 py-2 border-b bg-muted/50">
      <p className="text-xs font-medium text-muted-foreground">{modelId}</p>
    </div>
  )
}

export function ContextContentBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 space-y-2">
      {children}
    </div>
  )
}

export function ContextInputUsage() {
  const { usage } = useContext()

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Input</span>
      <span className="font-mono">{formatTokens(usage.inputTokens)}</span>
    </div>
  )
}

export function ContextOutputUsage() {
  const { usage } = useContext()

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Output</span>
      <span className="font-mono">{formatTokens(usage.outputTokens)}</span>
    </div>
  )
}

export function ContextReasoningUsage() {
  const { usage } = useContext()

  if (!usage.reasoningTokens) return null

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Reasoning</span>
      <span className="font-mono">{formatTokens(usage.reasoningTokens)}</span>
    </div>
  )
}

export function ContextCacheUsage() {
  const { usage } = useContext()

  if (!usage.cachedInputTokens) return null

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Cache</span>
      <span className="font-mono">{formatTokens(usage.cachedInputTokens)}</span>
    </div>
  )
}

export function ContextContentFooter() {
  const { usedTokens, maxTokens } = useContext()

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="px-3 py-2 border-t bg-muted/50">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Total</span>
        <span className="font-mono font-medium">
          {formatTokens(usedTokens)} / {formatTokens(maxTokens)}
        </span>
      </div>
    </div>
  )
}
