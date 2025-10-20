-- CreateEnum
CREATE TYPE "PricingTierType" AS ENUM ('STANDARD', 'PEAK_OFF_PEAK', 'TIME_OF_USE', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "PricingPeriod" AS ENUM ('STANDARD', 'PEAK', 'OFF_PEAK', 'SUPER_OFF_PEAK');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "charge_points" ADD COLUMN     "defaultPricingTierId" TEXT,
ADD COLUMN     "urlwebSocket" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "appliedRate" DOUBLE PRECISION,
ADD COLUMN     "pricingPeriod" "PricingPeriod",
ADD COLUMN     "pricingTierId" TEXT;

-- CreateTable
CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tierType" "PricingTierType" NOT NULL DEFAULT 'STANDARD',
    "baseRate" DOUBLE PRECISION NOT NULL,
    "peakRate" DOUBLE PRECISION,
    "offPeakRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_schedules" (
    "id" TEXT NOT NULL,
    "pricingTierId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek",
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "periodType" "PricingPeriod" NOT NULL DEFAULT 'STANDARD',
    "rate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "pricing_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_schedules" ADD CONSTRAINT "pricing_schedules_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "pricing_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
