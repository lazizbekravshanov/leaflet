import { describe, it, expect } from "vitest";
import { assertSameOrigin } from "@/lib/csrf";
import { ValidationError } from "@/lib/errors";

function req(headers: Record<string, string>) {
  return new Request("https://leaflet.app/api/x", { method: "POST", headers });
}

describe("assertSameOrigin", () => {
  it("passes when Origin host matches Host", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://leaflet.app", host: "leaflet.app" })),
    ).not.toThrow();
  });

  it("passes when there is no Origin (same-origin non-CORS)", () => {
    expect(() => assertSameOrigin(req({ host: "leaflet.app" }))).not.toThrow();
  });

  it("rejects a cross-origin Origin", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://evil.com", host: "leaflet.app" })),
    ).toThrow(ValidationError);
  });

  it("compares against x-forwarded-host when present (the proxy case)", () => {
    expect(() =>
      assertSameOrigin(
        req({ origin: "https://leaflet.app", host: "internal", "x-forwarded-host": "leaflet.app" }),
      ),
    ).not.toThrow();
  });

  it("rejects a malformed Origin", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "://bad", host: "leaflet.app" })),
    ).toThrow(/Malformed Origin/);
  });
});
