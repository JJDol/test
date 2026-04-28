import { NextResponse } from "next/server";
import {
  withCompanyAdminDynamic,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/auth/auth-middleware";
import { createClient } from "@/lib/supabase/server";
import { isDiscipline } from "@/lib/team/disciplines";

/**
 * PATCH /api/team/members/:userId
 *
 * Updates the target user's professional `discipline`. COMPANY_ADMIN (or
 * global ADMIN) only. The target user must belong to the same company as the
 * caller. Body: `{ discipline: "Architect" | "Engineer" | "Fire" |
 * "Constructor" | null }`.
 */

async function patchMemberHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ userId: string }>
) {
  try {
    const params = await context.params;
    const targetUserId = params.userId;
    if (!targetUserId) {
      return NextResponse.json(
        { message: "Missing userId" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { discipline } = body as { discipline?: unknown };
    if (
      discipline !== null &&
      discipline !== undefined &&
      !isDiscipline(discipline)
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid discipline. Expected one of 'Architect', 'Engineer', 'Fire', 'Constructor', or null.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: callerRow, error: callerError } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", request.user.id)
      .single();

    if (callerError || !callerRow) {
      return NextResponse.json(
        { message: "Caller profile not found" },
        { status: 404 }
      );
    }

    const { data: targetRow, error: targetError } = await supabase
      .from("users")
      .select("id, company_id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetRow) {
      return NextResponse.json(
        { message: "Target user not found" },
        { status: 404 }
      );
    }

    const isGlobalAdmin = callerRow.role === "ADMIN";
    const sameCompany =
      !!callerRow.company_id &&
      callerRow.company_id === targetRow.company_id;

    if (!isGlobalAdmin && !sameCompany) {
      return NextResponse.json(
        { message: "You can only edit members of your own company" },
        { status: 403 }
      );
    }

    const normalized = discipline === undefined ? null : discipline;

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ discipline: normalized })
      .eq("id", targetUserId)
      .select("id, name, email, role, discipline")
      .single();

    if (updateError) {
      console.error("Failed to update user discipline:", updateError);
      return NextResponse.json(
        {
          message: "Failed to update discipline",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ member: updated });
  } catch (error: any) {
    console.error("Error in PATCH /api/team/members/[userId]:", error);
    return NextResponse.json(
      {
        message: "Failed to update team member",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const PATCH = withCompanyAdminDynamic<{ userId: string }>(
  patchMemberHandler
);
