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
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>
    </header>
  )
}

