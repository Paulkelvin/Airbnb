"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 overflow-x-auto pb-px -mb-px">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "text-primary-6000 border-primary-6000"
                : "text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-600"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
