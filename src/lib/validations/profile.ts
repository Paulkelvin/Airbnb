import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be at most 30 characters")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(1000, "About you must be at most 1000 characters")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
