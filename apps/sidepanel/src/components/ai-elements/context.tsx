"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ContextProps {
  maxTokens: number;
  modelId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  };
  usedTokens: number;
  children: React.ReactNode;
}

interface ContextValue {
  maxTokens: number;
  modelId: string;
  usage: ContextProps["usage"];
  usedTokens: number;
  openPopover: () => void;
  closePopover: () => void;
}

const ContextContext = React.createContext<ContextValue | null>(null);

function useContext() {
  const context = React.useContext(ContextContext);
  if (!context) {
    throw new Error("Context components must be used within <Context>");
  }
  return context;
}

export function Context({
  maxTokens,
  modelId,
  usage,
  usedTokens,
  children,
}: ContextProps) {
  const [open, setOpen] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);

  const openPopover = React.useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const closePopover = React.useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 80);
  }, []);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <ContextContext.Provider
      value={{
        maxTokens,
        modelId,
        usage,
        usedTokens,
        openPopover,
        closePopover,
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ContextContext.Provider>
  );
}

export function ContextTrigger() {
  const { usedTokens, maxTokens, openPopover, closePopover } = useContext();
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100);

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <PopoverTrigger asChild>
      <button
        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        onFocus={openPopover}
        onBlur={closePopover}
        onPointerDown={(e) => e.preventDefault()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" className="relative">
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/40"
          />
          {/* Progress circle */}
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn("transition-all duration-300 text-foreground")}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="sr-only">View token usage</span>
      </button>
    </PopoverTrigger>
  );
}

export function ContextContent({ children }: { children: React.ReactNode }) {
  const { openPopover, closePopover } = useContext();
  return (
    <PopoverContent
      side="top"
      align="end"
      className="w-64 p-0"
      onMouseEnter={openPopover}
      onMouseLeave={closePopover}
    >
      {children}
    </PopoverContent>
  );
}

export function ContextContentHeader() {
  const { modelId, usedTokens, maxTokens } = useContext();
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100);

  return (
    <div className="px-3 py-2 border-b bg-muted/50">
      <p className="text-xs font-medium text-muted-foreground">{modelId}</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted-foreground/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ContextContentBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="px-3 py-2 space-y-2">{children}</div>;
}

export function ContextInputUsage() {
  const { usage } = useContext();

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Input</span>
      <span className="font-mono">{formatTokens(usage.inputTokens)}</span>
    </div>
  );
}

export function ContextOutputUsage() {
  const { usage } = useContext();

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Output</span>
      <span className="font-mono">{formatTokens(usage.outputTokens)}</span>
    </div>
  );
}

export function ContextReasoningUsage() {
  const { usage } = useContext();

  if (!usage.reasoningTokens) return null;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Reasoning</span>
      <span className="font-mono">{formatTokens(usage.reasoningTokens)}</span>
    </div>
  );
}

export function ContextCacheUsage() {
  const { usage } = useContext();

  if (!usage.cachedInputTokens) return null;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Cache</span>
      <span className="font-mono">{formatTokens(usage.cachedInputTokens)}</span>
    </div>
  );
}

export function ContextContentFooter() {
  const { usedTokens, maxTokens } = useContext();

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return tokens.toString();
  };

  return (
    <div className="px-3 py-2 border-t bg-muted/50">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Total</span>
        <span className="font-mono font-medium">
          {formatTokens(usedTokens)} / {formatTokens(maxTokens)}
        </span>
      </div>
    </div>
  );
}
