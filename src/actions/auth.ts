"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type ActionResult,
} from "@/lib/validations/auth";
import { notify } from "@/modules/notifications/notify";
import { getEmailProvider } from "@/lib/notifications";
import { renderPasswordResetEmail } from "@/lib/notifications/templates";
import { getSiteUrl } from "@/lib/site-url";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/** No session exists yet at signup, so the limiter key is IP-based, not user-based. */
function clientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function register(
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const rateLimit = await checkRateLimit(`signup:${clientIp()}`, RATE_LIMITS.SIGNUP);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many signup attempts. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { email, password, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    return {
      success: false,
      error: {
        code: "CONFLICT",
        message: "An account with this email already exists",
      },
    };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roles: ["CUSTOMER"],
    },
  });

  return { success: true, data: { userId: user.id } };
}

export async function forgotPassword(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const rateLimit = await checkRateLimit(`forgot-password:${clientIp()}`, RATE_LIMITS.FORGOT_PASSWORD);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many reset attempts. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const raw = { email: formData.get("email") };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  if (!user) {
    return {
      success: true,
      data: {
        message:
          "If an account exists with that email, a reset link has been sent",
      },
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const resetUrl = `${getSiteUrl()}/reset-password?token=${token}`;
  const email = renderPasswordResetEmail(resetUrl, user.firstName);
  try {
    await getEmailProvider().send({ to: user.email, subject: email.subject, html: email.html, text: email.text });
  } catch (err) {
    // Same accepted trade-off as notify()'s own email dispatch (ADR-026): a
    // delivery failure is logged, never thrown — the response shape must stay
    // identical whether or not the email actually sent, to avoid leaking
    // account existence via error behavior.
    console.error("Failed to send password reset email", err);
  }

  return {
    success: true,
    data: {
      message:
        "If an account exists with that email, a reset link has been sent",
    },
  };
}

export async function resetPassword(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const raw = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    return {
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Reset token is invalid or has expired",
      },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  await notify(user.id, "PASSWORD_CHANGED", { changedAt: new Date().toISOString() });

  return {
    success: true,
    data: { message: "Password has been reset successfully" },
  };
}

/** Authenticated "change my password" flow — distinct from the forgot/reset flow above, which works without a session via an emailed token. */
export async function changePassword(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const user = await requireAuth();

  const raw = {
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser?.passwordHash) {
    return { success: false, error: { code: "INVALID_STATE", message: "This account has no password set" } };
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!matches) {
    return { success: false, error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect" } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await notify(user.id, "PASSWORD_CHANGED", { changedAt: new Date().toISOString() });

  return { success: true, data: { message: "Password changed successfully" } };
}
