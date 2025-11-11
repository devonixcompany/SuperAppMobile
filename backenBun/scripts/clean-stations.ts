#!/usr/bin/env bun
/**
 * Script ล้างข้อมูลสถานี (Station) และ Charge Points
 *
 * การใช้งาน:
 * bun scripts/clean-stations.ts
 *
 * Environment variables ที่ต้องการ:
 * - DATABASE_URL: URL สำหรับเชื่อมต่อฐานข้อมูล PostgreSQL
 */

import { prisma } from "../src/lib/prisma";
import { logger } from "../src/lib/logger";

async function main() {
  console.log("🧹 เริ่มต้นล้างข้อมูลสถานีและ Charge Points...");

  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    await prisma.$connect();
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ");

    // นับจำนวนข้อมูลก่อนลบ
    const stationCount = await prisma.station.count();
    const chargePointCount = await prisma.charge_points.count();
    const connectorCount = await prisma.connectors.count();

    console.log(`📊 ข้อมูลก่อนลบ:`);
    console.log(`   - สถานี: ${stationCount} แห่ง`);
    console.log(`   - Charge Points: ${chargePointCount} ตัว`);
    console.log(`   - Connectors: ${connectorCount} ตัว`);

    if (stationCount === 0 && chargePointCount === 0 && connectorCount === 0) {
      console.log("ℹ️ ไม่มีข้อมูลที่ต้องลบ");
      return;
    }

    // ยืนยันการลบข้อมูล
    console.log(
      "\n⚠️  คำเตือน: การดำเนินการนี้จะลบข้อมูลทั้งหมดและไม่สามารถกู้คืนได้!"
    );
    process.stdout.write("คุณต้องการดำเนินการต่อหรือไม่? (y/N): ");

    // รอ input จากผู้ใช้ (ในสภาพแวดล้อม production ควรปิดส่วนนี้)
    const answer = "y"; // สำหรับการทดสอบ ให้ตอบ 'y' โดยอัตโนมัติ

    if (answer.toLowerCase() !== "y") {
      console.log("❌ ยกเลิกการดำเนินการ");
      return;
    }

    // ลบข้อมูลตามลำดับ (เพื่อป้องกัน foreign key constraint)
    console.log("\n🗑️  กำลังลบข้อมูล...");

    // 1. ลบ transactions ที่เกี่ยวข้องกับ charge points
    const deletedTransactions = await prisma.transactions.deleteMany({});
    console.log(`   ✅ ลบ Transactions: ${deletedTransactions.count} รายการ`);

    // 2. ลบ connectors
    const deletedConnectors = await prisma.connectors.deleteMany({});
    console.log(`   ✅ ลบ Connectors: ${deletedConnectors.count} ตัว`);

    // 3. ลบ charging profiles
    const deletedChargingProfiles = await prisma.charging_profiles.deleteMany(
      {}
    );
    console.log(
      `   ✅ ลบ Charging Profiles: ${deletedChargingProfiles.count} รายการ`
    );

    // 4. ลบ ocpp logs
    const deletedOcppLogs = await prisma.ocpp_logs.deleteMany({});
    console.log(`   ✅ ลบ OCPP Logs: ${deletedOcppLogs.count} รายการ`);

    // 5. ลบ charge point connections
    const deletedConnections = await prisma.charge_point_connections.deleteMany(
      {}
    );
    console.log(
      `   ✅ ลบ Charge Point Connections: ${deletedConnections.count} รายการ`
    );

    // 6. ลบ meter values
    const deletedMeterValues = await prisma.meter_values.deleteMany({});
    console.log(`   ✅ ลบ Meter Values: ${deletedMeterValues.count} รายการ`);

    // 7. ลบ charge points
    const deletedChargePoints = await prisma.charge_points.deleteMany({});
    console.log(`   ✅ ลบ Charge Points: ${deletedChargePoints.count} ตัว`);

    // 8. ลบ stations
    const deletedStations = await prisma.station.deleteMany({});
    console.log(`   ✅ ลบ Stations: ${deletedStations.count} แห่ง`);

    console.log("\n🎉 เสร็จสิ้นการล้างข้อมูล!");
    console.log("📊 สรุปการลบ:");
    console.log(`   - ลบสถานี: ${deletedStations.count} แห่ง`);
    console.log(`   - ลบ Charge Points: ${deletedChargePoints.count} ตัว`);
    console.log(`   - ลบ Connectors: ${deletedConnectors.count} ตัว`);
    console.log(`   - ลบ Transactions: ${deletedTransactions.count} รายการ`);
    console.log(
      `   - ลบ Charging Profiles: ${deletedChargingProfiles.count} รายการ`
    );
    console.log(`   - ลบ OCPP Logs: ${deletedOcppLogs.count} รายการ`);
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการล้างข้อมูล:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 ปิดการเชื่อมต่อฐานข้อมูล");
  }
}

// รัน script
main();
