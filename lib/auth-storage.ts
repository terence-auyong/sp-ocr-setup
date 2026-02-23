"use client";

import { decodeJwt } from "jose";

const ID_TOKEN_KEY = "idToken";
const ACCESS_TOKEN_KEY = "accessToken";

export type StoredUser = { displayName: string; schemaName?: string | null };

function userFromPayload(payload: Record<string, unknown>): StoredUser {
  const displayName =
    (payload.preferred_username as string) ??
    (payload["cognito:username"] as string) ??
    (payload.email as string) ??
    (payload.name as string) ??
    (payload.sub as string) ??
    "User";
  const schemaName =
    (payload.schema_name as string) ?? (payload["custom:schema_name"] as string) ?? null;
  return {
    displayName: String(displayName),
    schemaName: schemaName ? String(schemaName) : null,
  };
}

/**
 * Reads the stored idToken from localStorage and returns display name and schema_name from the JWT payload.
 * Use for UI only; does not verify the token.
 */
export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ID_TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = decodeJwt(token) as Record<string, unknown>;
    return userFromPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Persist tokens and return the user to show (from decoded idToken).
 */
export function setStoredTokens(idToken: string, accessToken: string): StoredUser | null {
  if (typeof window === "undefined") return null;
  localStorage.setItem(ID_TOKEN_KEY, idToken);
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  try {
    const payload = decodeJwt(idToken) as Record<string, unknown>;
    return userFromPayload(payload);
  } catch {
    return { displayName: "User", schemaName: null };
  }
}

/**
 * Clear stored tokens (logout). Call this when user clicks Logout.
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
