import Link from "next/link";
import { BarChart3, ClipboardList, LogOut, Medal, Shield, Table2, Trophy, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const items = [
    { href: "/", label: "Moje tipy", icon: ClipboardList },
    { href: "/zapasy", label: "Zápasy", icon: Trophy },
    { href: "/medailove-tipy", label: "Medaile", icon: Medal },
    { href: "/zebricek", label: "Žebříček", icon: Users },
    { href: "/skupiny", label: "Skupiny", icon: Table2 },
    { href: "/statistiky", label: "Statistiky", icon: BarChart3 },
    { href: "/tipy-ostatnich", label: "Tipy ostatních", icon: Users }
  ];

  return (
    <header className="border-b border-ice-100 bg-white/86 backdrop-blur dark:border-slate-800 dark:bg-slate-950/86">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-ice-900 dark:text-slate-100">
          IIHF 2026 Tipovačka
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ice-900 hover:bg-ice-100 dark:text-slate-100 dark:hover:bg-slate-800">
              <LogOut size={16} />
              <span className="hidden sm:inline">Odhlásit</span>
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 table-scroll">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-ice-900 hover:bg-ice-100 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-rink-red hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <Shield size={16} />
            Admin
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
