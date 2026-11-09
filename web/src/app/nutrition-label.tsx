import type { NutritionDetail } from "@/lib/nutrition-detail";
import { cn } from "@/lib/utils";

const amount = (value: number | null, unit: string) => (value == null ? "–" : `${value} ${unit}`);

/** A recipe's full nutrition label and ingredient list, or a notice when UNC gives none. */
export function NutritionLabel({ detail }: { detail: NutritionDetail | null }) {
  if (detail === null) return <p>Nutrition unavailable for this item.</p>;

  const rows: [label: string, value: string, indent?: boolean][] = [
    ["Calories", detail.calories == null ? "–" : String(detail.calories)],
    ["Total fat", amount(detail.totalFatG, "g")],
    ["Saturated fat", amount(detail.saturatedFatG, "g"), true],
    ["Trans fat", amount(detail.transFatG, "g"), true],
    ["Cholesterol", amount(detail.cholesterolMg, "mg")],
    ["Sodium", amount(detail.sodiumMg, "mg")],
    ["Total carbohydrate", amount(detail.totalCarbohydrateG, "g")],
    ["Dietary fiber", amount(detail.dietaryFiberG, "g"), true],
    ["Sugars", amount(detail.sugarsG, "g"), true],
    ["Added sugar", amount(detail.addedSugarG, "g"), true],
    ["Protein", amount(detail.proteinG, "g")],
    ...detail.micronutrients.map((m): [string, string] => [m.name, amount(m.amount, m.unit)]),
  ];

  return (
    <>
      <p className="mb-2 text-muted-foreground">Serving size {detail.servingSize ?? "–"}</p>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([label, value, indent]) => (
            <tr key={label} className="border-b">
              <th scope="row" className={cn("py-1 text-left font-normal", indent && "pl-4")}>
                {label}
              </th>
              <td className="py-1 text-right">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mt-4 font-medium">Ingredients</h3>
      <p>{detail.ingredients ?? "No ingredient list given."}</p>
    </>
  );
}
