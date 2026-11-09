import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FavoriteDish } from "@/lib/favorites";
import type { Theme } from "@/lib/preferences";
import { AppearanceSetting } from "./appearance-setting";
import { FavoritesList } from "./favorites-list";

/**
 * The Me screen: the user's favorites (each can be unstarred), the
 * Appearance setting and an About section. Presentational, so it renders to
 * static markup in tests; `MeView` wires it to the on-device preferences.
 */
export function MeScreen({
  favorites,
  onRemoveFavorite,
  theme,
  onThemeChange,
}: {
  favorites: FavoriteDish[];
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
          <FavoritesList favorites={favorites} onRemove={onRemoveFavorite} />
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
