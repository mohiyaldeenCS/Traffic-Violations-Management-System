import { describe, expect, it, vi, beforeEach } from "vitest";
import { api, describeError, navigation, refreshCsrf } from "./api";
beforeEach(() => vi.restoreAllMocks());
describe("role navigation and API boundary", () => {
  it("keeps staff-only views out of citizen navigation", () => {
    expect(navigation("citizen").map((x) => x.id)).not.toEqual(
      expect.arrayContaining(["users", "audit", "rules", "cameras"]),
    );
    expect(navigation("admin").map((x) => x.id)).toContain("audit");
    expect(navigation("reviewer").map((x) => x.id)).not.toContain("payments");
  });
  it("preserves validation error detail", () =>
    expect(
      describeError({ amount: ["Wrong amount"], detail: "Conflict" }),
    ).toBe("amount: Wrong amount — Conflict"));
  it("sends session cookie and CSRF on mutations without token storage", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "token" })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 })));
    await refreshCsrf();
    await api("cases/", { reason: "Review" });
    expect(fetch.mock.calls[1][1]).toMatchObject({
      credentials: "same-origin",
      method: "POST",
      headers: { "X-CSRFToken": "token" },
    });
  });
  it("rejects unsuccessful requests without displaying false success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Version conflict" }), {
        status: 409,
      }),
    );
    await expect(api("cases/")).rejects.toThrow("Version conflict");
  });
});
