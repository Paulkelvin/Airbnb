import { z } from "zod";

export const createInquirySchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  preferredDate: z.coerce.date().optional(),
});

export const inquiryIdSchema = z.object({
  inquiryId: z.string().uuid(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type InquiryIdInput = z.infer<typeof inquiryIdSchema>;
