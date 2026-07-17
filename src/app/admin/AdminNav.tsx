"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  UsersIcon,
  HomeModernIcon,
  CalendarDaysIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: Squares2X2Icon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/listings", label: "Listings", icon: HomeModernIcon },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDaysIcon },
  { href: "/admin/taxonomy", label: "Taxonomy", icon: TagIcon },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardDocumentListIcon },
  { href: "/admin/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/studio", label: "CMS", icon: PencilSquareIcon },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href as never}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary-50 text-primary-6000 dark:bg-primary-900/30 dark:text-primary-400"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminNav({
  userName,
}: {
  userName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="w-9 h-9 rounded-lg bg-primary-6000 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
        P
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
          Admin
        </p>
        <p className="text-xs text-neutral-400 truncate">{userName}</p>
      </div>
    </div>
  );

  const backToSite = (
    <Link
      href="/"
      className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-6000 border-t border-neutral-200 dark:border-neutral-700"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      Back to site
    </Link>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-6000 text-white flex items-center justify-center font-semibold text-xs">
            P
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 text-neutral-500 dark:text-neutral-400"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-neutral-800 flex flex-col">
            <div className="flex items-center justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 mr-3 text-neutral-500 dark:text-neutral-400"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            {backToSite}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        {brand}
        <NavLinks pathname={pathname} />
        {backToSite}
      </div>
    </>
  );
}
