import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <span className="text-sm text-muted-foreground/70 animate-shimmer bg-gradient-to-r from-muted-foreground/40 via-muted-foreground/90 to-muted-foreground/40 bg-[length:200%_100%] bg-clip-text text-transparent">
        Planning next moves
      </span>
    </div>
  );
}
