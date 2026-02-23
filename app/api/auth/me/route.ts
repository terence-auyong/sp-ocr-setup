import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, decodeCognitoToken } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns the current authenticated user information
 */
export async function GET(req: NextRequest) {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.get("authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookies
      const idToken = req.cookies.get("idToken")?.value;
      const accessToken = req.cookies.get("accessToken")?.value;
      token = idToken || accessToken || null;
    }

    if (!token) {
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 }
      );
    }

    // Decode the token to get user info
    // For production, use getUserFromRequest which verifies the token
    const userInfo = decodeCognitoToken(token);

    if (!userInfo) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Return user information
    return NextResponse.json({
      success: true,
      user: {
        id: userInfo.sub,
        username: userInfo["cognito:username"] || userInfo.username || userInfo.sub,
        email: userInfo.email,
        emailVerified: userInfo.email_verified,
        groups: userInfo["cognito:groups"] || [],
        // Include all other attributes
        attributes: userInfo,
      },
    });
  } catch (error: any) {
    console.error("Error getting user info:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
