import type { Hall, MenuItem } from "@/lib/today";

/** "140 cal · 25 g protein", leaving out whatever the label doesn't give. */
function MacroSummary({ item }: { item: MenuItem }) {
  const { calories, proteinG } = item.nutrition ?? {};
  const parts = [
    calories != null ? `${calories} cal` : null,
    proteinG != null ? `${proteinG} g protein` : null,
  ].filter((part) => part !== null);
  if (parts.length === 0) return null;
  return <small> {parts.join(" · ")}</small>;
}

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
            {mealPeriod.stations.map((station) => (
              <section key={station.name}>
                <h4>{station.name}</h4>
                <ul>
                  {station.items.map((item) => (
                    <li key={item.recipeId} data-recipe={item.recipeId}>
                      {item.name}
                      <MacroSummary item={item} />
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
