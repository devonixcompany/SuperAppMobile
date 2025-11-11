#!/usr/bin/env bun
/**
 * Script แสดงข้อมูลสรุปสถานีและ Charge Points
 *
 * การใช้งาน:
 * bun scripts/station-summary.ts
 *
 * Environment variables ที่ต้องการ:
 * - DATABASE_URL: URL สำหรับเชื่อมต่อฐานข้อมูล PostgreSQL
 */

import { prisma } from "../src/lib/prisma";
import { logger } from "../src/shared/logger";

interface StationSummary {
  id: string;
  stationname: string;
  location: string;
  flatRate: number;
  onPeakRate: number;
  offPeakRate: number;
  chargePointCount: number;
  connectorCount: number;
  totalTransactions: number;
  totalRevenue: number;
  status: string;
}

interface ChargePointSummary {
  id: string;
  chargePointId: string;
  name: string;
  vendor: string;
  model: string;
  powerRating: number;
  status: string;
  connectorCount: number;
  totalTransactions: number;
  lastSeen: Date | null;
}

async function getStationSummary(): Promise<StationSummary[]> {
  const stations = await prisma.station.findMany({
    select: {
      id: true,
      stationname: true,
      location: true,
      flatRate: true,
      onPeakRate: true,
      offPeakRate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const stationSummaries: StationSummary[] = [];

  for (const station of stations) {
    // Get charge points for this station
    const chargePoints = await prisma.charge_points.findMany({
      where: {
        stationId: station.id,
      },
    });

    // Get connectors count for each charge point
    const chargePointIds = chargePoints.map((cp) => cp.id);
    const connectors = await prisma.connectors.findMany({
      where: {
        charge_point_id: {
          in: chargePointIds,
        },
      },
    });

    // Get transactions count for this station
    const transactionCount = await prisma.transactions.count({
      where: {
        charge_point_id: {
          in: chargePointIds,
        },
      },
    });

    // Get total revenue for this station
    const revenueResult = await prisma.transactions.aggregate({
      where: {
        charge_point_id: {
          in: chargePointIds,
        },
      },
      _sum: {
        cost: true,
      },
    });

    stationSummaries.push({
      id: station.id,
      stationname: station.stationname,
      location: station.location,
      flatRate: station.flatRate,
      onPeakRate: station.onPeakRate,
      offPeakRate: station.offPeakRate,
      chargePointCount: chargePoints.length,
      connectorCount: connectors.length,
      totalTransactions: transactionCount,
      totalRevenue: revenueResult._sum.cost || 0,
      status: "Active", // You might want to determine this based on charge point status
    });
  }

  return stationSummaries;
}

async function getChargePointSummary(): Promise<ChargePointSummary[]> {
  const chargePoints = await prisma.charge_points.findMany({
    select: {
      id: true,
      charge_point_id: true,
      chargepointname: true,
      name: true,
      charge_point_vendor: true,
      charge_point_model: true,
      powerRating: true,
      chargepointstatus: true,
      lastSeen: true,
      created_at: true,
    },
  });

  const chargePointSummaries: ChargePointSummary[] = [];

  for (const cp of chargePoints) {
    // Get connectors count for this charge point
    const connectorCount = await prisma.connectors.count({
      where: {
        charge_point_id: cp.id,
      },
    });

    // Get transactions count for this charge point
    const transactionCount = await prisma.transactions.count({
      where: {
        charge_point_id: cp.id,
      },
    });

    chargePointSummaries.push({
      id: cp.id,
      chargePointId: cp.charge_point_id,
      name: cp.chargepointname || cp.name || "Unknown",
      vendor: cp.charge_point_vendor || "Unknown",
      model: cp.charge_point_model || "Unknown",
      powerRating: cp.powerRating || 0,
      status: cp.chargepointstatus || "Unknown",
      connectorCount,
      totalTransactions: transactionCount,
      lastSeen: cp.lastSeen,
    });
  }

  return chargePointSummaries;
}

function formatCurrency(amount: number, currency: string = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(date: Date | null): string {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPower(power: number): string {
  if (power >= 1000) {
    return `${(power / 1000).toFixed(1)} kW`;
  }
  return `${power} W`;
}

async function main() {
  console.log("📊 กำลังดึงข้อมูลสรุปสถานีและ Charge Points...");

  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    await prisma.$connect();
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n");

    // ดึงข้อมูลสรุป
    const stationSummaries = await getStationSummary();
    const chargePointSummaries = await getChargePointSummary();

    // สรุปทั่วไป
    console.log("📋 สรุปทั่วไป");
    console.log("=".repeat(80));
    console.log(`จำนวนสถานีทั้งหมด: ${stationSummaries.length} แห่ง`);
    console.log(
      `จำนวน Charge Points ทั้งหมด: ${chargePointSummaries.length} ตัว`
    );

    const totalConnectors = chargePointSummaries.reduce(
      (total, cp) => total + cp.connectorCount,
      0
    );
    const totalTransactions = chargePointSummaries.reduce(
      (total, cp) => total + cp.totalTransactions,
      0
    );
    const totalRevenue = stationSummaries.reduce(
      (total, station) => total + station.totalRevenue,
      0
    );

    console.log(`จำนวน Connectors ทั้งหมด: ${totalConnectors} ตัว`);
    console.log(`จำนวน Transactions ทั้งหมด: ${totalTransactions} รายการ`);
    console.log(`รายได้รวมทั้งหมด: ${formatCurrency(totalRevenue)}`);

    // รายละเอียดสถานี
    console.log("\n🏢 รายละเอียดสถานี");
    console.log("=".repeat(80));

    if (stationSummaries.length === 0) {
      console.log("❌ ไม่พบข้อมูลสถานี");
    } else {
      console.log(String.raw`
| สถานี                     | สถานที่ตั้ง           | CP  | Con. | Tx  | รายได้         |
|---------------------------|-----------------------|-----|------|-----|----------------|
${stationSummaries
  .map(
    (station) =>
      `| ${station.stationname.padEnd(25)} | ${station.location.padEnd(
        21
      )} | ${station.chargePointCount
        .toString()
        .padStart(3)} | ${station.connectorCount
        .toString()
        .padStart(4)} | ${station.totalTransactions
        .toString()
        .padStart(3)} | ${formatCurrency(station.totalRevenue).padStart(14)} |`
  )
  .join("\n")}
      `);

      console.log("\n📈 สถานะสถานี:");
      stationSummaries.forEach((station) => {
        const utilizationRate =
          station.totalTransactions > 0
            ? (
                (station.totalTransactions / (station.connectorCount * 30)) *
                100
              ).toFixed(1)
            : "0.0";

        console.log(`   📍 ${station.stationname}:`);
        console.log(`      - อัตราการใช้งาน (ประมาณ): ${utilizationRate}%`);
        console.log(
          `      - ราคาชาร์จ: ${formatCurrency(
            station.flatRate
          )} (Flat), ${formatCurrency(
            station.onPeakRate
          )} (Peak), ${formatCurrency(station.offPeakRate)} (Off-Peak)`
        );
      });
    }

    // รายละเอียด Charge Points
    console.log("\n⚡ รายละเอียด Charge Points");
    console.log("=".repeat(80));

    if (chargePointSummaries.length === 0) {
      console.log("❌ ไม่พบข้อมูล Charge Points");
    } else {
      console.log(String.raw`
| Charge Point ID     | ชื่อ                     | ผู้ผลิต       | กำลัง   | Con. | Tx   | สถานะ      | ใช้งานล่าสุด    |
|---------------------|--------------------------|---------------|--------|------|------|-------------|------------------|
${chargePointSummaries
  .map(
    (cp) =>
      `| ${cp.chargePointId.padEnd(19)} | ${cp.name.padEnd(
        24
      )} | ${cp.vendor.padEnd(13)} | ${formatPower(cp.powerRating).padEnd(
        6
      )} | ${cp.connectorCount.toString().padStart(4)} | ${cp.totalTransactions
        .toString()
        .padStart(4)} | ${cp.status.padEnd(11)} | ${formatDateTime(
        cp.lastSeen
      ).padEnd(16)} |`
  )
  .join("\n")}
      `);

      // สรุปตามสถานะ
      console.log("\n📊 สรุปตามสถานะ:");
      const statusCount = chargePointSummaries.reduce((acc, cp) => {
        acc[cp.status] = (acc[cp.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(statusCount).forEach(([status, count]) => {
        const emoji =
          status === "Available"
            ? "🟢"
            : status === "Charging"
            ? "🔋"
            : status === "Unavailable"
            ? "🔴"
            : "⚪";
        console.log(`   ${emoji} ${status}: ${count} ตัว`);
      });

      // สรุปตามกำลังการผลิต
      console.log("\n⚡ สรุปตามกำลังการผลิต:");
      const powerGroups = {
        "7kW": 0,
        "22kW": 0,
        "50kW": 0,
        "150kW+": 0,
      };

      chargePointSummaries.forEach((cp) => {
        if (cp.powerRating <= 7000) powerGroups["7kW"]++;
        else if (cp.powerRating <= 22000) powerGroups["22kW"]++;
        else if (cp.powerRating <= 50000) powerGroups["50kW"]++;
        else powerGroups["150kW+"]++;
      });

      Object.entries(powerGroups).forEach(([power, count]) => {
        if (count > 0) {
          console.log(`   ${power}: ${count} ตัว`);
        }
      });
    }

    console.log("\n✨ สำเร็จ! แสดงข้อมูลสรุปเรียบร้อยแล้ว");
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 ปิดการเชื่อมต่อฐานข้อมูล");
  }
}

// รัน script
main();
