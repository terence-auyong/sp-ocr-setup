# AWS Cognito Authentication Documentation

This document describes the AWS Cognito authentication implementation for the application.

## Overview

The application uses AWS Cognito for user authentication with username and password. The implementation uses the SRP (Secure Remote Password) flow, which is the default authentication method and doesn't require special IAM permissions or client configuration.

## Features

- ✅ Username/password login
- ✅ JWT token-based authentication
- ✅ Token verification and validation
- ✅ Protected API routes
- ✅ User information extraction from tokens
- ✅ Support for both Authorization header and cookies

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# AWS Cognito Configuration
AWS_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_2NMv5dxr7
COGNITO_CLIENT_ID=your-client-id-here
```

**Note:** You can also use `NEXT_PUBLIC_` prefix if you need these values in the browser:
```env
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_2NMv5dxr7
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id-here
```

### 2. Dependencies

The following packages are required (already installed):

- `@aws-sdk/client-cognito-identity-provider` - AWS SDK for Cognito
- `amazon-cognito-identity-js` - Cognito authentication library (handles SRP flow)
- `jose` - JWT token verification

## Architecture

### File Structure

```
lib/
  ├── cognito.ts      # Cognito authentication functions
  ├── auth.ts         # JWT verification and user extraction
  └── middleware.ts   # Route protection helpers

app/
  ├── api/
  │   └── auth/
  │       ├── login/route.ts  # Login endpoint
  │       ├── me/route.ts     # Get current user
  │       └── test/route.ts   # Example protected routes
  └── (auth)/
      └── login/
          └── page.tsx         # Login page component

components/
  └── LoginPopup.tsx           # Login popup component
```

## Authentication Flow

### 1. User Login

1. User enters username and password
2. Frontend sends credentials to `/api/auth/login`
3. Backend authenticates with Cognito using SRP flow
4. Cognito returns JWT tokens (Access Token, ID Token, Refresh Token)
5. Tokens are stored in:
   - `localStorage` (frontend)
   - HTTP-only cookies (backend)

### 2. Token Usage

Tokens can be sent to the backend in two ways:

**Option 1: Authorization Header (Recommended)**
```javascript
fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
})
```

**Option 2: Cookies (Automatic)**
The login endpoint sets HTTP-only cookies automatically. Subsequent requests will include these cookies.

## API Endpoints

### POST `/api/auth/login`

Authenticate a user with username and password.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "accessToken": "eyJraWQiOiJ...",
  "idToken": "eyJraWQiOiJ...",
  "expiresIn": 3600
}
```

**Response (Error):**
```json
{
  "error": "Invalid username or password"
}
```

### GET `/api/auth/me`

Get the current authenticated user's information.

**Headers:**
```
Authorization: Bearer <idToken>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "username": "user@example.com",
    "email": "user@example.com",
    "emailVerified": true,
    "groups": [],
    "attributes": {
      "sub": "user-uuid",
      "email": "user@example.com",
      ...
    }
  }
}
```

### GET `/api/auth/test`

Example of a protected route that requires authentication.

**Headers:**
```
Authorization: Bearer <idToken>
```

**Response:**
```json
{
  "success": true,
  "message": "You are authenticated!",
  "user": {
    "id": "user-uuid",
    "username": "user@example.com",
    "email": "user@example.com",
    "emailVerified": true,
    "groups": []
  }
}
```

## Usage Examples

### Frontend: Login Component

The login functionality is already implemented in:
- `app/(auth)/login/page.tsx` - Full login page
- `components/LoginPopup.tsx` - Login popup component

**Example usage:**
```typescript
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ username, password }),
});

const data = await response.json();
if (data.success) {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("idToken", data.idToken);
}
```

### Backend: Protect API Routes

#### Option 1: Required Authentication

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  // Check authentication
  const authResult = await requireAuth(req);
  
  if (authResult.response) {
    // User is not authenticated - return 401
    return authResult.response;
  }

  // User is authenticated
  const { user } = authResult;
  
  // Use user information
  console.log("User ID:", user.sub);
  console.log("Email:", user.email);
  
  return NextResponse.json({ message: "Protected data" });
}
```

#### Option 2: Optional Authentication

```typescript
import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const user = await optionalAuth(req);
  
  if (user) {
    // User is authenticated
    return NextResponse.json({ 
      message: "Hello authenticated user",
      userId: user.sub 
    });
  }
  
  // User is not authenticated (but that's OK)
  return NextResponse.json({ 
    message: "Hello guest" 
  });
}
```

#### Option 3: Manual Token Extraction

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, decodeCognitoToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Method 1: Use helper function (verifies token)
  const user = await getUserFromRequest(req);
  
  // Method 2: Manual extraction
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : null;
  
  if (token) {
    const userInfo = decodeCognitoToken(token);
    // Use userInfo...
  }
}
```

