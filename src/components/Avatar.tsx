import { cn } from "@/lib/utils";

export function Avatar({ name, hue, size = "md" }: { name: string; hue: number; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold ring-2 ring-background",
        size === "sm" && "size-8 text-xs", size === "md" && "size-14 text-lg", size === "lg" && "size-20 text-2xl",
      )}
      style={{ background: `oklch(0.6 0.12 ${hue})`, color: `oklch(0.98 0.01 ${hue})` }}
    >
      {initials}
    </span>
  );
}
