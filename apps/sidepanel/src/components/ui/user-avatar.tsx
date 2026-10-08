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
import { describeBalance } from "@prophet/shared";

export function UserAvatar() {
  const { clerkUser, user } = useAuth();

  const initials = clerkUser
    ? `${clerkUser.firstName?.[0] || ""}${clerkUser.lastName?.[0] || ""
      }`.toUpperCase() || "U"
    : "U";

  const imageUrl = clerkUser?.imageUrl;
  const balance = describeBalance({
    creditsRemaining: user?.creditsRemaining ?? 0,
    purchasedCredits: user?.purchasedCredits,
  });

  const handleSettingsClick = () => {
    const optionsUrl = chrome.runtime.getURL('options.html')
    chrome.tabs.create({ url: optionsUrl })
  };

  const handleAccountClick = () => {
    const accountUrl = `${config.apiUrl}/account`;
    chrome.tabs.create({ url: accountUrl });
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
        <DropdownMenuItem className="pointer-events-none flex-col items-start gap-0.5">
          <span>Balance: {balance.total}</span>
          {balance.neverExpiresNote && (
            <span className="text-xs text-muted-foreground">{balance.neverExpiresNote}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAccountClick}>
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick}>
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
