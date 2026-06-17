// Session-based authentication from scratch. No auth library — every security
// decision is explicit and commented. HTTP concerns (cookies, headers) live in
// src/lib/auth.ts; this service only knows users, passwords, and sessions.
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { AuthError, ConflictError, ValidationError } from "@/lib/errors";
import { requireEmail, requireString, requireUsername } from "@/lib/validate";
import { userRepository } from "@/repositories/user.repository";
import { sessionRepository } from "@/repositories/session.repository";
import { tokenRepository } from "@/repositories/token.repository";
import { sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/app-url";

// bcrypt cost 12 ≈ 250ms per hash on current hardware. That is the point: an
// attacker with a stolen password_hash column can try ~4 guesses/second/core
// instead of billions. (It also means login endpoints need rate limiting —
// the slowness that hurts attackers can be turned into cheap DoS. Phase 5.)
const BCRYPT_COST = 12;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, absolute expiry
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // email-verification link: 24h
const RESET_TTL_MS = 60 * 60 * 1000; // password-reset link: 1h (short on purpose)

// Issue a fresh verification token (invalidating any prior one) and email the
// link. Shared by signup and the resend endpoint.
async function sendVerificationEmail(userId: string, email: string) {
  await tokenRepository.invalidateForUser(userId, "verify");
  const token = await tokenRepository.create(userId, "verify", VERIFY_TTL_MS);
  await sendMail({
    to: email,
    subject: "Confirm your email for Leaflet",
    text:
      `Welcome to Leaflet. Confirm your email by opening this link:\n\n` +
      `${appUrl(`/verify?token=${token}`)}\n\n` +
      `The link expires in 24 hours. If you didn't sign up, ignore this message.`,
  });
}

// Hash a session token for storage. SHA-256, NOT bcrypt, and that's correct:
// bcrypt's slowness exists to protect low-entropy human passwords. A session
// token already has 256 bits of entropy — unguessable by brute force — so the
// hash only needs to be one-way (DB dump ≠ valid credentials), not slow.
// It must also be FAST, since it runs on every authenticated request.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(userId: string) {
  // 32 bytes from the CSPRNG (never Math.random — it's predictable).
  // base64url so the value is cookie-safe without escaping.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessionRepository.create({ tokenHash: hashToken(token), userId, expiresAt });
  // Reap this user's expired sessions now that they've started a fresh one, so
  // an active account never grows a pile of dead rows (the table-growth gap
  // flagged in review). One indexed delete; no cron required.
  await sessionRepository.deleteExpiredForUser(userId);
  // The raw token leaves the server exactly once, inside the Set-Cookie
  // header. We never store or log it.
  return { token, expiresAt };
}

