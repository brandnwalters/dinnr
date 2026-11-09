import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { THEME_SCRIPT } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AppHeaderHeight } from "./app-header-height";
import { CurrentAppNav } from "./current-app-nav";
import { AllergenBanner, FilterSheet } from "./filter-sheet";
import { ThemeSync } from "./theme-sync";
import { TodayMenuProvider } from "./today-menu-provider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Dinnr",
  description: "Compare UNC dining halls: menus, nutrition and macro combos",
};

/**
 * The app shell around every screen: a header with the "Dinnr" wordmark and
 * the main navigation (a bottom tab bar on phones, in the header from tablet
 * width up) and the filter button, plus the allergen disclaimer banner while an
 * allergen filter is on. The main area leaves room for the fixed tab bar on phones.
 * Today's menus load once here (`TodayMenuProvider`) and are shared by the tabs.
 *
 * The inline script in `<head>` applies the Appearance choice before the
 * first paint (no flash of the wrong theme); it sets `data-theme` on
 * `<html>`, hence `suppressHydrationWarning`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <ThemeSync />
        <AppHeaderHeight selector="[data-app-header]" />
        <header data-app-header className="sticky top-0 z-10 border-b bg-background">
          <div className="mx-auto flex min-h-tap max-w-6xl items-center justify-between gap-4 px-4 py-2">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Dinnr
            </Link>
            <div className="flex items-center gap-2">
              <CurrentAppNav />
              <FilterSheet />
            </div>
          </div>
          <AllergenBanner />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(var(--spacing-tab-bar)+var(--spacing)*4)] md:pb-8">
          <TodayMenuProvider>{children}</TodayMenuProvider>
        </main>
      </body>
    </html>
  );
}
