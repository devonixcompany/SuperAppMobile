/*
  Warnings:

  - The values [PREPARUNG] on the enum `ConnectorStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConnectorStatus_new" AS ENUM ('AVAILABLE', 'PREPARING', 'CHARGING', 'SUSPENDEDEV', 'SUSPENDEDEVSE', 'RESERVED', 'UNAVAILABLE', 'FAULTED');
ALTER TABLE "public"."connectors" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "connectors" ALTER COLUMN "status" TYPE "ConnectorStatus_new" USING ("status"::text::"ConnectorStatus_new");
ALTER TYPE "ConnectorStatus" RENAME TO "ConnectorStatus_old";
ALTER TYPE "ConnectorStatus_new" RENAME TO "ConnectorStatus";
DROP TYPE "public"."ConnectorStatus_old";
ALTER TABLE "connectors" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;
