"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type ActionResult,
} from "@/lib/validations/auth";

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

  // TODO: Send email with reset link containing `token` (not hashedToken)
  // The reset URL would be: ${NEXTAUTH_URL}/reset-password?token=${token}
  console.log(`[DEV] Password reset token for ${user.email}: ${token}`);

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

  return {
    success: true,
    data: { message: "Password has been reset successfully" },
  };
}
