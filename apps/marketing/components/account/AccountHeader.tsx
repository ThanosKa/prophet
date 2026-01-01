'use client'

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { usePathname } from "next/navigation"

const routeTitles: Record<string, string> = {
  "/account": "Overview",
  "/account/usage": "Usage & Analytics",
  "/account/billing": "Billing & Subscription",
  "/account/security": "Security & Account",
}

export function AccountHeader() {
  const pathname = usePathname()
  const title = routeTitles[pathname] || "Account"

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </header>
  )
}

