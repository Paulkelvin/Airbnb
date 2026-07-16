import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.roles?.includes("ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Admin Dashboard
            </h1>
            <Link
              href="/"
              className="text-sm text-primary-6000 hover:text-primary-700"
            >
              Back to site
            </Link>
          </div>
          <nav className="flex space-x-1 overflow-x-auto pb-px -mb-px">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap border-b-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="container py-8">{children}</div>
    </div>
  );
}
