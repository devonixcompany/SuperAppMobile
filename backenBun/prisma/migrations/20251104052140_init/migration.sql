-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('HEAD_OFFICE', 'BRANCH');

-- CreateEnum
CREATE TYPE "ChargePointStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('AVAILABLE', 'PREPARING', 'CHARGING', 'SUSPENDED_EV', 'SUSPENDED_EVSE', 'RESERVED', 'UNAVAILABLE', 'FAULTED');

-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('TYPE_1', 'TYPE_2', 'CHADEMO', 'CCS_COMBO_1', 'CCS_COMBO_2', 'TESLA', 'GB_T');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHARGING_STARTEDChargePoint', 'CHARGING_STOPPED', 'CHARGING_COMPLETED', 'PAYMENT_REQUIRED', 'SYSTEM_MAINTENANCE', 'GENERAL');

-- CreateEnum
CREATE TYPE "OCPPVersion" AS ENUM ('OCPP16', 'OCPP20', 'OCPP21');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('PUBLIC', 'PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "PricingTierType" AS ENUM ('STANDARD', 'PEAK_OFF_PEAK', 'TIME_OF_USE', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('A', 'W', 'kW');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TaxpayerType" AS ENUM ('PERSONAL', 'JURISTIC');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('NORMAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('ELECTRIC', 'HYBRID', 'PLUGIN_HYBRID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsTaxInvoiceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxpayerType" "TaxpayerType" NOT NULL,
    "fullName" TEXT,
    "companyName" TEXT,
    "taxId" VARCHAR(20) NOT NULL,
    "branchType" "BranchType",
    "branchCode" VARCHAR(5),
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "provinceId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "subdistrictId" TEXT NOT NULL,
    "postalCode" VARCHAR(10) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsTaxInvoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "stationname" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "imageUrl" VARCHAR(512),
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "openclosedays" TEXT,
    "onPeakRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "onPeakStartTime" TEXT NOT NULL DEFAULT '10:00',
    "onPeakEndTime" TEXT NOT NULL DEFAULT '12:00',
    "onPeakbaseRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "offPeakRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "offPeakStartTime" TEXT NOT NULL DEFAULT '16:00',
    "offPeakEndTime" TEXT NOT NULL DEFAULT '22:00',
    "offPeakbaseRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

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
    "omiseCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_points" (
    "id" TEXT NOT NULL,
    "chargepointname" TEXT NOT NULL,
    "stationId" TEXT,
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
    "chargepointstatus" "ChargePointStatus" NOT NULL DEFAULT 'AVAILABLE',
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
    "connectorstatus" "ConnectorStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxPower" DOUBLE PRECISION,
    "maxCurrent" DOUBLE PRECISION,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OMISE',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "chargeId" TEXT,
    "cardId" TEXT,
    "failureMessage" TEXT,
    "authorizeUri" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "omiseCardId" TEXT NOT NULL,
    "omiseCustomerId" TEXT,
    "brand" TEXT,
    "lastDigits" TEXT,
    "expirationMonth" INTEGER,
    "expirationYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "rawRequest" JSONB NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ocppTransactionId" TEXT,
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
    "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stopReason" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "SsTaxInvoiceProfile_userId_idx" ON "SsTaxInvoiceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SsTaxInvoiceProfile_userId_taxId_branchCode_key" ON "SsTaxInvoiceProfile"("userId", "taxId", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Station_stationname_key" ON "Station"("stationname");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_omiseCustomerId_key" ON "User"("omiseCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_key" ON "admin_refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_serialNumber_key" ON "charge_points"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "charge_points_chargePointIdentity_key" ON "charge_points"("chargePointIdentity");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_chargePointId_connectorId_key" ON "connectors"("chargePointId", "connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_chargeId_key" ON "Payment"("chargeId");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCard_omiseCardId_key" ON "PaymentCard"("omiseCardId");

-- CreateIndex
CREATE INDEX "PaymentCard_userId_idx" ON "PaymentCard"("userId");

-- CreateIndex
CREATE INDEX "PaymentLog_paymentId_idx" ON "PaymentLog"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionId_key" ON "transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_ocppTransactionId_key" ON "transactions"("ocppTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_vehicles_licensePlate_key" ON "user_vehicles"("licensePlate");

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_points" ADD CONSTRAINT "charge_points_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_points" ADD CONSTRAINT "charge_points_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCard" ADD CONSTRAINT "PaymentCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "charge_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "user_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
