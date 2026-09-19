import type { Profile } from "./storage";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

interface Account {
  name: string;
  email: string;
  passwordHash: string;
}

const ACCOUNTS_KEY = "sale-scout-accounts";

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<Profile> {
  const profile = validateProfile(name, email);
  const secret = validatePassword(password);
  const accounts = readAccounts();
  const key = profile.email.toLowerCase();

  if (accounts.some((account) => account.email.toLowerCase() === key)) {
    throw new AuthError("An account with this email already exists.");
  }

  accounts.push({
    name: profile.name,
    email: profile.email,
    passwordHash: await hashPassword(secret),
  });
  writeAccounts(accounts);
  return profile;
}

export async function authenticateAccount(
  email: string,
  password: string,
): Promise<Profile> {
  const address = email.trim().toLowerCase();
  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  const account = readAccounts().find((item) => item.email.toLowerCase() === address);
  if (!account || account.passwordHash !== (await hashPassword(password))) {
    throw new AuthError("Email or password is incorrect.");
  }

  return { name: account.name, email: account.email };
}

function validateProfile(name: string, email: string): Profile {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) throw new AuthError("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new AuthError("Enter a valid email.");
  }
  return { name: trimmedName, email: trimmedEmail };
}

function validatePassword(password: string): string {
  if (password.length < 6) {
    throw new AuthError("Password must be at least 6 characters.");
  }
  return password;
}

function readAccounts(): Account[] {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Account[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
