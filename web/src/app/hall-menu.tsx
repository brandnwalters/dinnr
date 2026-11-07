import { DietaryTagBadges } from "./dietary-tag-badges";
import type { Hall } from "@/lib/today";

/** One hall's menu for today: meal period -> station -> item. */
export function HallMenu({ hall }: { hall: Hall }) {
  return (
    <section aria-labelledby={`hall-${hall.slug}`}>
      <h2 id={`hall-${hall.slug}`}>{hall.name}</h2>
      {hall.mealPeriods.length === 0 ? (
        <p>No menu for today yet.</p>
      ) : (
        hall.mealPeriods.map((mealPeriod) => (
          <section key={mealPeriod.name}>
            <h3>{mealPeriod.name}</h3>
            {mealPeriod.stations.length === 0 && <p>No items match your filters.</p>}
            {mealPeriod.stations.map((station) => (
              <section key={station.name}>
                <h4>{station.name}</h4>
                <ul>
                  {station.items.map((item) => (
                    <li key={item.recipeId} data-recipe={item.recipeId}>
                      {item.name}
                      <DietaryTagBadges tags={item.dietaryTags} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        ))
      )}
    </section>
  );
}
