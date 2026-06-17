import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export type TokenPurpose = "verify" | "reset";

// Same security model as sessions: the emailed link carries the RAW token, the
// DB stores only its SHA-256 hash, so a DB dump can't be turned into a working
// link. SHA-256 (not bcrypt) is right here too — the token is 256 bits of
// CSPRNG entropy, so it only needs to be one-way, not slow.
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const tokenRepository = {
  // Mint a token; returns the RAW value (the only time it exists in plaintext).
  async create(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
    const raw = randomBytes(32).toString("base64url");
    await prisma.authToken.create({
      data: {
        tokenHash: hashToken(raw),
        userId,
        purpose,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return raw;
  },

  // Validate + spend in one shot. Returns the userId, or null if the token is
  // unknown / wrong purpose / expired / already used. Single-use is enforced by
  // the `usedAt: null` guard on the UPDATE: two concurrent consumes race on it
  // and exactly one wins.
  async consume(rawToken: string, purpose: TokenPurpose): Promise<string | null> {
    const tokenHash = hashToken(rawToken);
    const row = await prisma.authToken.findUnique({ where: { tokenHash } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) {
      return null;
    }
    const res = await prisma.authToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return res.count === 1 ? row.userId : null;
  },

  // Burn any outstanding tokens of a purpose (e.g. before issuing a fresh one,
  // or after a successful reset) so old links stop working.
  async invalidateForUser(userId: string, purpose: TokenPurpose): Promise<void> {
    await prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
