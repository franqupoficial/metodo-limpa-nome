-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('AI', 'WAITING_HUMAN', 'HUMAN', 'CLOSED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "cutoutKey" TEXT;

-- CreateTable
CREATE TABLE "AutomationFlow" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSend" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "step" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "couponCode" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3),
    "convertedOrderId" TEXT,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "ChatStatus" NOT NULL DEFAULT 'AI',
    "assignedAdminId" TEXT,
    "unreadAdmin" INTEGER NOT NULL DEFAULT 0,
    "unreadCustomer" INTEGER NOT NULL DEFAULT 0,
    "page" TEXT,
    "aiTurns" INTEGER NOT NULL DEFAULT 0,
    "handoffReason" TEXT,
    "rating" INTEGER,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "adminId" TEXT,
    "adminName" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationSend_customerId_idx" ON "AutomationSend"("customerId");

-- CreateIndex
CREATE INDEX "AutomationSend_couponCode_idx" ON "AutomationSend"("couponCode");

-- CreateIndex
CREATE INDEX "AutomationSend_createdAt_idx" ON "AutomationSend"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationSend_flowId_dedupeKey_step_key" ON "AutomationSend"("flowId", "dedupeKey", "step");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_tokenHash_key" ON "ChatConversation"("tokenHash");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_legacyId_key" ON "Customer"("legacyId");

-- AddForeignKey
ALTER TABLE "AutomationSend" ADD CONSTRAINT "AutomationSend_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "AutomationFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationSend" ADD CONSTRAINT "AutomationSend_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

