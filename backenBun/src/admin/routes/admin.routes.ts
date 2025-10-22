import { Elysia, t } from 'elysia';
import { JWTService } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';

export const adminRoutes = (jwtService: JWTService) =>
  new Elysia({ prefix: '/api/admin' })
    .onError(({ code, error, set }) => {
      console.error('❌ Admin Elysia Error:', { code, error: error.message });

      if (code === 'VALIDATION') {
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          error: error.message
        };
      }

      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      };
    })
    .post(
      '/register',
      async ({ body, set }) => {
        console.log('📥 Admin registration request received:', body);
        try {
          const { email, password, confirmPassword, firstName, lastName, role } = body as any;

          // Validate input data
          if (!email || !password || !confirmPassword || !role) {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            };
          }

          if (password !== confirmPassword) {
            set.status = 400;
            return {
              success: false,
              message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'
            };
          }

          if (password.length < 8) {
            set.status = 400;
            return {
              success: false,
              message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
            };
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            set.status = 400;
            return {
              success: false,
              message: 'รูปแบบอีเมลไม่ถูกต้อง'
            };
          }

          if (!['SUPERADMIN', 'STAFF'].includes(role)) {
            set.status = 400;
            return {
              success: false,
              message: 'ตำแหน่งไม่ถูกต้อง'
            };
          }

          // Check if admin already exists
          const existingAdmin = await prisma.admin.findUnique({
            where: { email }
          });

          if (existingAdmin) {
            set.status = 400;
            return {
              success: false,
              message: 'อีเมลนี้ถูกใช้งานแล้ว'
            };
          }

          // Hash password
          const hashedPassword = await hashPassword(password);

          // Create new admin
          const newAdmin = await prisma.admin.create({
            data: {
              email,
              password: hashedPassword,
              role,
              firstName,
              lastName,
              isActive: true,
            },
          });

          // Generate JWT token
          const token = await jwtService.generateAdminToken(newAdmin);

          // Generate refresh token
          const refreshToken = await jwtService.generateAdminRefreshToken(newAdmin);

          set.status = 201;
          return {
            success: true,
            message: 'ลงทะเบียนแอดมินสำเร็จ',
            data: {
              admin: {
                id: newAdmin.id,
                email: newAdmin.email,
                role: newAdmin.role,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName,
                isActive: newAdmin.isActive,
                createdAt: newAdmin.createdAt,
              },
              token,
              refreshToken
            }
          };

        } catch (error) {
          console.error('Admin registration error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการลงทะเบียนแอดมิน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: 'Admin registration',
          description: 'Register a new admin with email and password'
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
      async ({ body, set }) => {
        try {
          const { email, password } = body as any;

          if (!email || !password) {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณากรอกอีเมลและรหัสผ่าน'
            };
          }

          // Find admin by email
          const admin = await prisma.admin.findUnique({
            where: { email }
          });

          if (!admin) {
            set.status = 401;
            return {
              success: false,
              message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            };
          }

          // Check if admin is active
          if (!admin.isActive) {
            set.status = 401;
            return {
              success: false,
              message: 'บัญชีแอดมินถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
            };
          }

          // Verify password
          const isPasswordValid = await verifyPassword(password, admin.password);

          if (!isPasswordValid) {
            set.status = 401;
            return {
              success: false,
              message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            };
          }

          // Generate JWT token
          const token = await jwtService.generateAdminToken(admin);

          // Generate refresh token
          const refreshToken = await jwtService.generateAdminRefreshToken(admin);

          return {
            success: true,
            message: 'เข้าสู่ระบบแอดมินสำเร็จ',
            data: {
              admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isActive: admin.isActive,
                createdAt: admin.createdAt,
              },
              token,
              refreshToken
            }
          };

        } catch (error) {
          console.error('Admin login error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบแอดมิน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: 'Admin login',
          description: 'Authenticate admin with email and password'
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

          if (!refreshToken) {
            set.status = 400;
            return {
              success: false,
              message: 'Refresh token is required'
            };
          }

          // Verify refresh token and get admin ID
          const payload = await jwtService.verifyAdminRefreshToken(refreshToken);
          
          if (!payload) {
            set.status = 401;
            return {
              success: false,
              message: 'Invalid refresh token'
            };
          }

          // Find admin by ID
          const admin = await prisma.admin.findUnique({
            where: { id: payload.adminId }
          });

          if (!admin) {
            set.status = 401;
            return {
              success: false,
              message: 'Admin not found'
            };
          }

          // Check if admin is active
          if (!admin.isActive) {
            set.status = 401;
            return {
              success: false,
              message: 'Admin account is inactive'
            };
          }

          // Generate new tokens
          const newToken = await jwtService.generateAdminToken(admin);
          const newRefreshToken = await jwtService.generateAdminRefreshToken(admin);

          return {
            success: true,
            message: 'Admin token refreshed successfully',
            data: {
              token: newToken,
              refreshToken: newRefreshToken
            }
          };

        } catch (error) {
          console.error('Admin refresh token error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'Failed to refresh admin token'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: 'Refresh admin access token',
          description: 'Generate new admin access token using refresh token'
        },
        body: t.Object({
          refreshToken: t.String()
        })
      }
    );