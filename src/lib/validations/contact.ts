import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000, "Message must be at most 5000 characters"),
});

export type ContactInput = z.infer<typeof contactSchema>;
