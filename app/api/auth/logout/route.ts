import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getStageFromRequest } from "@/lib/stage";
import { closePoolForUser } from "@/lib/db";

/**
 * POST /api/auth/logout
 * Closes the DB pool for the current user (stage + schema_name from token)
 * so the next login gets a fresh connection. Call with credentials so cookies are sent.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const stage = getStageFromRequest(req);
    const schemaName = user?.schema_name ?? user?.["custom:schema_name"] ?? null;
    await closePoolForUser(stage, schemaName);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout cleanup error:", err);
    return NextResponse.json({ success: true });
  }
}
