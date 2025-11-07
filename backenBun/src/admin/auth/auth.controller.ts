import { Elysia, t } from 'elysia';
import { AdminLoginData, AdminRegistrationData, AdminAuthService } from './auth.service';

export const adminAuthController = (adminAuthService: AdminAuthService) =>
  new Elysia({ prefix: '/api/admin/auth' })
    .post(
      '/register',
      async ({ body, set, cookie }) => {
        try {
          const result = await adminAuthService.register(body as AdminRegistrationData);
          
          // Set HTTP-only cookies for tokens
          if (result.success && result.data) {
            // Set access token cookie (1 hour)
            cookie.accessToken.set({
              value: result.data.accessToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 60 * 60, // 1 hour in seconds
              path: '/'
            });
            
            // Set refresh token cookie (7 days)
            cookie.refreshToken.set({
              value: result.data.refreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
              path: '/'
            });
            
            // Remove tokens from response body for security
            const { accessToken, refreshToken, ...responseData } = result.data;
            set.status = 201;
            return {
              ...result,
              data: responseData
            };
          }
          
          set.status = 201;
          return result;
          
        } catch (error) {
          console.error('Admin registration error:', error);
          
          set.status = 400;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลงทะเบียนแอดมิน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: '🔐 ลงทะเบียนแอดมิน',
          description: `
สร้างบัญชีแอดมินใหม่สำหรับระบบ

**ระดับสิทธิ์ที่รองรับ:**
- **SUPERADMIN**: เข้าถึงทุกส่วนของระบบ
- **STAFF**: จำกัดการใช้งานเฉพาะงานที่ได้รับมอบหมาย

**ข้อกำหนดรหัสผ่าน:**
- อย่างน้อย 8 ตัวอักษร
- ควรผสมตัวอักษร ตัวเลข และอักขระพิเศษ

**ข้อควรระวังด้านความปลอดภัย:**
- ต้องเป็น SUPERADMIN เท่านั้นที่สร้างแอดมินใหม่ได้
- อีเมลต้องไม่ซ้ำกับแอดมินคนอื่น
- บัญชีใหม่จะถูกเปิดใช้งานทันที
          `,
          requestBody: {
            description: 'ข้อมูลสำหรับลงทะเบียนแอดมิน',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'confirmPassword', 'role'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'อีเมลของแอดมิน (ต้องไม่ซ้ำ)',
                      example: 'admin@company.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 8,
                      description: 'รหัสผ่านของแอดมิน (อย่างน้อย 8 ตัวอักษร)',
                      example: 'AdminSecurePass123!'
                    },
                    confirmPassword: {
                      type: 'string',
                      description: 'ยืนยันรหัสผ่าน (ต้องตรงกับรหัสผ่าน)',
                      example: 'AdminSecurePass123!'
                    },
                    firstName: {
                      type: 'string',
                      description: 'ชื่อจริงของแอดมิน (ถ้ามี)',
                      example: 'สมชาย'
                    },
                    lastName: {
                      type: 'string',
                      description: 'นามสกุลของแอดมิน (ถ้ามี)',
                      example: 'ใจดี'
                    },
                    role: {
                      type: 'string',
                      enum: ['SUPERADMIN', 'STAFF'],
                      description: 'ระดับสิทธิ์ของแอดมิน',
                      example: 'STAFF'
                    }
                  }
                },
                examples: {
                  superadmin: {
                    summary: 'ตัวอย่างการลงทะเบียน Super Admin',
                    value: {
                      email: 'superadmin@company.com',
                      password: 'SuperAdminPass123!',
                      confirmPassword: 'SuperAdminPass123!',
                      firstName: 'สมหญิง',
                      lastName: 'รักการบริหาร',
                      role: 'SUPERADMIN'
                    }
                  },
                  staff: {
                    summary: 'ตัวอย่างการลงทะเบียน Staff',
                    value: {
                      email: 'staff@company.com',
                      password: 'StaffPass123!',
                      confirmPassword: 'StaffPass123!',
                      firstName: 'สมศรี',
                      lastName: 'ทำงานดี',
                      role: 'STAFF'
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'ลงทะเบียนแอดมินสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ลงทะเบียนแอดมินสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          admin: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'admin_uuid_here' },
                              email: { type: 'string', example: 'admin@company.com' },
                              role: { type: 'string', example: 'STAFF' },
                              firstName: { type: 'string', example: 'สมชาย' },
                              lastName: { type: 'string', example: 'ใจดี' },
                              isActive: { type: 'boolean', example: true },
                              createdAt: { type: 'string', format: 'date-time' }
                            }
                          },
                          accessToken: { type: 'string', description: 'JWT access token (สำหรับยืนยันตัวตน)' },
                          refreshToken: { type: 'string', description: 'JWT refresh token (สำหรับออกโทเค็นใหม่)' }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'ตรวจสอบข้อมูลไม่ผ่านหรือมีแอดมินคนนี้อยู่แล้ว',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'อีเมลนี้ถูกใช้งานแล้ว' }
                    }
                  },
                  examples: {
                    validation: {
                      summary: 'ตรวจสอบข้อมูลไม่ผ่าน',
                      value: {
                        success: false,
                        message: 'รูปแบบอีเมลไม่ถูกต้อง'
                      }
                    },
                    duplicate: {
                      summary: 'พบแอดมินซ้ำ',
                      value: {
                        success: false,
                        message: 'อีเมลนี้ถูกใช้งานแล้ว'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          email: t.String(),
          password: t.String(),
          confirmPassword: t.String(),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          role: t.Union([t.Literal('SUPERADMIN'), t.Literal('STAFF')])
        })
      }
    )
    
    .post(
      '/login',
      async ({ body, set, cookie }) => {
        try {
          const result = await adminAuthService.login(body as AdminLoginData);
          
          // Set HTTP-only cookies for tokens
          if (result.success && result.data) {
            // Set access token cookie (1 hour)
            cookie.accessToken.set({
              value: result.data.accessToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 60 * 60, // 1 hour in seconds
              path: '/'
            });
            
            // Set refresh token cookie (7 days)
            cookie.refreshToken.set({
              value: result.data.refreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
              path: '/'
            });
            
            // Return full response including tokens
            return result;
          }
          
          return result;
          
        } catch (error) {
          console.error('Admin login error:', error);
          
          set.status = 401;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: '🔑 เข้าสู่ระบบแอดมิน',
          description: `
ยืนยันตัวตนแอดมินและรับโทเค็นสำหรับใช้งานระบบ

**ขั้นตอนการเข้าสู่ระบบ:**
1. ตรวจสอบอีเมลและรหัสผ่าน
2. ตรวจสอบสถานะบัญชีแอดมิน
3. สร้าง JWT access token และ refresh token
4. ส่งข้อมูลแอดมินพร้อมโทเค็นตอบกลับ

**มาตรการความปลอดภัย:**
- ตรวจสอบรหัสผ่านที่ถูกแฮช
- ตรวจสถานะบัญชี
- สร้างโทเค็นด้วย JWT
- ควบคุมสิทธิ์ตามบทบาท (RBAC)
          `,
          requestBody: {
            description: 'ข้อมูลเข้าสู่ระบบของแอดมิน',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'อีเมลของแอดมิน',
                      example: 'admin@company.com'
                    },
                    password: {
                      type: 'string',
                      description: 'รหัสผ่านของแอดมิน',
                      example: 'AdminSecurePass123!'
                    }
                  }
                },
                examples: {
                  superadmin: {
                    summary: 'เข้าสู่ระบบแบบ Super Admin',
                    value: {
                      email: 'superadmin@company.com',
                      password: 'SuperAdminPass123!'
                    }
                  },
                  staff: {
                    summary: 'เข้าสู่ระบบแบบ Staff',
                    value: {
                      email: 'staff@company.com',
                      password: 'StaffPass123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'เข้าสู่ระบบแอดมินสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'เข้าสู่ระบบแอดมินสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          admin: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'admin_uuid_here' },
                              email: { type: 'string', example: 'admin@company.com' },
                              role: { type: 'string', example: 'STAFF' },
                              firstName: { type: 'string', example: 'สมชาย' },
                              lastName: { type: 'string', example: 'ใจดี' },
                              isActive: { type: 'boolean', example: true },
                              createdAt: { type: 'string', format: 'date-time' }
                            }
                          },
                          accessToken: { 
                            type: 'string', 
                            description: 'JWT access token (อายุ 1 ชั่วโมง)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          refreshToken: { 
                            type: 'string', 
                            description: 'JWT refresh token (อายุ 7 วัน)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'ยืนยันตัวตนไม่ผ่าน',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          email: t.String(),
          password: t.String()
        })
      }
    )
    
    .post(
      '/refresh',
      async ({ body, set }) => {
        try {
          const { refreshToken } = body as { refreshToken: string };
          const result = await adminAuthService.refreshToken(refreshToken);
          
          if (!result.success) {
            set.status = 401;
            return result;
          }
          
          return result;
          
        } catch (error) {
          console.error('Admin refresh token error:', error);
          set.status = 401;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to refresh admin token'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: '🔄 รีเฟรชโทเค็นแอดมิน',
          description: `
สร้าง access token ใหม่โดยใช้ refresh token ที่ยังถูกต้อง

**ขั้นตอนการรีเฟรชโทเค็น:**
1. ตรวจสอบ refresh token ที่ส่งมา
2. เช็กว่าโทเค็นไม่หมดอายุและไม่ถูกยกเลิก
3. ยืนยันว่าแอดมินที่เกี่ยวข้องยังใช้งานได้
4. สร้าง access token และ refresh token ใหม่
5. เพิกถอน refresh token เดิมและบันทึกตัวใหม่

**ข้อควรระวังด้านความปลอดภัย:**
- refresh token ใช้ได้ครั้งเดียว
- ทุกครั้งที่รีเฟรชจะออก refresh token ใหม่
- access token มีอายุ 1 ชั่วโมง
- refresh token มีอายุ 7 วัน
- เฉพาะบัญชีแอดมินที่ยัง active เท่านั้นที่รีเฟรชได้
          `,
          requestBody: {
            description: 'ข้อมูล refresh token ของแอดมิน',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: {
                      type: 'string',
                      description: 'JWT refresh token ของแอดมินที่ยังใช้ได้',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                  }
                },
                examples: {
                  refresh: {
                    summary: 'ตัวอย่างคำขอรีเฟรชโทเค็นแอดมิน',
                    value: {
                      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiMTIzNDU2Nzg5MCIsInR5cGUiOiJhZG1pbl9yZWZyZXNoIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'รีเฟรชโทเค็นแอดมินสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'รีเฟรชโทเค็นแอดมินสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { 
                            type: 'string', 
                            description: 'JWT access token ใหม่ของแอดมิน (อายุ 1 ชั่วโมง)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          refreshToken: { 
                            type: 'string', 
                            description: 'JWT refresh token ใหม่ของแอดมิน (อายุ 7 วัน)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'refresh token ไม่ถูกต้องหรือหมดอายุ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'refresh token ไม่ถูกต้องหรือหมดอายุ' }
                    }
                  },
                  examples: {
                    invalid_token: {
                      summary: 'โทเค็นไม่ถูกต้อง',
                      value: {
                        success: false,
                        message: 'refresh token ไม่ถูกต้อง'
                      }
                    },
                    expired_token: {
                      summary: 'โทเค็นหมดอายุ',
                      value: {
                        success: false,
                        message: 'refresh token ไม่ถูกต้องหรือหมดอายุ'
                      }
                    },
                    admin_not_found: {
                      summary: 'ไม่พบบัญชีแอดมิน',
                      value: {
                        success: false,
                        message: 'ไม่พบบัญชีแอดมิน'
                      }
                    },
                    inactive_admin: {
                      summary: 'บัญชีแอดมินถูกระงับ',
                      value: {
                        success: false,
                        message: 'บัญชีแอดมินถูกระงับ'
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'ไม่สามารถรีเฟรชโทเค็นแอดมินได้' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          refreshToken: t.String()
        })
      }
    )
    
    .post(
      '/logout',
      async ({ cookie, set }) => {
        try {
          const refreshToken = cookie.refreshToken.value as string | undefined;
          
          if (refreshToken) {
            await adminAuthService.revokeRefreshToken(refreshToken);
          }
          
          // Clear cookies
          cookie.accessToken.remove();
          cookie.refreshToken.remove();
          
          return {
            success: true,
            message: 'ออกจากระบบแอดมินสำเร็จ'
          };
          
        } catch (error) {
          console.error('Admin logout error:', error);
          
          // Clear cookies even if there's an error
          cookie.accessToken.remove();
          cookie.refreshToken.remove();
          
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: '🚪 ออกจากระบบแอดมิน',
          description: `
ออกจากระบบและทำให้โทเค็นของแอดมินใช้ไม่ได้อีก

**ขั้นตอนการออกจากระบบ:**
1. เพิกถอน refresh token ในฐานข้อมูล
2. ล้างคุกกี้แบบ HTTP-only
3. ส่งผลลัพธ์ยืนยันการออกจากระบบ

**มาตรการความปลอดภัย:**
- ยกเลิกโทเค็น
- ล้างคุกกี้อย่างปลอดภัย
- ปิดเซสชันการใช้งาน
          `,
          responses: {
            200: {
              description: 'ออกจากระบบแอดมินสำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ออกจากระบบแอดมินสำเร็จ' }
                    }
                  }
                }
              }
            },
            500: {
              description: 'ออกจากระบบไม่สำเร็จ',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    );
