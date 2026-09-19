import type { APIGatewayProxyResult } from "aws-lambda";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function emptyResponse(statusCode: number): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: "",
  };
}
