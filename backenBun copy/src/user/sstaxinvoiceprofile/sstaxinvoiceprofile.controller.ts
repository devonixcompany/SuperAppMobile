import { Elysia, t } from 'elysia';
import { TaxpayerType, BranchType } from '@prisma/client';
import { SsTaxInvoiceProfileService } from './sstaxinvoiceprofile.service';

export const ssTaxInvoiceProfileController = (
  ssTaxInvoiceProfileService: SsTaxInvoiceProfileService
) =>
  new Elysia({ prefix: '/api/sstaxinvoiceprofile' })

    /**
     * Create Tax Invoice Profile
     */
    .post(
      '/',
      async ({ body, set }: { body: any; set: any }) => {
        try {
          const newProfile = await ssTaxInvoiceProfileService.createTaxInvoiceProfile(body);

          set.status = 201;
          return {
            success: true,
            message: 'สร้างโปรไฟล์ใบกำกับภาษีสำเร็จ',
            data: newProfile
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการสร้างโปรไฟล์ใบกำกับภาษี:', error);
          set.status = 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการสร้างโปรไฟล์ใบกำกับภาษี'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '📝 สร้างโปรไฟล์ใบกำกับภาษี',
          description: `
สร้างโปรไฟล์ใบกำกับภาษีสำหรับผู้ใช้

**หลักการ:**
- สร้างโปรไฟล์สำหรับบุคคลธรรมดาหรือนิติบุคคล
- สำหรับบุคคลธรรมดา: ต้องมี fullName และ taxId 13 หลัก
- สำหรับนิติบุคคล: ต้องมี companyName, taxId 10 หลัก, branchType, และ branchCode
- สามารถกำหนดให้เป็นโปรไฟล์เริ่มต้นได้ (isDefault)
          `,
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: {
                      type: 'string',
                      description: 'รหัสผู้ใช้',
                      example: 'user_123'
                    },
                    taxpayerType: {
                      type: 'string',
                      enum: ['PERSONAL', 'JURISTIC'],
                      description: 'ประเภทผู้เสียภาษี (บุคคลธรรมดา/นิติบุคคล)',
                      example: 'PERSONAL'
                    },
                    fullName: {
                      type: 'string',
                      description: 'ชื่อ-นามสกุล (สำหรับบุคคลธรรมดา)',
                      example: 'สมชาย ใจดี'
                    },
                    companyName: {
                      type: 'string',
                      description: 'ชื่อบริษัท (สำหรับนิติบุคคล)',
                      example: 'บริษัท ตัวอย่าง จำกัด'
                    },
                    taxId: {
                      type: 'string',
                      description: 'เลขประจำตัวผู้เสียภาษี (บุคคลธรรมดา 13 หลัก / นิติบุคคล 10 หลัก)',
                      example: '1234567890123'
                    },
                    branchType: {
                      type: 'string',
                      enum: ['HEAD_OFFICE', 'BRANCH'],
                      description: 'ประเภทสำนักงาน (สำนักงานใหญ่/สาขา) - สำหรับนิติบุคคล',
                      example: 'HEAD_OFFICE'
                    },
                    branchCode: {
                      type: 'string',
                      description: 'รหัสสาขา (สำหรับนิติบุคคล) เช่น "00000" = สำนักงานใหญ่',
                      example: '00000'
                    },
                    addressLine1: {
                      type: 'string',
                      description: 'ที่อยู่บรรทัดที่ 1',
                      example: '123 ถนนสุขุมวิท'
                    },
                    addressLine2: {
                      type: 'string',
                      description: 'ที่อยู่บรรทัดที่ 2',
                      example: 'แขวงคลองตันเหนือ เขตวัฒนา'
                    },
                    provinceId: {
                      type: 'string',
                      description: 'รหัสจังหวัด',
                      example: '10'
                    },
                    districtId: {
                      type: 'string',
                      description: 'รหัสอำเภอ',
                      example: '1001'
                    },
                    subdistrictId: {
                      type: 'string',
                      description: 'รหัสตำบล',
                      example: '100101'
                    },
                    postalCode: {
                      type: 'string',
                      description: 'รหัสไปรษณีย์',
                      example: '10110'
                    },
                    isDefault: {
                      type: 'boolean',
                      description: 'ตั้งเป็นโปรไฟล์เริ่มต้นหรือไม่',
                      example: false
                    }
                  },
                  required: ['userId', 'taxpayerType', 'taxId', 'addressLine1', 'provinceId', 'districtId', 'subdistrictId', 'postalCode']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'สร้างโปรไฟล์ใบกำกับภาษีสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'สร้างโปรไฟล์ใบกำกับภาษีสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'profile_123' },
                          userId: { type: 'string', example: 'user_123' },
                          taxpayerType: { type: 'string', example: 'PERSONAL' },
                          fullName: { type: 'string', example: 'สมชาย ใจดี' },
                          taxId: { type: 'string', example: '1234567890123' },
                          addressLine1: { type: 'string', example: '123 ถนนสุขุมวิท' },
                          provinceId: { type: 'string', example: '10' },
                          districtId: { type: 'string', example: '1001' },
                          subdistrictId: { type: 'string', example: '100101' },
                          postalCode: { type: 'string', example: '10110' },
                          isDefault: { type: 'boolean', example: false },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'ข้อมูลไม่ถูกต้อง',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Full name is required for personal taxpayer' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          userId: t.String(),
          taxpayerType: t.Enum(TaxpayerType),
          fullName: t.Optional(t.String()),
          companyName: t.Optional(t.String()),
          taxId: t.String({ minLength: 10, maxLength: 13 }),
          branchType: t.Optional(t.Enum(BranchType)),
          branchCode: t.Optional(t.String({ maxLength: 5 })),
          addressLine1: t.String(),
          addressLine2: t.Optional(t.String()),
          provinceId: t.String(),
          districtId: t.String(),
          subdistrictId: t.String(),
          postalCode: t.String({ maxLength: 10 }),
          isDefault: t.Optional(t.Boolean({ default: false }))
        })
      }
    )

    /**
     * Get All Tax Invoice Profiles by User ID
     */
    .get(
      '/user/:userId',
      async ({ params, set }: { params: { userId: string }; set: any }) => {
        try {
          const profiles = await ssTaxInvoiceProfileService.getTaxInvoiceProfilesByUserId(params.userId);

          return {
            success: true,
            message: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีสำเร็จ',
            data: profiles
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ใบกำกับภาษี:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ใบกำกับภาษี'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '📋 ดึงข้อมูลโปรไฟล์ใบกำกับภาษีทั้งหมด',
          description: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีทั้งหมดของผู้ใช้ โดยเรียงลำดับให้โปรไฟล์เริ่มต้นอยู่ก่อน',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'รหัสผู้ใช้',
              schema: { type: 'string', example: 'user_123' }
            }
          ],
          responses: {
            200: {
              description: 'ดึงข้อมูลสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีสำเร็จ' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            userId: { type: 'string' },
                            taxpayerType: { type: 'string' },
                            fullName: { type: 'string' },
                            companyName: { type: 'string' },
                            taxId: { type: 'string' },
                            branchType: { type: 'string' },
                            branchCode: { type: 'string' },
                            addressLine1: { type: 'string' },
                            addressLine2: { type: 'string' },
                            provinceId: { type: 'string' },
                            districtId: { type: 'string' },
                            subdistrictId: { type: 'string' },
                            postalCode: { type: 'string' },
                            isDefault: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          userId: t.String()
        })
      }
    )

    /**
     * Get Tax Invoice Profile by ID
     */
    .get(
      '/:id',
      async ({ params, query, set }: { params: { id: string }; query: { userId: string }; set: any }) => {
        try {
          const profile = await ssTaxInvoiceProfileService.getTaxInvoiceProfileById(params.id, query.userId);

          if (!profile) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบโปรไฟล์ใบกำกับภาษี'
            };
          }

          return {
            success: true,
            message: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีสำเร็จ',
            data: profile
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ใบกำกับภาษี:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ใบกำกับภาษี'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '🔍 ดึงข้อมูลโปรไฟล์ใบกำกับภาษีตาม ID',
          description: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีเฉพาะรายการตาม ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'รหัสโปรไฟล์',
              schema: { type: 'string', example: 'profile_123' }
            },
            {
              name: 'userId',
              in: 'query',
              required: true,
              description: 'รหัสผู้ใช้ (เพื่อตรวจสอบสิทธิ์)',
              schema: { type: 'string', example: 'user_123' }
            }
          ],
          responses: {
            200: {
              description: 'ดึงข้อมูลสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ดึงข้อมูลโปรไฟล์ใบกำกับภาษีสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string' },
                          taxpayerType: { type: 'string' },
                          fullName: { type: 'string' },
                          companyName: { type: 'string' },
                          taxId: { type: 'string' },
                          branchType: { type: 'string' },
                          branchCode: { type: 'string' },
                          addressLine1: { type: 'string' },
                          addressLine2: { type: 'string' },
                          provinceId: { type: 'string' },
                          districtId: { type: 'string' },
                          subdistrictId: { type: 'string' },
                          postalCode: { type: 'string' },
                          isDefault: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'ไม่พบข้อมูล',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'ไม่พบโปรไฟล์ใบกำกับภาษี' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          userId: t.String()
        })
      }
    )

    /**
     * Update Tax Invoice Profile
     */
    .put(
      '/:id',
      async ({ params, query, body, set }: { params: { id: string }; query: { userId: string }; body: any; set: any }) => {
        try {
          const updatedProfile = await ssTaxInvoiceProfileService.updateTaxInvoiceProfile(
            params.id,
            query.userId,
            body
          );

          return {
            success: true,
            message: 'อัพเดตโปรไฟล์ใบกำกับภาษีสำเร็จ',
            data: updatedProfile
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการอัพเดตโปรไฟล์ใบกำกับภาษี:', error);
          set.status = error.message === 'Tax invoice profile not found' ? 404 : 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการอัพเดตโปรไฟล์ใบกำกับภาษี'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '✏️ อัพเดตโปรไฟล์ใบกำกับภาษี',
          description: 'อัพเดตข้อมูลโปรไฟล์ใบกำกับภาษี',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'รหัสโปรไฟล์',
              schema: { type: 'string', example: 'profile_123' }
            },
            {
              name: 'userId',
              in: 'query',
              required: true,
              description: 'รหัสผู้ใช้ (เพื่อตรวจสอบสิทธิ์)',
              schema: { type: 'string', example: 'user_123' }
            }
          ],
          responses: {
            200: {
              description: 'อัพเดตสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'อัพเดตโปรไฟล์ใบกำกับภาษีสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string' },
                          taxpayerType: { type: 'string' },
                          fullName: { type: 'string' },
                          companyName: { type: 'string' },
                          taxId: { type: 'string' },
                          branchType: { type: 'string' },
                          branchCode: { type: 'string' },
                          addressLine1: { type: 'string' },
                          addressLine2: { type: 'string' },
                          provinceId: { type: 'string' },
                          districtId: { type: 'string' },
                          subdistrictId: { type: 'string' },
                          postalCode: { type: 'string' },
                          isDefault: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'ไม่พบข้อมูล',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Tax invoice profile not found' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          userId: t.String()
        }),
        body: t.Partial(t.Object({
          taxpayerType: t.Optional(t.Enum(TaxpayerType)),
          fullName: t.Optional(t.String()),
          companyName: t.Optional(t.String()),
          taxId: t.Optional(t.String()),
          branchType: t.Optional(t.Enum(BranchType)),
          branchCode: t.Optional(t.String()),
          addressLine1: t.Optional(t.String()),
          addressLine2: t.Optional(t.String()),
          provinceId: t.Optional(t.String()),
          districtId: t.Optional(t.String()),
          subdistrictId: t.Optional(t.String()),
          postalCode: t.Optional(t.String()),
          isDefault: t.Optional(t.Boolean())
        }))
      }
    )

    /**
     * Delete Tax Invoice Profile
     */
    .delete(
      '/:id',
      async ({ params, query, set }: { params: { id: string }; query: { userId: string }; set: any }) => {
        try {
          await ssTaxInvoiceProfileService.deleteTaxInvoiceProfile(params.id, query.userId);

          return {
            success: true,
            message: 'ลบโปรไฟล์ใบกำกับภาษีสำเร็จ'
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการลบโปรไฟล์ใบกำกับภาษี:', error);
          set.status = error.message === 'Tax invoice profile not found' ? 404 : 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบโปรไฟล์ใบกำกับภาษี'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '🗑️ ลบโปรไฟล์ใบกำกับภาษี',
          description: 'ลบโปรไฟล์ใบกำกับภาษี',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'รหัสโปรไฟล์',
              schema: { type: 'string', example: 'profile_123' }
            },
            {
              name: 'userId',
              in: 'query',
              required: true,
              description: 'รหัสผู้ใช้ (เพื่อตรวจสอบสิทธิ์)',
              schema: { type: 'string', example: 'user_123' }
            }
          ],
          responses: {
            200: {
              description: 'ลบสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ลบโปรไฟล์ใบกำกับภาษีสำเร็จ' }
                    }
                  }
                }
              }
            },
            404: {
              description: 'ไม่พบข้อมูล',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Tax invoice profile not found' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          userId: t.String()
        })
      }
    )

    /**
     * Set Default Tax Invoice Profile
     */
    .put(
      '/:id/set-default',
      async ({ params, query, set }: { params: { id: string }; query: { userId: string }; set: any }) => {
        try {
          const updatedProfile = await ssTaxInvoiceProfileService.setDefaultProfile(params.id, query.userId);

          return {
            success: true,
            message: 'ตั้งโปรไฟล์เริ่มต้นสำเร็จ',
            data: updatedProfile
          };
        } catch (error: any) {
          console.error('💥 เกิดข้อผิดพลาดในการตั้งโปรไฟล์เริ่มต้น:', error);
          set.status = error.message === 'Tax invoice profile not found' ? 404 : 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการตั้งโปรไฟล์เริ่มต้น'
          };
        }
      },
      {
        detail: {
          tags: ['User'],
          summary: '⭐ ตั้งโปรไฟล์เริ่มต้น',
          description: 'ตั้งโปรไฟล์ใบกำกับภาษีเป็นโปรไฟล์เริ่มต้น และยกเลิกโปรไฟล์เริ่มต้นเดิม',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'รหัสโปรไฟล์ที่ต้องการตั้งเป็นค่าเริ่มต้น',
              schema: { type: 'string', example: 'profile_123' }
            },
            {
              name: 'userId',
              in: 'query',
              required: true,
              description: 'รหัสผู้ใช้ (เพื่อตรวจสอบสิทธิ์)',
              schema: { type: 'string', example: 'user_123' }
            }
          ],
          responses: {
            200: {
              description: 'ตั้งค่าสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ตั้งโปรไฟล์เริ่มต้นสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string' },
                          taxpayerType: { type: 'string' },
                          fullName: { type: 'string' },
                          companyName: { type: 'string' },
                          taxId: { type: 'string' },
                          branchType: { type: 'string' },
                          branchCode: { type: 'string' },
                          addressLine1: { type: 'string' },
                          addressLine2: { type: 'string' },
                          provinceId: { type: 'string' },
                          districtId: { type: 'string' },
                          subdistrictId: { type: 'string' },
                          postalCode: { type: 'string' },
                          isDefault: { type: 'boolean', example: true },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'ไม่พบข้อมูล',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Tax invoice profile not found' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          userId: t.String()
        })
      }
    );
