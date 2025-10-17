import { Elysia, t } from 'elysia';
import { JWTService } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import { prisma } from '../lib/prisma';
import {
  EmailLoginData,
  LoginData,
  RegistrationData,
  ValidationError,
  validateEmailLoginData,
  validateLoginData,
  validateRegistrationData
} from '../lib/validation';

export const authRoutes = (jwtService: JWTService) =>
  new Elysia({ prefix: '/api/auth' })
    .onError(({ code, error, set }) => {
      console.error('❌ Elysia Error:', { code, error: error.message });

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
        console.log('📥 Registration request received:', body);
        try {
          // Validate input data
          validateRegistrationData(body as RegistrationData);

          const { firebaseUid, phoneNumber, userType, fullName, email, password } = body as RegistrationData;

          // Check if user already exists
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { firebaseUid: firebaseUid },
                { email: email }
              ]
            }
          });

          if (existingUser) {
            set.status = 400;
            return {
              success: false,
              message: 'ผู้ใช้นี้มีอยู่แล้วในระบบ'
            };
          }

          // Hash password
          const hashedPassword = await hashPassword(password);

          // Map userType to database enum
          const typeUser = userType === 'corporate' ? 'BUSINESS' : 'NORMAL';

          // Create new user
          const newUser = await prisma.user.create({
            data: {
              firebaseUid: firebaseUid,
              phoneNumber: phoneNumber,
              email: email,
              fullName: fullName,
              password: hashedPassword,
              typeUser: typeUser,
              status: 'ACTIVE'
            }
          });

          // Generate JWT token
          const token = await jwtService.generateToken(newUser);

          // Generate refresh token
          const refreshToken = await jwtService.generateRefreshToken(newUser);

          // Update user with refresh token
          await prisma.user.update({
            where: { id: newUser.id },
            data: { refresh_token: refreshToken }
          });

          set.status = 201;
          return {
            success: true,
            message: 'ลงทะเบียนสำเร็จ',
            data: {
              user: {
                id: newUser.id,
                firebaseUid: newUser.firebaseUid,
                phoneNumber: newUser.phoneNumber,
                email: newUser.email,
                fullName: newUser.fullName,
                typeUser: newUser.typeUser,
                status: newUser.status,
                createdAt: newUser.createdAt
              },
              token,
              refreshToken
            }
          };

        } catch (error) {
          console.error('Registration error:', error);

          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              message: error.message
            };
          }

          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: 'User registration',
          description: 'Register a new user with email and password'
        },
        body: t.Object({
          firebaseUid: t.String(),
          phoneNumber: t.String(), // Phone number from Firebase OTP
          userType: t.Union([t.Literal('individual'), t.Literal('corporate')]),
          fullName: t.String(),
          email: t.String(),
          password: t.String(),
          confirmPassword: t.String()
        })
      }
    )

    .post(
      '/login',
      async ({ body, set }) => {
        try {
          // Check if it's phone number or email login
          const isPhoneLogin = 'phoneNumber' in body && body.phoneNumber;

          if (isPhoneLogin) {
            // Validate phone number login data
            validateLoginData(body as LoginData);

            const { phoneNumber, password } = body as LoginData;

            // Find user by phone number
            const user = await prisma.user.findFirst({
              where: {
                phoneNumber: phoneNumber
              }
            });

            if (!user) {
              set.status = 401;
              return {
                success: false,
                message: 'หมายเลขโทรศัพท์หรือรหัสผ่านไม่ถูกต้อง'
              };
            }

            // Check if user is active
            if (user.status !== 'ACTIVE') {
              set.status = 401;
              return {
                success: false,
                message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
              };
            }

            // Verify password
            const isPasswordValid = await verifyPassword(password, user.password);

            if (!isPasswordValid) {
              set.status = 401;
              return {
                success: false,
                message: 'หมายเลขโทรศัพท์หรือรหัสผ่านไม่ถูกต้อง'
              };
            }

            // Generate JWT token
            const token = await jwtService.generateToken(user);

            // Generate refresh token
            const refreshToken = await jwtService.generateRefreshToken(user);

            // Update user with refresh token
            await prisma.user.update({
              where: { id: user.id },
              data: { refresh_token: refreshToken }
            });

            return {
              success: true,
              message: 'เข้าสู่ระบบสำเร็จ',
              data: {
                user: {
                  id: user.id,
                  firebaseUid: user.firebaseUid,
                  phoneNumber: user.phoneNumber,
                  email: user.email,
                  fullName: user.fullName,
                  typeUser: user.typeUser,
                  status: user.status,
                  createdAt: user.createdAt
                },
                token,
                refreshToken
              }
            };
          } else if ('email' in body && body.email) {
            // Email login (backward compatibility)
            validateEmailLoginData(body as EmailLoginData);

            const { email, password } = body as EmailLoginData;

            // Find user by email (using phoneNumber field)
            const user = await prisma.user.findFirst({
              where: {
                OR: [
                  { phoneNumber: email },
                  { firebaseUid: email },
                  { email: email }
                ]
              }
            });

            if (!user) {
              set.status = 401;
              return {
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
              };
            }

            // Check if user is active
            if (user.status !== 'ACTIVE') {
              set.status = 401;
              return {
                success: false,
                message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
              };
            }

            // Verify password
            const isPasswordValid = await verifyPassword(password, user.password);

            if (!isPasswordValid) {
              set.status = 401;
              return {
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
              };
            }

            // Generate JWT token
            const token = await jwtService.generateToken(user);

            // Generate refresh token
            const refreshToken = await jwtService.generateRefreshToken(user);

            // Update user with refresh token
            await prisma.user.update({
              where: { id: user.id },
              data: { refresh_token: refreshToken }
            });

            return {
              success: true,
              message: 'เข้าสู่ระบบสำเร็จ',
              data: {
                user: {
                  id: user.id,
                  firebaseUid: user.firebaseUid,
                  phoneNumber: user.phoneNumber,
                  email: user.email,
                  fullName: user.fullName,
                  typeUser: user.typeUser,
                  status: user.status,
                  createdAt: user.createdAt
                },
                token,
                refreshToken
              }
            };
          } else {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณากรอกหมายเลขโทรศัพท์หรืออีเมล'
            };
          }

        } catch (error) {
          console.error('Login error:', error);

          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              message: error.message
            };
          }

          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user with phone number/email and password'
        },
        body: t.Object({
          phoneNumber: t.Optional(t.String()),
          email: t.Optional(t.String()),
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

          // Find user by refresh token
          const user = await prisma.user.findFirst({
            where: { refresh_token: refreshToken }
          });

          if (!user) {
            set.status = 401;
            return {
              success: false,
              message: 'Invalid refresh token'
            };
          }

          // Check if user is active
          if (user.status !== 'ACTIVE') {
            set.status = 401;
            return {
              success: false,
              message: 'User account is inactive'
            };
          }

          // Generate new tokens
          const newToken = await jwtService.generateToken(user);
          const newRefreshToken = await jwtService.generateRefreshToken(user);

          // Update user with new refresh token
          await prisma.user.update({
            where: { id: user.id },
            data: { refresh_token: newRefreshToken }
          });

          return {
            success: true,
            message: 'Token refreshed successfully',
            data: {
              token: newToken,
              refreshToken: newRefreshToken
            }
          };

        } catch (error) {
          console.error('Refresh token error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'Failed to refresh token'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: 'Refresh access token',
          description: 'Generate new access token using refresh token'
        },
        body: t.Object({
          refreshToken: t.String()
        })
      }
    );