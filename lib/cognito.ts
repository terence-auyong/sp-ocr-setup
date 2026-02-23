import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { type EdtrStage } from "./edtr-stage-constants";

const COGNITO_REGION =
  process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1";

const ENV_KEYS: Record<EdtrStage, { userPoolId: string; clientId: string }> = {
  dev: {
    userPoolId: "DEV_COGNITO_USER_POOL_ID",
    clientId: "DEV_COGNITO_CLIENT_ID",
  },
  qa: {
    userPoolId: "QA_COGNITO_USER_POOL_ID",
    clientId: "QA_COGNITO_CLIENT_ID",
  },
  uat: {
    userPoolId: "UAT_COGNITO_USER_POOL_ID",
    clientId: "UAT_COGNITO_CLIENT_ID",
  },
  prod: {
    userPoolId: "PROD_COGNITO_USER_POOL_ID",
    clientId: "PROD_COGNITO_CLIENT_ID",
  },
};

export function getCognitoConfigForStage(stage: EdtrStage): {
  region: string;
  userPoolId: string;
  clientId: string;
} {
  const keys = ENV_KEYS[stage];
  const userPoolId = process.env[keys.userPoolId] ?? "";
  const clientId = process.env[keys.clientId] ?? "";
  return {
    region: COGNITO_REGION,
    userPoolId,
    clientId,
  };
}

// Legacy single config: uses dev env vars
export const cognitoConfig = {
  region: COGNITO_REGION,
  userPoolId: process.env.DEV_COGNITO_USER_POOL_ID ?? process.env.COGNITO_USER_POOL_ID ?? "",
  clientId: process.env.DEV_COGNITO_CLIENT_ID ?? process.env.COGNITO_CLIENT_ID ?? "",
};

/**
 * Authenticate user with username and password using SRP (Secure Remote Password) flow.
 * Uses the Cognito User Pool and App Client for the given stage (dev | qa | uat | prod).
 */
export async function authenticateUser(
  username: string,
  password: string,
  stage: EdtrStage = "dev"
): Promise<{
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  const config = getCognitoConfigForStage(stage);
  return new Promise((resolve) => {
    try {
      if (!config.userPoolId || !config.clientId) {
        resolve({
          success: false,
          error: "Cognito configuration is missing for this environment.",
        });
        return;
      }

      const poolData = {
        UserPoolId: config.userPoolId,
        ClientId: config.clientId,
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
