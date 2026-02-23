import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, CognitoUserInfo } from "./auth";

/**
 * Middleware helper to protect API routes
 * Returns the authenticated user or an error response
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: CognitoUserInfo; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getUserFromRequest(req);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { user };
}

/**
 * Optional auth - returns user if available, but doesn't error if not
 */
export async function optionalAuth(req: NextRequest): Promise<CognitoUserInfo | null> {
  return await getUserFromRequest(req);
}
