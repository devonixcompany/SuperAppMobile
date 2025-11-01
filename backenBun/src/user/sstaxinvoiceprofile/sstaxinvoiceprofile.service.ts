import type { Prisma, PrismaClient } from "@prisma/client";
import {
  BranchType,
  SsTaxInvoiceProfile,
  TaxpayerType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";

type CreateTaxInvoiceProfileInput = {
  userId: string;
  taxpayerType: TaxpayerType;
  fullName?: string;
  companyName?: string;
  taxId: string;
  branchType?: BranchType;
  branchCode?: string;
  addressLine1: string;
  addressLine2?: string;
  provinceId: string;
  districtId: string;
  subdistrictId: string;
  postalCode: string;
  isDefault?: boolean;
};

type UpdateTaxInvoiceProfileInput = Partial<{
  taxpayerType: TaxpayerType;
  fullName: string | null;
  companyName: string | null;
  taxId: string;
  branchType: BranchType | null;
  branchCode: string | null;
  addressLine1: string;
  addressLine2: string | null;
  provinceId: string;
  districtId: string;
  subdistrictId: string;
  postalCode: string;
  isDefault: boolean;
}>;

export class SsTaxInvoiceProfileService {
  private prisma: PrismaClient;
  private mockData: SsTaxInvoiceProfile[] = [];

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.warn("Database not available, using mock data:", error);
      return false;
    }
  }

  private isPrismaUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      (error as Prisma.PrismaClientKnownRequestError).code === "P2002"
    );
  }

  private validateTaxpayerFields(payload: {
    taxpayerType: TaxpayerType;
    fullName?: string | null;
    companyName?: string | null;
    taxId: string;
    branchType?: BranchType | null;
    branchCode?: string | null;
  }): void {
    if (payload.taxpayerType === "PERSONAL") {
      if (!payload.fullName) {
        throw new Error("Full name is required for personal taxpayer");
      }
      if (payload.taxId.length !== 13) {
        throw new Error("Tax ID must be 13 digits for personal taxpayer");
      }
    } else if (payload.taxpayerType === "JURISTIC") {
      if (!payload.companyName) {
        throw new Error("Company name is required for juristic taxpayer");
      }
      if (payload.taxId.length !== 10) {
        throw new Error("Tax ID must be 10 digits for juristic taxpayer");
      }
      if (!payload.branchType) {
        throw new Error("Branch type is required for juristic taxpayer");
      }
      if (!payload.branchCode) {
        throw new Error("Branch code is required for juristic taxpayer");
      }
    }
  }

  private mapCreateDataForPrisma(
    data: CreateTaxInvoiceProfileInput,
  ): Prisma.SsTaxInvoiceProfileCreateInput {
    return {
      userId: data.userId,
      taxpayerType: data.taxpayerType,
      fullName: data.fullName ?? null,
      companyName: data.companyName ?? null,
      taxId: data.taxId,
      branchType: data.branchType ?? null,
      branchCode: data.branchCode ?? null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      provinceId: data.provinceId,
      districtId: data.districtId,
      subdistrictId: data.subdistrictId,
      postalCode: data.postalCode,
      isDefault: data.isDefault ?? false,
    };
  }

  private mapUpdateDataForPrisma(
    data: UpdateTaxInvoiceProfileInput,
  ): Prisma.SsTaxInvoiceProfileUpdateInput {
    const updateData: Prisma.SsTaxInvoiceProfileUpdateInput = {};

    if (data.taxpayerType !== undefined) {
      updateData.taxpayerType = data.taxpayerType;
    }
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName ?? null;
    }
    if (data.companyName !== undefined) {
      updateData.companyName = data.companyName ?? null;
    }
    if (data.taxId !== undefined) {
      updateData.taxId = data.taxId;
    }
    if (data.branchType !== undefined) {
      updateData.branchType = data.branchType ?? null;
    }
    if (data.branchCode !== undefined) {
      updateData.branchCode = data.branchCode ?? null;
    }
    if (data.addressLine1 !== undefined) {
      updateData.addressLine1 = data.addressLine1;
    }
    if (data.addressLine2 !== undefined) {
      updateData.addressLine2 = data.addressLine2 ?? null;
    }
    if (data.provinceId !== undefined) {
      updateData.provinceId = data.provinceId;
    }
    if (data.districtId !== undefined) {
      updateData.districtId = data.districtId;
    }
    if (data.subdistrictId !== undefined) {
      updateData.subdistrictId = data.subdistrictId;
    }
    if (data.postalCode !== undefined) {
      updateData.postalCode = data.postalCode;
    }
    if (data.isDefault !== undefined) {
      updateData.isDefault = data.isDefault;
    }

    return updateData;
  }

  private buildMockProfile(
    data: CreateTaxInvoiceProfileInput,
  ): SsTaxInvoiceProfile {
    const now = new Date();
    const isDefault = data.isDefault ?? false;

    if (isDefault) {
      this.mockData = this.mockData.filter(
        (profile) => !(profile.userId === data.userId && profile.isDefault),
      );
    }

    const mockProfile: SsTaxInvoiceProfile = {
      id: randomUUID(),
      userId: data.userId,
      taxpayerType: data.taxpayerType,
      fullName: data.fullName ?? null,
      companyName: data.companyName ?? null,
      taxId: data.taxId,
      branchType: data.branchType ?? null,
      branchCode: data.branchCode ?? null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      provinceId: data.provinceId,
      districtId: data.districtId,
      subdistrictId: data.subdistrictId,
      postalCode: data.postalCode,
      isDefault,
      createdAt: now,
      updatedAt: now,
    };

    this.mockData.push(mockProfile);
    return mockProfile;
  }

  private updateMockProfile(
    existing: SsTaxInvoiceProfile,
    userId: string,
    data: UpdateTaxInvoiceProfileInput,
  ): SsTaxInvoiceProfile {
    if (data.isDefault) {
      this.mockData = this.mockData.map((profile) =>
        profile.userId === userId && profile.isDefault && profile.id !== existing.id
          ? { ...profile, isDefault: false, updatedAt: new Date() }
          : profile,
      );
    }

    const updatedProfile: SsTaxInvoiceProfile = {
      ...existing,
      taxpayerType: data.taxpayerType ?? existing.taxpayerType,
      fullName:
        data.fullName === undefined ? existing.fullName : data.fullName ?? null,
      companyName:
        data.companyName === undefined
          ? existing.companyName
          : data.companyName ?? null,
      taxId: data.taxId ?? existing.taxId,
      branchType:
        data.branchType === undefined
          ? existing.branchType
          : data.branchType ?? null,
      branchCode:
        data.branchCode === undefined
          ? existing.branchCode
          : data.branchCode ?? null,
      addressLine1: data.addressLine1 ?? existing.addressLine1,
      addressLine2:
        data.addressLine2 === undefined
          ? existing.addressLine2
          : data.addressLine2 ?? null,
      provinceId: data.provinceId ?? existing.provinceId,
      districtId: data.districtId ?? existing.districtId,
      subdistrictId: data.subdistrictId ?? existing.subdistrictId,
      postalCode: data.postalCode ?? existing.postalCode,
      isDefault: data.isDefault ?? existing.isDefault,
      updatedAt: new Date(),
    };

    const index = this.mockData.findIndex((profile) => profile.id === existing.id);
    if (index !== -1) {
      this.mockData[index] = updatedProfile;
    }

    return updatedProfile;
  }

  async createTaxInvoiceProfile(
    data: CreateTaxInvoiceProfileInput,
  ): Promise<SsTaxInvoiceProfile> {
    this.validateTaxpayerFields({
      taxpayerType: data.taxpayerType,
      fullName: data.fullName,
      companyName: data.companyName,
      taxId: data.taxId,
      branchType: data.branchType,
      branchCode: data.branchCode,
    });

    const useDatabase = await this.checkDatabaseConnection();
    if (!useDatabase) {
      const profile = this.buildMockProfile(data);
      console.log("Created mock tax invoice profile:", profile);
      return profile;
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        if (data.isDefault) {
          await tx.ssTaxInvoiceProfile.updateMany({
            where: { userId: data.userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.ssTaxInvoiceProfile.create({
          data: this.mapCreateDataForPrisma(data),
        });
      });

      return result;
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new Error(
          "Tax invoice profile already exists for this user and branch",
        );
      }
      throw error;
    }
  }

  async getTaxInvoiceProfilesByUserId(
    userId: string,
  ): Promise<SsTaxInvoiceProfile[]> {
    const useDatabase = await this.checkDatabaseConnection();
    if (!useDatabase) {
      return this.mockData
        .filter((profile) => profile.userId === userId)
        .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    }

    return this.prisma.ssTaxInvoiceProfile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async getTaxInvoiceProfileById(
    id: string,
    userId: string,
  ): Promise<SsTaxInvoiceProfile | null> {
    const useDatabase = await this.checkDatabaseConnection();
    if (!useDatabase) {
      return (
        this.mockData.find(
          (profile) => profile.id === id && profile.userId === userId,
        ) ?? null
      );
    }

    return this.prisma.ssTaxInvoiceProfile.findFirst({
      where: { id, userId },
    });
  }

  async updateTaxInvoiceProfile(
    id: string,
    userId: string,
    data: UpdateTaxInvoiceProfileInput,
  ): Promise<SsTaxInvoiceProfile> {
    const useDatabase = await this.checkDatabaseConnection();

    if (!useDatabase) {
      const existingProfile =
        this.mockData.find(
          (profile) => profile.id === id && profile.userId === userId,
        ) ?? null;

      if (!existingProfile) {
        throw new Error("Tax invoice profile not found");
      }

      const finalTaxpayerType = data.taxpayerType ?? existingProfile.taxpayerType;
      const finalFullName =
        data.fullName === undefined ? existingProfile.fullName : data.fullName;
      const finalCompanyName =
        data.companyName === undefined
          ? existingProfile.companyName
          : data.companyName;
      const finalTaxId = data.taxId ?? existingProfile.taxId;
      const finalBranchType =
        data.branchType === undefined
          ? existingProfile.branchType
          : data.branchType;
      const finalBranchCode =
        data.branchCode === undefined
          ? existingProfile.branchCode
          : data.branchCode;

      this.validateTaxpayerFields({
        taxpayerType: finalTaxpayerType,
        fullName: finalFullName,
        companyName: finalCompanyName,
        taxId: finalTaxId,
        branchType: finalBranchType,
        branchCode: finalBranchCode,
      });

      return this.updateMockProfile(existingProfile, userId, data);
    }

    const existingProfile =
      (await this.prisma.ssTaxInvoiceProfile.findFirst({
        where: { id, userId },
      })) ?? null;

    if (!existingProfile) {
      throw new Error("Tax invoice profile not found");
    }

    const finalTaxpayerType = data.taxpayerType ?? existingProfile.taxpayerType;
    const finalFullName =
      data.fullName === undefined ? existingProfile.fullName : data.fullName;
    const finalCompanyName =
      data.companyName === undefined
        ? existingProfile.companyName
        : data.companyName;
    const finalTaxId = data.taxId ?? existingProfile.taxId;
    const finalBranchType =
      data.branchType === undefined
        ? existingProfile.branchType
        : data.branchType;
    const finalBranchCode =
      data.branchCode === undefined
        ? existingProfile.branchCode
        : data.branchCode;

    this.validateTaxpayerFields({
      taxpayerType: finalTaxpayerType,
      fullName: finalFullName,
      companyName: finalCompanyName,
      taxId: finalTaxId,
      branchType: finalBranchType,
      branchCode: finalBranchCode,
    });

    const updatePayload = this.mapUpdateDataForPrisma(data);
    if (Object.keys(updatePayload).length === 0) {
      return existingProfile;
    }

    try {
      const updatedProfile = await this.prisma.$transaction(async (tx) => {
        if (data.isDefault) {
          await tx.ssTaxInvoiceProfile.updateMany({
            where: { userId, isDefault: true, NOT: { id } },
            data: { isDefault: false },
          });
        }

        return tx.ssTaxInvoiceProfile.update({
          where: { id },
          data: updatePayload,
        });
      });

      return updatedProfile;
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new Error(
          "Tax invoice profile already exists for this user and branch",
        );
      }
      throw error;
    }
  }

  async deleteTaxInvoiceProfile(id: string, userId: string): Promise<void> {
    const useDatabase = await this.checkDatabaseConnection();
    if (!useDatabase) {
      const existingProfile =
        this.mockData.find(
          (profile) => profile.id === id && profile.userId === userId,
        ) ?? null;

      if (!existingProfile) {
        throw new Error("Tax invoice profile not found");
      }

      this.mockData = this.mockData.filter(
        (profile) => !(profile.id === id && profile.userId === userId),
      );
      return;
    }

    const existingProfile =
      (await this.prisma.ssTaxInvoiceProfile.findFirst({
        where: { id, userId },
      })) ?? null;

    if (!existingProfile) {
      throw new Error("Tax invoice profile not found");
    }

    await this.prisma.ssTaxInvoiceProfile.delete({
      where: { id },
    });
  }

  async setDefaultProfile(
    id: string,
    userId: string,
  ): Promise<SsTaxInvoiceProfile> {
    const useDatabase = await this.checkDatabaseConnection();
    if (!useDatabase) {
      const existingProfile =
        this.mockData.find(
          (profile) => profile.id === id && profile.userId === userId,
        ) ?? null;

      if (!existingProfile) {
        throw new Error("Tax invoice profile not found");
      }

      this.mockData = this.mockData.map((profile) =>
        profile.userId === userId
          ? {
              ...profile,
              isDefault: profile.id === id,
              updatedAt: new Date(),
            }
          : profile,
      );

      return (
        this.mockData.find(
          (profile) => profile.id === id && profile.userId === userId,
        ) as SsTaxInvoiceProfile
      );
    }

    const existingProfile =
      (await this.prisma.ssTaxInvoiceProfile.findFirst({
        where: { id, userId },
      })) ?? null;

    if (!existingProfile) {
      throw new Error("Tax invoice profile not found");
    }

    const [, updatedProfile] = await this.prisma.$transaction([
      this.prisma.ssTaxInvoiceProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.ssTaxInvoiceProfile.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return updatedProfile;
  }
}
