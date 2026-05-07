"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ice-900 hover:bg-ice-100 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label={isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      title={isDark ? "Světlý režim" : "Tmavý režim"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Světlý" : "Tmavý"}
    </button>
  );
}
