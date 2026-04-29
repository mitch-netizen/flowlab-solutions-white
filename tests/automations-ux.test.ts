import { describe, expect, it } from "vitest";

import {
  recipeToPreferenceMap,
  toQueueSummary
} from "../apps/portal/app/dashboard/automations/automations-client.helpers";
import {
  automationPreferenceDescriptors,
  automationRecipeDescriptors
} from "@flowlab/contracts";

describe("automations client helpers", () => {
  it("formats queue summary", () => {
    expect(toQueueSummary(0)).toBe("No failed jobs right now");
    expect(toQueueSummary(1)).toBe("1 failed job need attention");
    expect(toQueueSummary(3)).toBe("3 failed jobs need attention");
  });

  it("applies recipe keys to built-in and advanced preferences", () => {
    const baseline: Record<string, boolean> = {};
    for (const descriptor of automationPreferenceDescriptors) {
      baseline[descriptor.key] = false;
    }

    const recipe = automationRecipeDescriptors[0];
    const updated = recipeToPreferenceMap(recipe.enables, baseline);

    for (const descriptor of automationPreferenceDescriptors) {
      if (descriptor.group === "built_in" || descriptor.group === "advanced") {
        expect(updated[descriptor.key]).toBe(recipe.enables.includes(descriptor.key));
      }
    }
  });
});
