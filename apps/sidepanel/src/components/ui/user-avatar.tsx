import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/lib/config";

export function UserAvatar() {
  const { clerkUser, user, signOut } = useAuth();

  const initials = clerkUser
    ? `${clerkUser.firstName?.[0] || ""}${
        clerkUser.lastName?.[0] || ""
      }`.toUpperCase() || "U"
    : "U";

  const imageUrl = clerkUser?.imageUrl;

  const handleAccountClick = () => {
    const accountUrl = `${config.syncHost}/account`;
    chrome.tabs.create({ url: accountUrl });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-7 w-7 cursor-pointer hover:opacity-80 transition-opacity">
          {imageUrl && <AvatarImage src={imageUrl} alt="User" />}
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {clerkUser?.firstName} {clerkUser?.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {clerkUser?.emailAddresses?.[0]?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="pointer-events-none">
          Balance: ${((user?.creditsRemaining || 0) / 100).toFixed(2)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAccountClick}>
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
