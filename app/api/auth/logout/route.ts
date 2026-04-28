// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getStageFromRequest } from "@/lib/stage";
import { closePoolForUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const stage = getStageFromRequest(req);
    const schemaName = user?.schema_name ?? user?.["custom:schema_name"] ?? null;
    await closePoolForUser(stage, schemaName);
  } catch (err) {
    console.error("Logout cleanup error:", err);
  }

  // Clear the accessToken cookie from the server side
  const response = NextResponse.json({ success: true });
  response.cookies.set("accessToken", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return response;
}