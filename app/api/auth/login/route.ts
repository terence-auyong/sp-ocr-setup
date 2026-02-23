import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/cognito";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Authentication failed" },
        { status: 401 }
      );
    }

    // Create response with tokens
    const response = NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      idToken: result.idToken,
      expiresIn: result.expiresIn,
    });

    // Set HTTP-only cookies for security (optional but recommended)
    if (result.accessToken) {
      response.cookies.set("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: result.expiresIn || 3600,
      });
    }

    if (result.idToken) {
      response.cookies.set("idToken", result.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: result.expiresIn || 3600,
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
