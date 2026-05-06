import Link from "next/link";
import { LogOut, Medal, Shield, Trophy, Users, ClipboardList } from "lucide-react";

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const items = [
    { href: "/", label: "Moje tipy", icon: ClipboardList },
    { href: "/zapasy", label: "Zápasy", icon: Trophy },
    { href: "/medailove-tipy", label: "Medaile", icon: Medal },
    { href: "/zebricek", label: "Žebříček", icon: Users },
    { href: "/tipy-ostatnich", label: "Tipy ostatních", icon: Users }
  ];

  return (
    <header className="border-b border-ice-100 bg-white/86 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-lg font-bold text-ice-900">
          IIHF 2026 Tipovačka
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ice-900 hover:bg-ice-100"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-rink-red hover:bg-red-50"
            >
              <Shield size={16} />
              Admin
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <button className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ice-900 hover:bg-ice-100">
              <LogOut size={16} />
              Odhlásit
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
