import { createHmac } from "node:crypto";

export function cognitoSecretHash(
  username: string,
  clientId: string,
  clientSecret: string,
): string {
  return createHmac("sha256", clientSecret)
    .update(`${username}${clientId}`)
    .digest("base64");
}

export function mapCognitoError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
  const fallback =
    error instanceof Error ? error.message : "Authentication request failed";

  switch (name) {
    case "UsernameExistsException":
      return {
        statusCode: 409,
        code: name,
        message: "An account with this email already exists",
      };
    case "InvalidPasswordException":
      return {
        statusCode: 400,
        code: name,
        message:
          "Password must be at least 8 characters and include upper, lower, and a number",
      };
    case "UserNotConfirmedException":
      return {
        statusCode: 403,
        code: name,
        message: "Confirm the account with the email code before logging in",
      };
    case "CodeMismatchException":
    case "ExpiredCodeException":
      return {
        statusCode: 400,
        code: name,
        message: "The confirmation code is invalid or expired",
      };
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return {
        statusCode: 401,
        code: name,
        message: "Email or password is incorrect",
      };
    case "LimitExceededException":
    case "TooManyRequestsException":
      return {
        statusCode: 429,
        code: name,
        message: "Too many attempts. Try again later",
      };
    case "InvalidParameterException":
      return { statusCode: 400, code: name, message: fallback };
    default:
      return {
        statusCode: 500,
        code: name || "AuthError",
        message: "Authentication request failed",
      };
  }
}
