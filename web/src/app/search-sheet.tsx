"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchDishes } from "@/lib/dish-search";
import { toggleFavorite } from "@/lib/favorites";
import { addEntry, type DishToLog } from "@/lib/meal-log";
import { useMealLog } from "@/lib/meal-log-store";
import { usePreferences } from "@/lib/preferences-store";
import type { MenuItem, TodayMenu } from "@/lib/today";
import { EmptyState } from "./menu-empty-states";
import { NutritionSheet } from "./nutrition-sheet";
import { useTodayMenu } from "./today-menu-provider";

/**
 * The header's search button and the sheet it opens (a bottom sheet below
 * tablet width, a centered dialog from tablet width up), wired to the shell's
 * shared menu: it searches today's dishes at both halls and every meal period
 * as you type (`searchDishes`), with no server call. The search box is focused
 * on open; Radix's dialog traps focus, closes on Escape and returns focus to
 * the search button. Tapping a result opens its nutrition sheet on top.
 */
export function SearchSheet() {
  const menu = useTodayMenu();
  const [, updatePreferences] = usePreferences();
  const [, updateMealLog] = useMealLog();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // A page hidden by navigation keeps its state; close the sheet so it isn't still open on return.
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-tap" aria-label="Search dishes">
          <SearchIcon aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          // Focus the search box (not the close button) so the keyboard is ready.
          event.preventDefault();
          input.current?.focus();
        }}
        className="top-auto bottom-0 flex h-sheet max-h-sheet max-w-full translate-y-0 flex-col sm:max-w-full rounded-b-none md:top-1/2 md:bottom-auto md:h-auto md:max-w-lg md:-translate-y-1/2 md:rounded-xl"
      >
        <DialogHeader className="flex-row items-center justify-between gap-4">
          <DialogTitle className="text-lg">Search today’s dishes</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-tap" aria-label="Close">
              <XIcon aria-hidden />
            </Button>
          </DialogClose>
        </DialogHeader>
        <SearchPanel
          query={query}
          onQueryChange={setQuery}
          menu={menu}
          inputRef={input}
          onToggleFavorite={(item) =>
            updatePreferences((p) => ({ ...p, favorites: toggleFavorite(p.favorites, item) }))
          }
          onLogDish={(dish) => updateMealLog((log) => addEntry(log, dish, new Date()))}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The search sheet's contents: the search box, then a hint (empty query), a
 * friendly empty state (no matches) or the results grouped by hall then meal
 * period, each with its station, and a note when the filters hid matches. The
 * result count is announced to screen readers as it changes. Presentational
 * (`menu` null while today's menus load), so it renders to static markup in tests.
 */
export function SearchPanel({
  query,
  onQueryChange,
  menu,
  inputRef,
  onToggleFavorite,
  onLogDish,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  menu: TodayMenu | null;
  inputRef?: React.Ref<HTMLInputElement>;
  onToggleFavorite?: (item: MenuItem) => void;
  /** "I ate this" in a result's nutrition sheet, tagged with the hall and meal period it's served at. */
  onLogDish?: (dish: DishToLog) => void;
}) {
  const blank = query.trim() === "";
  const search = menu && !blank ? searchDishes(query, menu) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Input
        ref={inputRef}
        type="search"
        aria-label="Search today's dishes"
        placeholder="Search dishes, e.g. sushi"
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="h-tap text-base"
      />
      <p aria-live="polite" className="sr-only">
        {search &&
          (search.count === 0 ? "No dishes found" : `${search.count} ${search.count === 1 ? "dish" : "dishes"} found`)}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {blank ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Type part of a dish name to search both halls and every meal today.
          </p>
        ) : !menu || !search ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading today’s menus…</p>
        ) : (
          <>
            {search.count === 0 ? (
              <EmptyState
                icon={SearchIcon}
                title={`No dishes match “${query.trim()}” today`}
                description="Try a shorter or different word: search looks at every dish at both halls today."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {search.halls.map((hall) => (
                  <section key={hall.slug} aria-labelledby={`search-hall-${hall.slug}`}>
                    <h3 id={`search-hall-${hall.slug}`} className="text-base font-semibold">
                      {hall.name}
                    </h3>
                    {hall.mealPeriods.map((mealPeriod) => (
                      <div key={mealPeriod.name} className="mt-1">
                        <h4 className="text-sm font-medium text-muted-foreground">{mealPeriod.name}</h4>
                        <ul>
                          {mealPeriod.results.map(({ station, item }) => (
                            <li
                              key={`${station}/${item.recipeId}/${item.name}`}
                              className="flex min-h-tap flex-col justify-center border-b py-1 last:border-b-0"
                            >
                              <NutritionSheet
                                item={item}
                                onToggleFavorite={onToggleFavorite}
                                onLog={
                                  onLogDish &&
                                  ((servings) =>
                                    onLogDish({
                                      item,
                                      servings,
                                      hall: { slug: hall.slug, name: hall.name },
                                      mealPeriod: mealPeriod.name,
                                    }))
                                }
                              />
                              <span className="text-xs text-muted-foreground">{station}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {search.hidden > 0 && (
              <p className="pt-3 text-center text-sm text-muted-foreground">{search.hidden} hidden by your filters</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