export const authService = {
  async signup(input: { email: unknown; username: unknown; password: unknown }) {
    const email = requireEmail(input.email);
    const username = requireUsername(input.username);
    // Length is the only password rule worth having (NIST SP 800-63B):
    // composition rules ("1 uppercase, 1 symbol") push users toward
    // predictable patterns. The cap is bcrypt's real input limit — 72 BYTES,
    // not chars (a multibyte password could otherwise be silently truncated).
    const password = requireString(input.password, "password", {
      min: 8,
      maxBytes: 72,
    });

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    let user;
    try {
      user = await userRepository.create({ email, username, passwordHash });
    } catch (e) {
      // No SELECT-then-INSERT existence check: that's a TOCTOU race (two
      // concurrent signups both pass the check). The unique index is the
      // real arbiter; we translate its violation (Prisma code P2002).
      if (isUniqueViolation(e)) {
        throw new ConflictError("That email or username is already taken");
      }
      throw e;
    }

    const session = await createSession(user.id);
    // Fire the verification email (best-effort — sendMail never throws). The
    // user is logged in immediately; verification is a nudge, not a gate.
    await sendVerificationEmail(user.id, email);
    return { user, session };
  },

  async login(input: { email: unknown; password: unknown }) {
    const email = requireEmail(input.email);
    const password = requireString(input.password, "password", {
      min: 1,
      maxBytes: 72,
    });

    const user = await userRepository.findByEmail(email);

    // Timing-safe user enumeration defense: if the email is unknown we still
    // burn one bcrypt comparison against a throwaway hash. Otherwise the
    // ~250ms (known) vs ~1ms (unknown) response-time gap tells an attacker
    // exactly which emails have accounts.
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      // One generic message for both failure modes, same reason.
      throw new AuthError("Invalid email or password");
    }

    // Session rotation: every login mints a brand-new token instead of
    // reusing an existing session. This kills session fixation — a token an
    // attacker planted (or shoulder-surfed) before login never becomes an
    // authenticated session.
    const session = await createSession(user.id);
    return { user, session };
  },

  async logout(token: string) {
    await sessionRepository.deleteByTokenHash(hashToken(token));
  },

  // Called on every authenticated request: one indexed lookup on token_hash.
  async getUserForToken(token: string) {
    const session = await sessionRepository.findValidWithUser(hashToken(token));
    return session?.user ?? null;
  },

  // Re-send the verification email (the banner's "resend" button). No-op if the
  // account is gone or already verified — and it returns the same way either
  // way, so it leaks nothing.
  async resendVerification(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || user.emailVerifiedAt) return;
    await sendVerificationEmail(user.id, user.email);
  },

  async verifyEmail(rawToken: unknown) {
    const token = requireString(rawToken, "token", { min: 1, max: 200 });
    const userId = await tokenRepository.consume(token, "verify");
    if (!userId) throw new ValidationError("This verification link is invalid or has expired.");
    await userRepository.setEmailVerified(userId);
  },

  // "Forgot password" request. ENUMERATION-SAFE: it validates the email shape
  // but always resolves the same whether or not an account exists — only
  // actually sending mail when there's a user. The caller returns a generic
  // "check your inbox" regardless.
  async requestPasswordReset(inputEmail: unknown) {
    let email: string;
    try {
      email = requireEmail(inputEmail);
    } catch {
      return; // malformed email → behave identically to "no such user"
    }
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    await tokenRepository.invalidateForUser(user.id, "reset");
    const token = await tokenRepository.create(user.id, "reset", RESET_TTL_MS);
    await sendMail({
      to: user.email,
      subject: "Reset your Leaflet password",
      text:
        `Open this link to set a new password:\n\n` +
        `${appUrl(`/reset-password?token=${token}`)}\n\n` +
        `The link expires in 1 hour. If you didn't request this, ignore this ` +
        `message — your password is unchanged.`,
    });
  },

  async resetPassword(rawToken: unknown, newPassword: unknown) {
    const token = requireString(rawToken, "token", { min: 1, max: 200 });
    const password = requireString(newPassword, "password", { min: 8, maxBytes: 72 });
    const userId = await tokenRepository.consume(token, "reset");
    if (!userId) throw new ValidationError("This reset link is invalid or has expired.");
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await userRepository.updatePassword(userId, passwordHash);
    // The reset means the account may have been compromised — drop EVERY
    // session so any attacker holding one is logged out.
    await sessionRepository.deleteAllForUser(userId);
  },

  // Authenticated password change. Verifies the current password, then keeps
  // THIS session alive but kills every other one (a hijacked session dies).
  async changePassword(
    userId: string,
    currentSessionToken: string,
    currentPassword: unknown,
    newPassword: unknown,
  ) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AuthError();
    const current = requireString(currentPassword, "current password", { min: 1, maxBytes: 72 });
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new AuthError("Current password is incorrect");

    const next = requireString(newPassword, "new password", { min: 8, maxBytes: 72 });
    const passwordHash = await bcrypt.hash(next, BCRYPT_COST);
    await userRepository.updatePassword(userId, passwordHash);
    await sessionRepository.deleteAllForUserExcept(userId, hashToken(currentSessionToken));
  },
};

// A real bcrypt hash (of an unguessable random string) so dummy comparisons
// cost the same as real ones. Generated once at module load.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString("hex"), BCRYPT_COST);

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "P2002"
  );
}
