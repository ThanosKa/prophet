'use client'

import * as React from "react"
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Overview",
    url: "/account",
    icon: LayoutDashboard,
  },
  {
    title: "Usage",
    url: "/account/usage",
    icon: BarChart3,
  },
  {
    title: "Billing",
    url: "/account/billing",
    icon: CreditCard,
  },
  {
    title: "Security",
    url: "/account/security",
    icon: Lock,
  },
]

export function AccountSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl group-data-[collapsible=icon]:hidden">
          <span>Prophet</span>
        </Link>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
          <span className="font-bold text-xl">P</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SignOutButton>
              <SidebarMenuButton tooltip="Sign out">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

