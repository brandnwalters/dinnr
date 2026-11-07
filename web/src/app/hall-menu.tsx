import Link from "next/link";
import type { Hall, MealPeriod } from "@/lib/today";

/** "17:00" -> "5pm", "10:30" -> "10:30am". */
function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${h < 12 ? "am" : "pm"}`;
}

function hours(mealPeriod: MealPeriod): string | null {
  return mealPeriod.start && mealPeriod.end ? `${clock(mealPeriod.start)}–${clock(mealPeriod.end)}` : null;
}

function statusText(hall: Hall): string {
  const current = hall.mealPeriods.find((mp) => mp.name === hall.currentMealPeriod);
  switch (hall.status) {
    case "serving":
      return `Open now: ${current!.name} until ${clock(current!.end!)}`;
    case "opens-later":
      return `${current!.name} starts at ${clock(current!.start!)}`;
    case "done-for-today":
      return "Closed for the rest of today";
    case "closed-today":
      return "Closed today";
    case "no-menu":
      return "No menu for today yet";
  }
}

/** One hall's status, a switcher for today's meal periods, and the selected meal's menu. */
export function HallMenu({ hall }: { hall: Hall }) {
  const selected = hall.mealPeriods.find((mp) => mp.name === hall.selectedMealPeriod);
  return (
    <section aria-labelledby={`hall-${hall.slug}`}>
      <h2 id={`hall-${hall.slug}`}>{hall.name}</h2>
      <p data-status={hall.status}>{statusText(hall)}</p>

      {hall.mealPeriods.length > 0 && (
        <nav aria-label={`${hall.name} meal periods`}>
          <ul>
            {hall.mealPeriods.map((mp) => (
              <li key={mp.name}>
                <Link
                  href={{ query: { meal: mp.name } }}
                  aria-current={mp.name === hall.selectedMealPeriod ? "true" : undefined}
                >
                  {mp.name}
                  {hours(mp) && ` (${hours(mp)})`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {selected && (
        <section>
          <h3>
            {selected.name}
            {hours(selected) && ` · ${hours(selected)}`}
          </h3>
          {selected.stations.map((station) => (
            <section key={station.name}>
              <h4>{station.name}</h4>
              <ul>
                {station.items.map((item) => (
                  <li key={item.recipeId} data-recipe={item.recipeId}>
                    {item.name}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
    </section>
  );
}
