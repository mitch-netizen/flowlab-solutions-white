import { automationPreferenceDescriptors } from "@flowlab/contracts";

export type PreferenceMap = Record<string, boolean>;

export function toQueueSummary(failed: number) {
  return failed > 0
    ? `${failed} failed job${failed === 1 ? "" : "s"} need attention`
    : "No failed jobs right now";
}

export function recipeToPreferenceMap(recipeKeys: string[], current: PreferenceMap): PreferenceMap {
  const next = { ...current };

  for (const descriptor of automationPreferenceDescriptors) {
    if (descriptor.group === "built_in" || descriptor.group === "advanced") {
      next[descriptor.key] = recipeKeys.includes(descriptor.key);
    }
  }

  return next;
}
