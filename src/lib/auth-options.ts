import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const BOOKING_OTP_MAX_ATTEMPTS = 5;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: UserRole[];
      avatarUrl: string | null;
    };
  }
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
    avatarUrl: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
    avatarUrl: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const ip = (req.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? "unknown";
        const email = credentials.email.toLowerCase().trim();

        const [ipLimit, emailLimit] = await Promise.all([
          checkRateLimit(`login-ip:${ip}`, RATE_LIMITS.LOGIN_IP),
          checkRateLimit(`login-email:${email}`, RATE_LIMITS.LOGIN_EMAIL),
        ]);
        if (!ipLimit.allowed || !emailLimit.allowed) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.status !== "ACTIVE") {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
    // Passwordless booking flow (src/actions/auth.ts's requestBookingOtp
    // sends the code; this verifies it). A separate provider id rather than
    // overloading "credentials" above — that one's authorize() assumes a
    // password/hash comparison and returns null for accounts with none,
    // which every account created through this path has.
    CredentialsProvider({
      id: "otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const ip = (req.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? "unknown";
        const email = credentials.email.toLowerCase().trim();
        const code = credentials.code.trim();

        const [ipLimit, emailLimit] = await Promise.all([
          checkRateLimit(`booking-otp-verify-ip:${ip}`, RATE_LIMITS.BOOKING_OTP_VERIFY_IP),
          checkRateLimit(`booking-otp-verify-email:${email}`, RATE_LIMITS.BOOKING_OTP_VERIFY_EMAIL),
        ]);
        if (!ipLimit.allowed || !emailLimit.allowed) {
          throw new Error("RATE_LIMITED");
        }

        const otp = await prisma.bookingOtp.findFirst({
          where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!otp || otp.attempts >= BOOKING_OTP_MAX_ATTEMPTS) {
          return null;
        }

        const codeHash = crypto.createHash("sha256").update(code).digest("hex");
        if (otp.codeHash !== codeHash) {
          await prisma.bookingOtp.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        await prisma.bookingOtp.update({
          where: { id: otp.id },
          data: { consumedAt: new Date() },
        });

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const [firstName, ...rest] = otp.fullName.trim().split(/\s+/);
          user = await prisma.user.create({
            data: {
              email,
              firstName: firstName || "Guest",
              lastName: rest.join(" "),
              roles: ["CUSTOMER"],
              emailVerifiedAt: new Date(),
            },
          });
        } else if (!user.emailVerifiedAt) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifiedAt: new Date() },
          });
        }

        if (user.status !== "ACTIVE") {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.roles = user.roles;
        token.avatarUrl = user.avatarUrl;
      }
      if (trigger === "update" && session) {
        token.firstName = session.firstName ?? token.firstName;
        token.lastName = session.lastName ?? token.lastName;
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl;
        token.roles = session.roles ?? token.roles;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email!,
        firstName: token.firstName,
        lastName: token.lastName,
        roles: token.roles,
        avatarUrl: token.avatarUrl,
      };
      return session;
    },
  },
};
