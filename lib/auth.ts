import { NextRequest } from "next/server";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { getCognitoConfigForStage } from "./cognito";
import { type EdtrStage } from "./edtr-stage-constants";
import { getStageFromRequest } from "./stage";

export interface CognitoUserInfo {
  sub: string; // User ID
  email?: string;
  email_verified?: boolean;
  username?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  /** Schema name for DB access (may be in token or custom:schema_name) */
  schema_name?: string;
  "custom:schema_name"?: string;
  [key: string]: any; // Other custom attributes
}

/**
 * Get the JWKS URL for the Cognito User Pool for the given stage
 */
function getJWKSUrl(stage: EdtrStage): string {
  const config = getCognitoConfigForStage(stage);
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`;
}

/**
 * Verify and decode a Cognito JWT token using the pool for the given stage.
 * @param token - The JWT token to verify
 * @param tokenType - 'id' for ID token, 'access' for access token
 * @param stage - Environment (dev | qa | uat | prod) to select User Pool
 */
export async function verifyCognitoToken(
  token: string,
  tokenType: "id" | "access" = "id",
  stage: EdtrStage = "dev"
): Promise<CognitoUserInfo | null> {
  try {
    if (!token) {
      return null;
    }

    // For ID tokens, verify the signature using JWKS for this stage's pool
    if (tokenType === "id") {
      try {
        const config = getCognitoConfigForStage(stage);
        const jwksUrl = getJWKSUrl(stage);
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        const issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;

        const { payload } = await jwtVerify(token, JWKS, { issuer });
        return payload as CognitoUserInfo;
      } catch (verifyError) {
        // If verification fails, still return decoded token for development
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
 * Extract user information from request headers or cookies.
 * Uses the stage from the request (cookie or env) to verify against the correct Cognito User Pool.
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<CognitoUserInfo | null> {
  const stage = getStageFromRequest(req);

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

  const userInfo = await verifyCognitoToken(token, "id", stage);
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

/**
 * Get schema_name from the request (from auth token).
 * Checks schema_name and custom:schema_name claims.
 */
export async function getSchemaNameFromRequest(
  req: NextRequest
): Promise<string | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  const schemaName =
    user.schema_name ?? user["custom:schema_name"] ?? null;
  return typeof schemaName === "string" && schemaName.length > 0
    ? schemaName
    : null;
}
