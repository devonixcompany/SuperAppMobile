-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('ELECTRIC', 'HYBRID', 'PLUGIN_HYBRID');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('PUBLIC', 'PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "OCPPVersion" AS ENUM ('OCPP16', 'OCPP20', 'OCPP21');

-- CreateEnum
CREATE TYPE "ChargePointStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('TYPE_1', 'TYPE_2', 'CHADEMO', 'CCS_COMBO_1', 'CCS_COMBO_2', 'TESLA', 'GB_T');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('AVAILABLE', 'PREPARUNG', 'CHARGING', 'SUSPENDEDEV', 'SUSPENDEDEVSE', 'RESERVED', 'UNAVAILABLE', 'FAULTED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('A', 'W', 'kW');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHARGING_STARTEDChargePoint', 'CHARGING_STOPPED', 'CHARGING_COMPLETED', 'PAYMENT_REQUIRED', 'SYSTEM_MAINTENANCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('NORMAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PricingPeriod" AS ENUM ('STANDARD', 'PEAK', 'OFF_PEAK', 'SUPER_OFF_PEAK');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "PricingTierType" AS ENUM ('STANDARD', 'PEAK_OFF_PEAK', 'TIME_OF_USE', 'DYNAMIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "fullName" TEXT,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeUser" "UserType",
    "refresh_token" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vehicles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "type" "VehicleType" NOT NULL DEFAULT 'ELECTRIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "openingHours" TEXT,
    "is24Hours" BOOLEAN NOT NULL DEFAULT false,
    "brand" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "powerRating" DOUBLE PRECISION NOT NULL,
    "powerSystem" INTEGER NOT NULL DEFAULT 1,
    "connectorCount" INTEGER NOT NULL DEFAULT 1,
    "protocol" "OCPPVersion" NOT NULL,
    "csmsUrl" TEXT,
    "chargePointIdentity" TEXT NOT NULL,
    "status" "ChargePointStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxPower" DOUBLE PRECISION,
    "lastSeen" TIMESTAMP(3),
    "heartbeatIntervalSec" INTEGER,
    "vendor" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "ocppProtocolRaw" TEXT,
    "ocppSessionId" TEXT,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "ownershipType" "OwnershipType" NOT NULL DEFAULT 'PUBLIC',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "onPeakRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "onPeakStartTime" TEXT NOT NULL DEFAULT '10:00',
    "onPeakEndTime" TEXT NOT NULL DEFAULT '12:00',
    "offPeakRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "offPeakStartTime" TEXT NOT NULL DEFAULT '16:00',
    "offPeakEndTime" TEXT NOT NULL DEFAULT '22:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "urlwebSocket" TEXT,

    CONSTRAINT "charge_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "type" "ConnectorType" NOT NULL DEFAULT 'TYPE_2',
    "typeDescription" TEXT,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxPower" DOUBLE PRECISION,
    "maxCurrent" DOUBLE PRECISION,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "chargePointId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "startMeterValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endMeterValue" DOUBLE PRECISION,
    "totalEnergy" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "appliedRate" DOUBLE PRECISION,
    "pricingPeriod" "PricingPeriod",
    "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stopReason" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_values" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "power" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,

    CONSTRAINT "meter_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charging_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charging_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connectorId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocpp_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocpp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_vehicles_licensePlate_key" ON "user_vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_serialNumber_key" ON "charge_points"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_chargePointIdentity_key" ON "charge_points"("chargePointIdentity");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_chargePointId_connectorId_key" ON "connectors"("chargePointId", "connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionId_key" ON "transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "charging_sessions_sessionId_key" ON "charging_sessions"("sessionId");

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_points" ADD CONSTRAINT "charge_points_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "user_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_values" ADD CONSTRAINT "meter_values_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
