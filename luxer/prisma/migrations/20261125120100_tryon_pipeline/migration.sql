-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tryOnSpec" JSONB,
ADD COLUMN     "tryOnSpecImage" TEXT;

-- AlterTable
ALTER TABLE "TryOnRequest" DROP COLUMN "resultExpiresAt",
DROP COLUMN "resultKey",
ADD COLUMN     "analysisModel" TEXT,
ADD COLUMN     "fidelityScore" INTEGER,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "generations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "region" JSONB,
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN     "tokenHash" TEXT,
ALTER COLUMN "status" SET DEFAULT 'QUEUED';

-- CreateTable
CREATE TABLE "TryOnAsset" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TryOnAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TryOnAsset_expiresAt_idx" ON "TryOnAsset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TryOnAsset_requestId_kind_key" ON "TryOnAsset"("requestId", "kind");

-- CreateIndex
CREATE INDEX "TryOnRequest_clientHash_createdAt_idx" ON "TryOnRequest"("clientHash", "createdAt");

-- AddForeignKey
ALTER TABLE "TryOnAsset" ADD CONSTRAINT "TryOnAsset_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TryOnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

