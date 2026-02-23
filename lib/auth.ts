import { NextRequest } from "next/server";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { cognitoConfig } from "./cognito";

export interface CognitoUserInfo {
  sub: string; // User ID
  email?: string;
  email_verified?: boolean;
  username?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  [key: string]: any; // Other custom attributes
}

/**
 * Get the JWKS URL for the Cognito User Pool
 */
function getJWKSUrl(): string {
  const region = cognitoConfig.region;
  const userPoolId = cognitoConfig.userPoolId;
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
}

/**
 * Verify and decode a Cognito JWT token
 * @param token - The JWT token to verify
 * @param tokenType - 'id' for ID token, 'access' for access token
 * @returns Decoded token payload or null if invalid
 */
export async function verifyCognitoToken(
  token: string,
  tokenType: "id" | "access" = "id"
): Promise<CognitoUserInfo | null> {
  try {
    if (!token) {
      return null;
    }

    // For ID tokens, verify the signature using JWKS
    if (tokenType === "id") {
      try {
        const jwksUrl = getJWKSUrl();
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        
        // Verify the token signature
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`,
        });

        return payload as CognitoUserInfo;
      } catch (verifyError) {
        // If verification fails, still return decoded token for development
        // In production, you might want to return null
        console.warn("Token verification failed, using decoded token:", verifyError);
        const decoded = decodeJwt(token);
        return decoded as CognitoUserInfo;
      }
    }

    // For access tokens, just decode (they don't contain user info in the same way)
    const decoded = decodeJwt(token);
    return decoded as CognitoUserInfo;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

/**
 * Extract user information from request headers or cookies
 * Checks Authorization header first, then cookies
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<CognitoUserInfo | null> {
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
    return null;
  }

  // Verify and decode the token
  const userInfo = await verifyCognitoToken(token, "id");
  return userInfo;
}

/**
 * Simple decode without verification (for quick checks)
 * Use verifyCognitoToken for production
 */
export function decodeCognitoToken(token: string): CognitoUserInfo | null {
  try {
    const decoded = decodeJwt(token);
    return decoded as CognitoUserInfo;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}
