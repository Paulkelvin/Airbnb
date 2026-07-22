"use server";

import { headers } from "next/headers";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getEmailProvider } from "@/lib/notifications";
import { renderContactMessageEmail } from "@/lib/notifications/templates";
import { contactSchema } from "@/lib/validations/contact";
import type { ActionResult } from "@/lib/validations/auth";

const SUPPORT_EMAIL = "booking@potomacvistacottage.com";

function clientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function sendContactMessage(
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  const rateLimit = await checkRateLimit(`contact:${clientIp()}`, RATE_LIMITS.CONTACT_FORM);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many messages sent. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };
  const parsed = contactSchema.safeParse(raw);
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

  const { name, email, message } = parsed.data;
  const provider = getEmailProvider();
  const rendered = renderContactMessageEmail(name, email, message);
  const result = await provider.send({
    to: SUPPORT_EMAIL,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: "We couldn't send your message. Please try again or email us directly.",
      },
    };
  }

  return { success: true, data: { sent: true } };
}
