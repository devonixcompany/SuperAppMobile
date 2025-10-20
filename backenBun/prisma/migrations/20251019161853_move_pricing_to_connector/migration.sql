/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `charge_points` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chargePointIdentity]` on the table `charge_points` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `brand` to the `charge_points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chargePointIdentity` to the `charge_points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `powerRating` to the `charge_points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serialNumber` to the `charge_points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stationName` to the `charge_points` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseRate` to the `connectors` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConnectorPowerType" AS ENUM ('AC', 'DC');

-- AlterTable
ALTER TABLE "charge_points" ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "chargePointIdentity" TEXT NOT NULL,
ADD COLUMN     "is24Hours" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "powerRating" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "serialNumber" TEXT NOT NULL,
ADD COLUMN     "stationName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "connectors" ADD COLUMN     "baseRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "connectorType" "ConnectorPowerType" NOT NULL DEFAULT 'AC',
ADD COLUMN     "offPeakEndTime" TEXT,
ADD COLUMN     "offPeakRate" DOUBLE PRECISION,
ADD COLUMN     "offPeakStartTime" TEXT,
ADD COLUMN     "peakEndTime" TEXT,
ADD COLUMN     "peakRate" DOUBLE PRECISION,
ADD COLUMN     "peakStartTime" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_serialNumber_key" ON "charge_points"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_chargePointIdentity_key" ON "charge_points"("chargePointIdentity");
