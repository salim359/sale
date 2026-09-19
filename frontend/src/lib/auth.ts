import {
  confirmAccount,
  loginAccount,
  resendConfirmation,
  signupAccount,
} from "../api/client";
import type { Profile } from "./storage";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<{ confirmationRequired: boolean; profile: Profile }> {
  const profile = validateProfile(name, email);
  validatePassword(password);

  try {
    const result = await signupAccount({
      name: profile.name,
      email: profile.email,
      password,
    });
    return {
      confirmationRequired: result.confirmationRequired,
      profile,
    };
  } catch (error) {
    throw toAuthError(error, "Could not create account.");
  }
}

export async function confirmRegistration(
  email: string,
  code: string,
): Promise<void> {
  const address = email.trim().toLowerCase();
  const trimmedCode = code.trim();
  if (!address || !trimmedCode) {
    throw new AuthError("Enter the confirmation code from your email.");
  }

  try {
    await confirmAccount(address, trimmedCode);
  } catch (error) {
    throw toAuthError(error, "Could not confirm account.");
  }
}

export async function resendRegistrationCode(email: string): Promise<void> {
  try {
    await resendConfirmation(email.trim().toLowerCase());
  } catch (error) {
    throw toAuthError(error, "Could not resend the confirmation code.");
  }
}

export async function authenticateAccount(
  email: string,
  password: string,
): Promise<Profile> {
  const address = email.trim().toLowerCase();
  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  try {
    const user = await loginAccount(address, password);
    return {
      name: user.name?.trim() || address.split("@")[0] || address,
      email: user.email ?? address,
    };
  } catch (error) {
    throw toAuthError(error, "Email or password is incorrect.");
  }
}

function validateProfile(name: string, email: string): Profile {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedName) throw new AuthError("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new AuthError("Enter a valid email.");
  }
  return { name: trimmedName, email: trimmedEmail };
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new AuthError(
      "Password must include uppercase, lowercase, and a number.",
    );
  }
}

function toAuthError(error: unknown, fallback: string): AuthError {
  if (error instanceof AuthError) return error;
  if (error instanceof Error && error.message) {
    return new AuthError(error.message);
  }
  return new AuthError(fallback);
}
