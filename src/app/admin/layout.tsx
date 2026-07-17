import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.roles?.includes("ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 lg:flex">
      <AdminNav userName={`${session!.user.firstName} ${session!.user.lastName}`} />
      <div className="flex-1 min-w-0">
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
