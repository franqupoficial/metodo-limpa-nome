-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "installment" INTEGER,
ADD COLUMN     "pixPayload" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);
