import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ProfileForm from "./ProfileForm";

const AccountPage = async () => {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      bio: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-semibold">Your Profile</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <ProfileForm
        email={user.email}
        firstName={user.firstName}
        lastName={user.lastName}
        phone={user.phone ?? ""}
        bio={user.bio ?? ""}
        avatarUrl={user.avatarUrl}
      />
    </div>
  );
};

export default AccountPage;
