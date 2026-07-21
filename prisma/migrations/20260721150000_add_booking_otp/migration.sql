-- CreateTable
CREATE TABLE "BookingOtp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingOtp_email_idx" ON "BookingOtp"("email");
