// Minimal hand-rolled input validation. A library (zod) earns its keep once
// schemas get nested/reused; for flat request bodies these helpers keep the
// dependency count down and the failure messages explicit.
import { ValidationError } from "@/lib/errors";

export function requireString(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    throw new ValidationError(`${field} must be at least ${opts.min} characters`);
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ValidationError(`${field} must be at most ${opts.max} characters`);
  }
  return trimmed;
}

export function requireInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  if (opts.min !== undefined && n < opts.min) {
    throw new ValidationError(`${field} must be at least ${opts.min}`);
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new ValidationError(`${field} must be at most ${opts.max}`);
  }
  return n;
}

// Deliberately loose — full RFC 5322 regexes reject real addresses. The only
// way to truly validate an email is to send one to it.
export function requireEmail(value: unknown): string {
  const email = requireString(value, "email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("email is not valid");
  }
  return email;
}

export function requireUsername(value: unknown): string {
  const username = requireString(value, "username").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new ValidationError(
      "username must be 3-20 characters: lowercase letters, digits, underscore",
    );
  }
  return username;
}
