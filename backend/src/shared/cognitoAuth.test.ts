import { describe, expect, it } from "vitest";
import { cognitoSecretHash, mapCognitoError } from "./cognitoAuth.js";

describe("cognitoAuth", () => {
  it("computes the Cognito SECRET_HASH", () => {
    expect(cognitoSecretHash("user@example.com", "client-id", "secret")).toBe(
      "wQTLkWZFTpU6HWvFttXrN0fP4K0di1uyOisPC6yFfhU=",
    );
  });

  it("maps Cognito signup and login errors", () => {
    expect(mapCognitoError({ name: "UsernameExistsException" })).toMatchObject({
      statusCode: 409,
      code: "UsernameExistsException",
    });
    expect(mapCognitoError({ name: "UserNotConfirmedException" })).toMatchObject({
      statusCode: 403,
      code: "UserNotConfirmedException",
    });
    expect(mapCognitoError({ name: "NotAuthorizedException" })).toMatchObject({
      statusCode: 401,
    });
  });
});
