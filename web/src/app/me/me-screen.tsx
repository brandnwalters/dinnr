import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FavoriteDish } from "@/lib/favorites";
import type { Theme } from "@/lib/preferences";
import type { LastServed } from "@/lib/served-history";
import { Bone } from "../menu-skeleton";
import { AppearanceSetting } from "./appearance-setting";
import { FavoritesList } from "./favorites-list";

/**
 * The Me screen: the user's favorites (each can be unstarred, with when it
 * was last served), the
 * Appearance setting and an About section. Presentational, so it renders to
 * static markup in tests; `MeView` wires it to the on-device preferences.
 */
export function MeScreen({
  favorites,
  favoritesLastServed,
  onRemoveFavorite,
  theme,
  onThemeChange,
}: {
  favorites: FavoriteDish[];
  /** When each favorite was last served (`TodayMenu.favoritesLastServed`); absent while today's menus load. */
  favoritesLastServed?: Record<string, LastServed>;
  onRemoveFavorite?: (normalizedName: string) => void;
  theme: Theme;
  onThemeChange?: (theme: Theme) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>My favorites</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            A favorite matches the dish by name at any station or hall.
          </p>
          <FavoritesList favorites={favorites} lastServed={favoritesLastServed} onRemove={onRemoveFavorite} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Appearance</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceSetting theme={theme} onChange={onThemeChange} />
        </CardContent>
      </Card>
      <About />
    </div>
  );
}

/**
 * Placeholders for the Me screen's cards while the on-device preferences are
 * read. Announced to assistive tech as "Loading your favorites and settings".
 */
export function MeSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading your favorites and settings</span>
      {[3, 1, 3].map((rows, card) => (
        <div key={card} aria-hidden className="flex flex-col gap-3 rounded-xl border p-4">
          <Bone className="h-6 w-1/3" />
          {Array.from({ length: rows }, (_, row) => (
            <Bone key={row} className="h-tap w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Where the data comes from and how far to trust it. */
function About() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>About</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p>Menus, hours and nutrition come from UNC Dining&apos;s website, checked every day.</p>
        <p>
          Allergen filters rely on UNC Dining&apos;s labels, and cross-contact with other foods is possible. If you
          have a severe allergy, ask the dining staff before eating.
        </p>
        <p>Your favorites, filters and targets are saved on this device only. There&apos;s no account.</p>
      </CardContent>
    </Card>
  );
}
