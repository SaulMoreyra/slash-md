import { describe, it, expect } from "vitest";
import { t } from "i18next";
import { prStatusParts } from "../utils/prStatusParts";

describe("prStatusParts", () => {
  it("formats approvals and checks", () => {
    const parts = prStatusParts(
      {
        prNumber: 3,
        prUrl: "https://example.com",
        title: "Review",
        branch: "review/lote",
        reviewers: [],
        checksOk: true,
        approvals: 2,
        state: "open",
      },
      t,
    );
    expect(parts[0]).toBe(t("home.pr.approvals", { count: 2 }));
    expect(parts[1]).toBe(t("home.pr.checksOk"));
  });

  it("uses waiting and pending labels", () => {
    const parts = prStatusParts(
      {
        prNumber: 3,
        prUrl: "https://example.com",
        title: "Review",
        branch: "review/lote",
        reviewers: [],
        checksOk: null,
        approvals: 0,
        state: "open",
      },
      t,
    );
    expect(parts[0]).toBe(t("home.pr.waitingApproval"));
    expect(parts[1]).toBe(t("home.pr.checksPending"));
  });
});
