import { CalendarDays, Layers, User, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** One tab. Tabs without an `href` aren't built yet: shown, but disabled. */
type Tab = { label: string; href?: string; icon: LucideIcon };

const TABS: readonly Tab[] = [
  { label: "Today", href: "/", icon: CalendarDays },
  { label: "Menus", icon: UtensilsCrossed },
  { label: "Combos", icon: Layers },
  { label: "Me", href: "/me", icon: User },
];

const tabClass = "flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-xs font-medium md:flex-none md:flex-row md:gap-2 md:text-sm";

/**
 * The app's main navigation: a bottom tab bar on phones, a top nav from
 * tablet width up. Presentational (the current path comes in as a prop) so it
 * renders to static markup in tests; `CurrentAppNav` feeds it the URL.
 */
export function AppNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 h-tab-bar border-t bg-background md:static md:h-auto md:border-t-0"
    >
      <ul className="flex h-full items-stretch gap-1 px-2 md:gap-2 md:px-0">
        {TABS.map((tab) => (
          <li key={tab.label} className="flex flex-1 md:flex-none">
            <TabLink tab={tab} current={tab.href === pathname} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabLink({ tab, current }: { tab: Tab; current: boolean }) {
  const Icon = tab.icon;
  const content = (
    <>
      <Icon aria-hidden className="size-5 md:size-4" />
      <span>{tab.label}</span>
    </>
  );
  if (!tab.href) {
    return (
      <span role="link" aria-disabled="true" className={cn(tabClass, "text-muted-foreground opacity-50")}>
        {content}
        <span className="sr-only"> (coming soon)</span>
      </span>
    );
  }
  return (
    <Link
      href={tab.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        tabClass,
        current ? "bg-brand/15 text-foreground [&_svg]:text-brand" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {content}
    </Link>
  );
}
