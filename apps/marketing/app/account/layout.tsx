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
  }

  return (
    <SidebarProvider>
      <AccountSidebar />
      <SidebarInset>
        <AccountHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-5xl">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

