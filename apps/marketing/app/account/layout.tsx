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
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AccountSidebar />
      <SidebarInset>
        <AccountHeader />
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

