import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

// Cognito configuration
export const cognitoConfig = {
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  userPoolId: process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
  clientId: process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
};

/**
 * Authenticate user with username and password using SRP (Secure Remote Password) flow
 * This is the default authentication flow and doesn't require admin permissions
 * or enabling USER_PASSWORD_AUTH on the client
 */
export async function authenticateUser(username: string, password: string): Promise<{
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      if (!cognitoConfig.userPoolId || !cognitoConfig.clientId) {
        resolve({
          success: false,
          error: "Cognito configuration is missing. Please set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID",
        });
        return;
      }

      const poolData = {
        UserPoolId: cognitoConfig.userPoolId,
        ClientId: cognitoConfig.clientId,
      };

      const userPool = new CognitoUserPool(poolData);
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          resolve({
            success: true,
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
            expiresIn: result.getAccessToken().getExpiration(),
          });
        },
        onFailure: (err: any) => {
          // Provide more helpful error messages
          let errorMessage = err.message || "Authentication failed";
          
          if (err.code === "NotAuthorizedException") {
            errorMessage = "Invalid username or password";
          } else if (err.code === "UserNotFoundException") {
            errorMessage = "User not found";
          } else if (err.code === "InvalidParameterException") {
            errorMessage = "Invalid parameters provided";
          } else if (err.code === "UserNotConfirmedException") {
            errorMessage = "User account is not confirmed. Please verify your email/phone number.";
          } else if (err.code === "PasswordResetRequiredException") {
            errorMessage = "Password reset is required";
          }
          
          resolve({
            success: false,
            error: errorMessage,
          });
        },
        newPasswordRequired: (userAttributes: any, requiredAttributes: any) => {
          // Handle new password required (for first-time login or password reset)
          resolve({
            success: false,
            error: "New password is required. Please use the password reset flow.",
          });
        },
      });
    } catch (error: any) {
      resolve({
        success: false,
        error: error.message || "Authentication failed",
      });
    }
  });
}
