import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "./AdminNav";

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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-6000 text-white flex items-center justify-center font-semibold text-sm">
                P
              </div>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-neutral-400">
                  Signed in as {session!.user.firstName} {session!.user.lastName}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm text-primary-6000 hover:text-primary-700 font-medium"
            >
              &larr; Back to site
            </Link>
          </div>
          <AdminNav />
        </div>
      </div>
      <div className="container py-8">{children}</div>
    </div>
  );
}
