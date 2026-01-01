import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AccountSidebar } from "@/components/account/AccountSidebar"
import { AccountHeader } from "@/components/account/AccountHeader"
import { ensureDbUser } from "@/lib/db/user"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Ensure user exists in DB before showing dashboard
  try {
    await ensureDbUser()
  } catch (error) {
    console.error("Failed to ensure DB user in layout:", error)
    // We could redirect to an error page or just let it fail
  }

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarCookie ? sidebarCookie === "true" : true

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AccountSidebar />
      <SidebarInset>
        <AccountHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