## Utility Functions

### `lib/cognito.ts`

#### `authenticateUser(username, password)`

Authenticates a user with Cognito using SRP flow.

```typescript
const result = await authenticateUser("user@example.com", "password");
if (result.success) {
  console.log("Access Token:", result.accessToken);
  console.log("ID Token:", result.idToken);
}
```

### `lib/auth.ts`

#### `verifyCognitoToken(token, tokenType)`

Verifies and decodes a JWT token. Verifies signature using Cognito's JWKS.

```typescript
const userInfo = await verifyCognitoToken(idToken, "id");
// Returns: { sub, email, email_verified, ... }
```

#### `getUserFromRequest(req)`

Extracts and verifies user from request (checks Authorization header and cookies).

```typescript
const user = await getUserFromRequest(request);
```

#### `decodeCognitoToken(token)`

Simple token decoding without verification (for quick checks).

```typescript
const userInfo = decodeCognitoToken(token);
```

### `lib/middleware.ts`

#### `requireAuth(req)`

Requires authentication. Returns user or 401 error response.

```typescript
const authResult = await requireAuth(req);
if (authResult.response) {
  return authResult.response; // 401 Unauthorized
}
const { user } = authResult;
```

#### `optionalAuth(req)`

Optional authentication. Returns user if available, null otherwise.

```typescript
const user = await optionalAuth(req);
```

## Token Information

### ID Token Claims

The ID token contains user information:

```typescript
{
  sub: string;                    // User UUID
  email?: string;                  // User email
  email_verified?: boolean;        // Email verification status
  "cognito:username"?: string;    // Cognito username
  "cognito:groups"?: string[];    // User groups
  // ... other custom attributes
}
```

### Access Token

The access token is used for API authorization but contains less user information. Use the ID token for user identification.

## Security Considerations

1. **Token Storage**: 
   - Tokens are stored in `localStorage` on the frontend
   - HTTP-only cookies are also set for backend requests
   - Consider using only cookies in production for better security

2. **Token Verification**:
   - Tokens are verified using Cognito's JWKS (JSON Web Key Set)
   - Signature verification ensures tokens haven't been tampered with
   - Token expiration is automatically checked

3. **HTTPS**: 
   - Always use HTTPS in production
   - Cookies are set with `secure: true` in production

4. **Token Expiration**:
   - Tokens expire after 1 hour by default
   - Implement token refresh logic for long-lived sessions

## Error Handling

Common error codes and messages:

- `NotAuthorizedException` → "Invalid username or password"
- `UserNotFoundException` → "User not found"
- `UserNotConfirmedException` → "User account is not confirmed"
- `PasswordResetRequiredException` → "Password reset is required"
- `InvalidParameterException` → "Invalid parameters provided"

## Testing

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"password123"}'
```

### Test Protected Route

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Test Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: idToken=YOUR_ID_TOKEN"
```

## Troubleshooting

### "USER_PASSWORD_AUTH flow not enabled"

**Solution:** The implementation uses SRP flow by default, which doesn't require this. If you see this error, ensure you're using the latest code that uses `amazon-cognito-identity-js`.

### "AWS credentials not configured"

**Solution:** No AWS credentials are needed! The SRP flow works without IAM permissions. Ensure your environment variables are set correctly.

### "Invalid or expired token"

**Solution:** 
- Check that the token hasn't expired (default: 1 hour)
- Ensure you're using the ID token, not the access token
- Verify the token is being sent correctly in the Authorization header

### Token verification fails

**Solution:**
- Check that `COGNITO_USER_POOL_ID` and `AWS_REGION` are correct
- Ensure the token is from the correct User Pool
- Check network connectivity to Cognito's JWKS endpoint

## Future Enhancements

Potential improvements:

- [ ] Token refresh mechanism
- [ ] Password reset flow
- [ ] User registration
- [ ] Multi-factor authentication (MFA)
- [ ] Social login (Google, Facebook, etc.)
- [ ] Session management
- [ ] Role-based access control (RBAC) using Cognito groups

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [amazon-cognito-identity-js Documentation](https://github.com/amazon-archives/amazon-cognito-identity-js)
- [JWT.io](https://jwt.io/) - JWT token decoder
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
