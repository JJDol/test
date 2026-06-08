"use client";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AuthButton() {
  const t = useTranslations("auth");
  const { currentUser, user, isLoading } = useAuth();
  const pathname = usePathname();

  // Check if we're on an auth page
  const isAuthPage = pathname?.startsWith('/sign-in') || 
                    pathname?.startsWith('/sign-up') || 
                    pathname?.startsWith('/forgot-password') || 
                    pathname?.startsWith('/reset-password') ||
                    pathname?.startsWith('/auth/');

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // The useAuth hook will handle the redirect
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Don't show anything on auth pages
  if (isAuthPage) {
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="w-20 h-4 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // If no user, show sign-in button
  if (!user || !currentUser) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/sign-in">
          <Button variant="default">
            {t("signIn")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{currentUser?.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <span>{currentUser?.name || user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="px-3 py-2 font-medium">{t("myAccount")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="px-3 py-2 cursor-pointer">
            <Link href="/protected/profile">{t("profileSettings")}</Link>
          </DropdownMenuItem>
          {currentUser?.assigned_projects && currentUser.assigned_projects.length > 0 && (
            <>
            </>
          )}
          <DropdownMenuSeparator />
          <Button 
            onClick={handleSignOut}
            variant="ghost" 
            className="w-full justify-start px-3 py-2 h-auto font-normal text-base"
          >
            {t("signOut")}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
