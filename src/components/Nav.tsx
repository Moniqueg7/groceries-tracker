"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Receipt, MoreHorizontal, Search } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Prices", icon: Search },
  { href: "/scan", label: "Slip", icon: Receipt },
  { href: "/list", label: "List", icon: ListChecks },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export function Nav() {
  const pathname = usePathname();
  const isMoreSection = ["/log", "/compare", "/budget", "/more"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <>
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base tracking-tight text-accent-bright">Budget ZA</h1>
            <p className="text-[10px] text-muted uppercase tracking-widest">Grocery spend</p>
          </div>
          <span className="badge-zar">ZAR</span>
        </div>
      </header>

      <nav className="nav-mobile glass-nav fixed bottom-0 inset-x-0 z-50 md:static md:border-b">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/more" ? isMoreSection : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] touch-manipulation transition-colors ${
                  active ? "nav-active" : "nav-inactive"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
