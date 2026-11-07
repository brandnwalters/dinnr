import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dinnr",
  description: "Compare UNC dining halls: menus, nutrition and macro combos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
