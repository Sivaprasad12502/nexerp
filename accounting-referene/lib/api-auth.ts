import { NextResponse } from "next/server";

import { canManageTeam, getRbacContext, type RbacContext } from "@/lib/rbac";

/**
 * Guard for team-management endpoints. Returns the resolved context, or a
 * ready-to-return error response when the caller is unauthenticated or lacks
 * permission to manage users/roles.
 */
export async function requireTeamManager(): Promise<
  { ctx: RbacContext; error?: never } | { ctx?: never; error: NextResponse }
> {
  const ctx = await getRbacContext();
  if (!ctx) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageTeam(ctx)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}
