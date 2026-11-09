import type { LucideIcon } from "lucide-react";

/**
 * A friendly placeholder where combos would be: an icon, a short title and the
 * explanation (the no-targets prompt, or the combo engine's message).
 */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
      <Icon aria-hidden className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
