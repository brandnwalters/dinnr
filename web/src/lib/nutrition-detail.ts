import { query } from "./db";

export type Micronutrient = { name: string; amount: number | null; unit: string };

/**
 * One recipe's full nutrition label and ingredients, as UNC prints it.
 * Amounts are null where the label leaves them blank.
 */
export type NutritionDetail = {
  recipeId: number;
  name: string | null;
  servingSize: string | null;
  calories: number | null;
  totalFatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbohydrateG: number | null;
  dietaryFiberG: number | null;
  sugarsG: number | null;
  addedSugarG: number | null;
  proteinG: number | null;
  /** In label order (Calcium, Iron, Potassium, Vitamin D). */
  micronutrients: Micronutrient[];
  ingredients: string | null;
};

/** The nutrition detail for `recipeId`, or null if its nutrition was never fetched. */
export async function getNutritionDetail(recipeId: number): Promise<NutritionDetail | null> {
  // numeric comes back from node-pg as a string, hence the float8 casts.
  const [row] = await query<NutritionDetail>(
    `select recipe_id               as "recipeId",
            name,
            serving_size            as "servingSize",
            calories::float8        as calories,
            total_fat_g::float8     as "totalFatG",
            saturated_fat_g::float8 as "saturatedFatG",
            trans_fat_g::float8     as "transFatG",
            cholesterol_mg::float8  as "cholesterolMg",
            sodium_mg::float8       as "sodiumMg",
            total_carbohydrate_g::float8 as "totalCarbohydrateG",
            dietary_fiber_g::float8 as "dietaryFiberG",
            sugars_g::float8        as "sugarsG",
            added_sugar_g::float8   as "addedSugarG",
            protein_g::float8       as "proteinG",
            micronutrients,
            ingredients
       from recipe_nutrition
      where recipe_id = $1`,
    [recipeId],
  );
  return row ?? null;
}
