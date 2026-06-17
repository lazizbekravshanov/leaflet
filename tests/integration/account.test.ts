import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { authService } from "@/services/auth.service";
import { tokenRepository } from "@/repositories/token.repository";
import { createUser, uid } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth tokens", () => {
  it("are single-use", async () => {
    const u = await createUser();
    const raw = await tokenRepository.create(u.id, "verify", 60_000);
    expect(await tokenRepository.consume(raw, "verify")).toBe(u.id);
    expect(await tokenRepository.consume(raw, "verify")).toBeNull(); // already spent
  });

  it("reject the wrong purpose and expired tokens", async () => {
    const u = await createUser();
    const verify = await tokenRepository.create(u.id, "verify", 60_000);
    expect(await tokenRepository.consume(verify, "reset")).toBeNull(); // wrong purpose
    const expired = await tokenRepository.create(u.id, "reset", -1000); // born expired
    expect(await tokenRepository.consume(expired, "reset")).toBeNull();
  });
});

describe("email verification", () => {
  it("verifies with a valid token and rejects a bad one", async () => {
    const u = await createUser(); // emailVerifiedAt starts null
    const raw = await tokenRepository.create(u.id, "verify", 60_000);
    await authService.verifyEmail(raw);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifiedAt,
    ).not.toBeNull();
    await expect(authService.verifyEmail("not-a-real-token")).rejects.toThrow();
  });
});

describe("password reset", () => {
  it("issues a token only for a real account (enumeration-safe path)", async () => {
    // unknown email: must not throw, must not create anything
    await authService.requestPasswordReset(`${uid("nobody")}@x.test`);
    // known email: exactly one outstanding reset token
    const u = await createUser();
    await authService.requestPasswordReset(u.email);
    expect(
      await prisma.authToken.count({
        where: { userId: u.id, purpose: "reset", usedAt: null },
      }),
    ).toBe(1);
  });

  it("sets the new password and drops all sessions", async () => {
    const { user } = await authService.signup({
      email: `${uid("r")}@x.test`,
      username: uid("ru").slice(0, 20),
      password: "oldpassword1",
    });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);

    const raw = await tokenRepository.create(user.id, "reset", 60_000);
    await authService.resetPassword(raw, "brandnewpass1");

    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("brandnewpass1", fresh.passwordHash)).toBe(true);
  });
});

describe("change password", () => {
  it("checks the current password and keeps only this session", async () => {
    const { user, session } = await authService.signup({
      email: `${uid("c")}@x.test`,
      username: uid("cu").slice(0, 20),
      password: "currentpass1",
    });
    // a second device
    await prisma.session.create({
      data: { tokenHash: `other_${uid("")}`, userId: user.id, expiresAt: new Date(Date.now() + 1e9) },
    });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(2);

    await expect(
      authService.changePassword(user.id, session.token, "wrongpass", "newpass123"),
    ).rejects.toThrow();

    await authService.changePassword(user.id, session.token, "currentpass1", "newpass123");
    // only the current device survives
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("newpass123", fresh.passwordHash)).toBe(true);
  });
});
