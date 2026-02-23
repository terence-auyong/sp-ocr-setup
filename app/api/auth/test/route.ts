import { NextRequest, NextResponse } from "next/server";
import { requireAuth, optionalAuth } from "@/lib/middleware";

/**
 * GET /api/auth/test
 * Example of a protected route that requires authentication
 */
export async function GET(req: NextRequest) {
  // Check if user is authenticated
  const authResult = await requireAuth(req);
  
  if (authResult.response) {
    // User is not authenticated
    return authResult.response;
  }

  // User is authenticated
  const { user } = authResult;

  return NextResponse.json({
    success: true,
    message: "You are authenticated!",
    user: {
      id: user.sub,
      username: user["cognito:username"] || user.username || user.sub,
      email: user.email,
      emailVerified: user.email_verified,
      groups: user["cognito:groups"] || [],
    },
    // Include all token claims for debugging
    tokenClaims: user,
  });
}

/**
 * POST /api/auth/test
 * Example of a route with optional authentication
 */
export async function POST(req: NextRequest) {
  // Optional auth - doesn't fail if not authenticated
  const user = await optionalAuth(req);

  if (user) {
    return NextResponse.json({
      success: true,
      message: "Authenticated request",
      user: {
        id: user.sub,
        username: user["cognito:username"] || user.username || user.sub,
        email: user.email,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: "Unauthenticated request (this is allowed)",
    user: null,
  });
}
