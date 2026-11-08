import type { NutritionDetail } from "@/lib/nutrition-detail";
import styles from "./nutrition-panel.module.css";

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
      <p>Serving size {detail.servingSize ?? "–"}</p>
      <table className={styles.label}>
        <tbody>
          {rows.map(([label, value, indent]) => (
            <tr key={label}>
              <th scope="row" className={indent ? styles.indent : undefined}>
                {label}
              </th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Ingredients</h4>
      <p>{detail.ingredients ?? "No ingredient list given."}</p>
    </>
  );
}
