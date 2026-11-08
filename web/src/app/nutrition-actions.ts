"use server";

import { getNutritionDetail, type NutritionDetail } from "@/lib/nutrition-detail";

/**
 * One menu item's full nutrition label and ingredients, for the detail panel.
 * Null when the item has no nutrition (never fetched, or a bad recipe id: the
 * input is untrusted, so it is re-validated).
 */
export async function loadNutritionDetail(recipeId: unknown): Promise<NutritionDetail | null> {
  if (typeof recipeId !== "number" || !Number.isSafeInteger(recipeId)) return null;
  return getNutritionDetail(recipeId);
}
