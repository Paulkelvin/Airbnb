"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validations/profile";
import type { ActionResult } from "@/lib/validations/auth";

export async function updateProfile(
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireAuth();

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
  };
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the form and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { firstName, lastName, phone, bio } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName,
      lastName,
      phone: phone || null,
      bio: bio || null,
    },
  });

  revalidatePath("/account");
  return { success: true, data: { updated: true } };
}
