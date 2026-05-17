import Link from "next/link";
import { PlusCircle, Wallet, List } from "lucide-react";

const links = [
  { href: "/log", label: "Log one item", desc: "Quick entry without a receipt", icon: PlusCircle },
  { href: "/compare", label: "Browse all prices", desc: "Full product list by store", icon: List },
  { href: "/budget", label: "Monthly budget", desc: "Set your spending limit", icon: Wallet },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <h2 className="page-title">More</h2>
      <ul className="space-y-2">
        {links.map(({ href, label, desc, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="card flex items-center gap-4 active:opacity-90">
              <span className="icon-box">
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
