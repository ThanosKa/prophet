"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser as useClerkUser, useAuth } from "@clerk/nextjs";
import { useUserOptional } from "@/contexts/UserContext";
import Link from "next/link";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  LogOut,
  Shield,
} from "lucide-react";
import type { User } from "@prophet/shared";

export function UserMenu() {
  const { user: clerkUser } = useClerkUser();
  const { signOut } = useAuth();
  const userContext = useUserOptional();

  // Use context if available (inside account layout), otherwise fetch
  const [fetchedUser, setFetchedUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    // Skip fetch if we have context (inside account layout)
    if (userContext?.user) return;

    fetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setFetchedUser(data.data);
      })
      .catch((err) => console.error("Failed to fetch user in menu:", err));
  }, [userContext?.user]);

  const dbUser = userContext?.user || fetchedUser;

  if (!clerkUser) return null;

  const initials =
    `${clerkUser.firstName?.[0] || ""}${
      clerkUser.lastName?.[0] || ""
    }`.toUpperCase() || "U";
  const creditsRemaining = dbUser
    ? (dbUser.creditsRemaining / 100).toFixed(2)
    : "...";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity" suppressHydrationWarning>
          <AvatarImage
            src={clerkUser.imageUrl}
            alt={clerkUser.fullName || "User"}
          />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 space-y-1">
          <p className="text-sm font-medium truncate">{clerkUser.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {clerkUser.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex justify-between items-center pointer-events-none opacity-100">
          <span className="text-xs font-semibold">Balance</span>
          <span className="font-bold">${creditsRemaining}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/usage" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Usage</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/billing" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
