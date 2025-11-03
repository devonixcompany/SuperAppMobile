-- CreateEnum
CREATE TYPE "RfidCardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOST', 'REVOKED');

-- CreateTable
CREATE TABLE "RfidCard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cardNumber" VARCHAR(64) NOT NULL,
    "qrCodeValue" VARCHAR(128),
    "alias" VARCHAR(64),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "RfidCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfidCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RfidCard_cardNumber_key" ON "RfidCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RfidCard_qrCodeValue_key" ON "RfidCard"("qrCodeValue");

-- CreateIndex
CREATE INDEX "RfidCard_ownerId_status_idx" ON "RfidCard"("ownerId", "status");

-- CreateIndex
CREATE INDEX "RfidCard_ownerId_isPrimary_idx" ON "RfidCard"("ownerId", "isPrimary");

-- AddForeignKey
ALTER TABLE "RfidCard" ADD CONSTRAINT "RfidCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidCard" ADD CONSTRAINT "RfidCard_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
