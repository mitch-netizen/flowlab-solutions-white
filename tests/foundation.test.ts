import { describe, expect, it } from "vitest";

import { getPlanFeatures } from "@flowlab/contracts";
import { buildAutomationBlueprintPayloads, decryptJson, encryptJson, verifyDocuSealEventSecret } from "@flowlab/integrations";

describe("platform foundation", () => {
  it("enforces plan-level feature flags", () => {
    expect(getPlanFeatures("starter").customDomain).toBe(false);
    expect(getPlanFeatures("professional").customDomain).toBe(true);
    expect(getPlanFeatures("growth").apiAccess).toBe(true);
  });

  it("round-trips encrypted integration credentials", () => {
    const payload = { apiKey: "demo-key", sender: "tenant@example.com" };
    const encrypted = encryptJson(payload);

    expect(encrypted).not.toContain("demo-key");
    expect(decryptJson(encrypted)).toEqual(payload);
  });

  it("builds all automation blueprint payloads", () => {
    const payloads = buildAutomationBlueprintPayloads({
      tenantSlug: "lawnorder",
      businessName: "Lawn & Order Mowing"
    });

    expect(payloads).toHaveLength(16);
    expect(payloads[0]?.filename).toBe("new_enquiry.json");
    expect(payloads[0]?.contents).toContain("lawnorder.flowlabsolutions.au");
  });

  it("verifies DocuSeal optional webhook secrets", () => {
    const headers = new Headers({ "x-docuseal-secret": "abc123" });
    expect(
      verifyDocuSealEventSecret({
        expectedHeaderName: "x-docuseal-secret",
        expectedHeaderValue: "abc123",
        headers
      })
    ).toBe(true);
  });
});
