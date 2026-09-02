-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'SQUARE';

-- CreateTable
CREATE TABLE "PendingPaymentIntent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "PaymentProvider" NOT NULL,
    "payerUserId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerTransactionRef" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingPaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingPaymentIntent_payerUserId_idx" ON "PendingPaymentIntent"("payerUserId");

-- CreateIndex
CREATE INDEX "PendingPaymentIntent_status_idx" ON "PendingPaymentIntent"("status");

-- AddForeignKey
ALTER TABLE "PendingPaymentIntent" ADD CONSTRAINT "PendingPaymentIntent_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
