import { NextResponse } from "next/server";

import { applyAutomationRecipe } from "@flowlab/db";
import { automationRecipeDescriptors } from "@flowlab/contracts";

import { requireTenantSession } from "../../../../../lib/session";

const recipeKeys = new Set(automationRecipeDescriptors.map((recipe) => recipe.key));

export async function POST(request: Request) {
  const session = await requireTenantSession();
  const formData = await request.formData();
  const recipeKey = String(formData.get("recipeKey") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/automations");

  if (!recipeKeys.has(recipeKey as (typeof automationRecipeDescriptors)[number]["key"])) {
    return NextResponse.redirect(new URL("/dashboard/automations?error=invalid_recipe", request.url), 303);
  }

  await applyAutomationRecipe({
    tenantId: session.tenantId,
    recipeKey: recipeKey as (typeof automationRecipeDescriptors)[number]["key"]
  });

  const url = new URL(returnTo, request.url);
  url.searchParams.set("recipe", recipeKey);
  return NextResponse.redirect(url, 303);
}
