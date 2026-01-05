import { cn } from "@/lib/utils"
import { ComponentPropsWithoutRef } from "react"

interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      style={{
        "--shiny-width": `${shimmerWidth}px`,
      } as React.CSSProperties}
      className={cn(
        "mx-auto max-w-md text-neutral-800 dark:text-neutral-200",
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]",
        "bg-gradient-to-r from-transparent via-black/90 via-50% to-transparent dark:via-white/90",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
