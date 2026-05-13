import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase OAuth / email-link callback.
 *
 * Notes for the password-reset flow (Issue 1):
 *   - Supabase appends `?code=<...>&type=recovery` (or similar) and the
 *     `redirect_to` we passed to `resetPasswordForEmail` (e.g.
 *     `${SITE_URL}/reset-password/${token}`).
 *   - Previously we silently ignored exchangeCodeForSession errors, so any
 *     failure (expired link, mismatched PKCE verifier, missing cookie, …)
 *     dropped the user onto `/protected` → middleware kicked them to
 *     `/sign-in`, making it look like the reset link "didn't work".
 *   - We now (a) log the exchange error, (b) on failure forward to the
 *     intended `redirect_to` if it's a known recovery path so the user can
 *     still attempt to set a new password, otherwise to `/sign-in` with a
 *     diagnostic query string, and (c) only honour same-origin redirects to
 *     prevent open-redirect abuse.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const rawRedirectTo = requestUrl.searchParams.get("redirect_to") ?? undefined;
  const type = requestUrl.searchParams.get("type") ?? undefined;
  const errorParam = requestUrl.searchParams.get("error") ?? undefined;
  const errorDescription = requestUrl.searchParams.get("error_description") ?? undefined;

  // Same-origin guard for redirect_to: only allow root-relative paths.
  // Anything starting with `//` or containing a scheme is rejected.
  const safeRedirectTo = (() => {
    if (!rawRedirectTo) return undefined;
    if (rawRedirectTo.startsWith("/") && !rawRedirectTo.startsWith("//")) {
      return rawRedirectTo;
    }
    try {
      const parsed = new URL(rawRedirectTo, origin);
      if (parsed.origin === origin) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // ignore — falls through to undefined below
    }
    console.warn("[auth/callback] Rejected non-same-origin redirect_to:", rawRedirectTo);
    return undefined;
  })();

  // Supabase may forward an OAuth-style error directly on the URL (e.g. the
  // user denied access). Surface that to the sign-in page rather than
  // pretending nothing happened.
  if (errorParam) {
    console.warn("[auth/callback] Provider returned error:", {
      error: errorParam,
      description: errorDescription,
      type,
    });
    const search = new URLSearchParams({
      error: "auth_callback_failed",
      reason: errorDescription || errorParam,
    });
    return NextResponse.redirect(`${origin}/sign-in?${search.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", {
        message: error.message,
        status: error.status,
        type,
        redirectTo: safeRedirectTo,
      });

      // Recovery / invite links should still drop the user on the
      // reset-password page (or wherever redirect_to points) so they can
      // recover gracefully. Otherwise show an explicit failure on sign-in.
      if (safeRedirectTo && (type === "recovery" || safeRedirectTo.startsWith("/reset-password"))) {
        const search = new URLSearchParams({ error: "session_exchange_failed" });
        const sep = safeRedirectTo.includes("?") ? "&" : "?";
        return NextResponse.redirect(`${origin}${safeRedirectTo}${sep}${search.toString()}`);
      }

      const search = new URLSearchParams({
        error: "auth_callback_failed",
        reason: error.message,
      });
      return NextResponse.redirect(`${origin}/sign-in?${search.toString()}`);
    }
  } else if (!safeRedirectTo) {
    // No code and no redirect — almost certainly an unintended hit.
    console.warn("[auth/callback] Hit without `code` or `redirect_to` — sending to /sign-in");
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_no_code`);
  }

  if (safeRedirectTo) {
    return NextResponse.redirect(`${origin}${safeRedirectTo}`);
  }

  return NextResponse.redirect(`${origin}/protected`);
}
