import { describe, expect, it } from "vitest";

import { businessTypeSchema, getPricingModel, getTradePreset, tradePresetOptions } from "@flowlab/contracts";
import { getDefaultIntegrationManagementMode } from "@flowlab/db";
import { buildServiceAreaPreview, suggestServiceAreaSuburbs } from "@flowlab/integrations/google-maps";

describe("expanded trade presets", () => {
  it("has a complete preset for every business type", () => {
    for (const businessType of businessTypeSchema.options) {
      const preset = getTradePreset(businessType);
      expect(preset.businessType).toBe(businessType);
      expect(preset.label.length).toBeGreaterThan(1);
      expect(preset.pricingRate.minimumCharge).toBeGreaterThan(0);
      expect(preset.serviceTemplates.length).toBeGreaterThanOrEqual(3);
      expect(preset.enquiryPrompts.length).toBeGreaterThan(0);
      expect(preset.quoteChecklist.length).toBeGreaterThan(0);
      expect(preset.scheduleDefaults.serviceRadiusKm).toBeGreaterThan(0);
    }
  });

  it("exposes grouped signup/onboarding options", () => {
    const groups = new Set(tradePresetOptions.map((option) => option.group));
    expect(groups).toEqual(new Set(["home_services", "outdoor_property", "cleaning_compliance", "mobile_other"]));
    expect(tradePresetOptions.some((option) => option.businessType === "plumbing")).toBe(true);
    expect(tradePresetOptions.some((option) => option.businessType === "test_and_tag")).toBe(true);
  });

  it("uses expected pricing models for representative trades", () => {
    expect(getPricingModel("lawn_mowing")).toBe("area_based");
    expect(getPricingModel("residential_cleaning")).toBe("hourly");
    expect(getPricingModel("plumbing")).toBe("callout_plus_hourly");
    expect(getPricingModel("pest_control")).toBe("flat_rate");
  });
});

describe("platform-managed integration defaults", () => {
  it("classifies integrations by default management model", () => {
    expect(getDefaultIntegrationManagementMode("google_maps")).toBe("platform_managed");
    expect(getDefaultIntegrationManagementMode("claude")).toBe("platform_managed");
    expect(getDefaultIntegrationManagementMode("xero")).toBe("connected_account");
    expect(getDefaultIntegrationManagementMode("make_com")).toBe("advanced_optional");
  });
});

describe("service area maps helpers", () => {
  it("normalises suggested suburbs without duplicates", () => {
    expect(
      suggestServiceAreaSuburbs({
        baseSuburb: "Tannum Sands",
        formattedAddress: "Tannum Sands QLD, Australia",
        manualSuburbs: ["Boyne Island", "Tannum Sands"]
      })
    ).toEqual(["Tannum Sands", "Boyne Island"]);
  });

  it("returns no preview URL when no platform key exists", () => {
    const saved = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    expect(buildServiceAreaPreview({ address: "Tannum Sands QLD", radiusKm: 25 })).toBeNull();
    if (saved !== undefined) process.env.GOOGLE_MAPS_API_KEY = saved;
  });
});
