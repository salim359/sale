import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import {
  cognitoSecretHash,
  mapCognitoError,
} from "../shared/cognitoAuth.js";
import { emptyResponse, jsonResponse } from "./http.js";

const client = new CognitoIdentityProviderClient({});
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID ?? "";
const USER_POOL_CLIENT_SECRET = process.env.USER_POOL_CLIENT_SECRET ?? "";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

const ConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  email: z.string().email(),
  refreshToken: z.string().min(1),
});

const EmailSchema = z.object({
  email: z.string().email(),
});

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return emptyResponse(204);
    }

    if (!USER_POOL_CLIENT_ID || !USER_POOL_CLIENT_SECRET) {
      return jsonResponse(500, { message: "Auth is not configured" });
    }

    const resource = event.resource;
    const method = event.httpMethod;

    if (method === "POST" && resource === "/auth/signup") {
      return await signup(event.body);
    }
    if (method === "POST" && resource === "/auth/confirm") {
      return await confirm(event.body);
    }
    if (method === "POST" && resource === "/auth/login") {
      return await login(event.body);
    }
    if (method === "POST" && resource === "/auth/refresh") {
      return await refresh(event.body);
    }
    if (method === "POST" && resource === "/auth/resend") {
      return await resend(event.body);
    }
    if (method === "GET" && resource === "/auth/me") {
      return me(event);
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    const mapped = mapCognitoError(error);
    if (mapped.statusCode >= 500) {
      console.error(error);
    }
    return jsonResponse(mapped.statusCode, {
      message: mapped.message,
      code: mapped.code,
    });
  }
};

async function signup(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  const body = parseBody(rawBody, SignupSchema);
  if ("error" in body) return body.error;

  const email = body.data.email.toLowerCase();
  const result = await client.send(
    new SignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      Password: body.data.password,
      SecretHash: secretHash(email),
      UserAttributes: [
        { Name: "email", Value: email },
        ...(body.data.name ? [{ Name: "name", Value: body.data.name }] : []),
      ],
    }),
  );

  return jsonResponse(201, {
    userSub: result.UserSub,
    confirmationRequired: !(result.UserConfirmed ?? false),
    message: "Check email for the confirmation code",
  });
}

async function confirm(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  const body = parseBody(rawBody, ConfirmSchema);
  if ("error" in body) return body.error;

  const email = body.data.email.toLowerCase();
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: body.data.code,
      SecretHash: secretHash(email),
    }),
  );

  return jsonResponse(200, { confirmed: true, email });
}

async function login(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  const body = parseBody(rawBody, LoginSchema);
  if ("error" in body) return body.error;

  const email = body.data.email.toLowerCase();
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: body.data.password,
        SECRET_HASH: secretHash(email),
      },
    }),
  );

  return tokensResponse(result.AuthenticationResult);
}

async function refresh(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  const body = parseBody(rawBody, RefreshSchema);
  if ("error" in body) return body.error;

  const email = body.data.email.toLowerCase();
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: body.data.refreshToken,
        SECRET_HASH: secretHash(email),
        USERNAME: email,
      },
    }),
  );

  return tokensResponse(result.AuthenticationResult, body.data.refreshToken);
}

async function resend(
  rawBody: string | null,
): Promise<APIGatewayProxyResult> {
  const body = parseBody(rawBody, EmailSchema);
  if ("error" in body) return body.error;

  const email = body.data.email.toLowerCase();
  await client.send(
    new ResendConfirmationCodeCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      SecretHash: secretHash(email),
    }),
  );

  return jsonResponse(200, { sent: true, email });
}

function me(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const claims = event.requestContext.authorizer?.claims ?? {};
  if (!claims.sub) {
    return jsonResponse(401, { message: "Unauthorized" });
  }

  return jsonResponse(200, {
    sub: claims.sub,
    email: claims.email ?? null,
    name: claims.name ?? null,
  });
}

function tokensResponse(
  result:
    | {
        IdToken?: string;
        AccessToken?: string;
        RefreshToken?: string;
        ExpiresIn?: number;
        TokenType?: string;
      }
    | undefined,
  refreshToken?: string,
): APIGatewayProxyResult {
  if (!result?.IdToken || !result.AccessToken) {
    return jsonResponse(401, { message: "Authentication failed" });
  }

  return jsonResponse(200, {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken ?? refreshToken,
    expiresIn: result.ExpiresIn ?? 3600,
    tokenType: result.TokenType ?? "Bearer",
  });
}

function secretHash(username: string): string {
  return cognitoSecretHash(
    username,
    USER_POOL_CLIENT_ID,
    USER_POOL_CLIENT_SECRET,
  );
}

function parseBody<T>(
  rawBody: string | null,
  schema: z.ZodType<T>,
): { data: T } | { error: APIGatewayProxyResult } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody ?? "");
  } catch {
    return { error: jsonResponse(400, { message: "Request body must be JSON" }) };
  }

  const body = schema.safeParse(parsed);
  if (!body.success) {
    return {
      error: jsonResponse(400, {
        message: "Invalid request body",
        issues: body.error.issues.map((issue) => issue.message),
      }),
    };
  }

  return { data: body.data };
}
