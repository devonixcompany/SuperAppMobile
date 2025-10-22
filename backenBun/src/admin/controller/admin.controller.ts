import { Elysia, t } from 'elysia';
import { AdminLoginData, AdminRegistrationData, AdminService } from '../service/admin.service';

export const adminController = (adminService: AdminService) =>
  new Elysia({ prefix: '/api/admin' })
    .post(
      '/register',
      async ({ body, set, cookie }) => {
        try {
          const result = await adminService.register(body as AdminRegistrationData);
          
          // Set HTTP-only cookies for tokens
          if (result.success && result.data) {
            // Set access token cookie (1 hour)
            cookie.accessToken.set({
              value: result.data.token,
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
            const { token, refreshToken, ...responseData } = result.data;
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
          summary: '🔐 Admin Registration',
          description: `
Register a new admin account in the system.

**Supported Admin Roles:**
- **SUPERADMIN**: Full system access with all permissions
- **STAFF**: Limited access for specific administrative tasks

**Password Requirements:**
- Minimum 8 characters
- Should contain a mix of letters, numbers, and special characters

**Security Notes:**
- Only SUPERADMIN users can create new admin accounts
- Email must be unique across all admin accounts
- All admin accounts are created as active by default
          `,
          requestBody: {
            description: 'Admin registration data',
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
                      description: 'Admin email address (must be unique)',
                      example: 'admin@company.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 8,
                      description: 'Admin password (minimum 8 characters)',
                      example: 'AdminSecurePass123!'
                    },
                    confirmPassword: {
                      type: 'string',
                      description: 'Password confirmation (must match password)',
                      example: 'AdminSecurePass123!'
                    },
                    firstName: {
                      type: 'string',
                      description: 'Admin first name (optional)',
                      example: 'สมชาย'
                    },
                    lastName: {
                      type: 'string',
                      description: 'Admin last name (optional)',
                      example: 'ใจดี'
                    },
                    role: {
                      type: 'string',
                      enum: ['SUPERADMIN', 'STAFF'],
                      description: 'Admin role level',
                      example: 'STAFF'
                    }
                  }
                },
                examples: {
                  superadmin: {
                    summary: 'Super Admin Registration',
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
                    summary: 'Staff Admin Registration',
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
              description: 'Admin registered successfully',
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
                          accessToken: { type: 'string', description: 'JWT access token' },
                          refreshToken: { type: 'string', description: 'JWT refresh token' }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error or admin already exists',
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
                      summary: 'Validation Error',
                      value: {
                        success: false,
                        message: 'รูปแบบอีเมลไม่ถูกต้อง'
                      }
                    },
                    duplicate: {
                      summary: 'Admin Already Exists',
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
          const result = await adminService.login(body as AdminLoginData);
          
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
            return {
              ...result,
              data: responseData
            };
          }
          
          return result;
          
        } catch (error) {
          console.error('Admin login error:', error);
          
          set.status = 401;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบแอดมิน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Admin Authentication'],
          summary: '🔑 Admin Login',
          description: `
Authenticate an admin and receive access tokens.

**Login Process:**
1. Validate email and password
2. Check admin account status
3. Generate JWT access and refresh tokens
4. Return admin information and tokens

**Security Features:**
- Password hashing verification
- Account status validation
- JWT token generation
- Role-based access control
          `,
          requestBody: {
            description: 'Admin login credentials',
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
                      description: 'Admin email address',
                      example: 'admin@company.com'
                    },
                    password: {
                      type: 'string',
                      description: 'Admin password',
                      example: 'AdminSecurePass123!'
                    }
                  }
                },
                examples: {
                  superadmin: {
                    summary: 'Super Admin Login',
                    value: {
                      email: 'superadmin@company.com',
                      password: 'SuperAdminPass123!'
                    }
                  },
                  staff: {
                    summary: 'Staff Admin Login',
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
              description: 'Admin login successful',
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
                            description: 'JWT access token (expires in 1 hour)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          refreshToken: { 
                            type: 'string', 
                            description: 'JWT refresh token (expires in 7 days)',
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
              description: 'Authentication failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
                    }
                  },
                  examples: {
                    invalid_credentials: {
                      summary: 'Invalid Credentials',
                      value: {
                        success: false,
                        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
                      }
                    },
                    inactive_account: {
                      summary: 'Inactive Account',
                      value: {
                        success: false,
                        message: 'บัญชีแอดมินถูกระงับการใช้งาน'
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
          password: t.String()
        })
      }
    )
    
    .post(
      '/refresh',
      async ({ body, set, cookie }) => {
        try {
          // Try to get refresh token from cookie first, then from body
          let refreshToken = cookie?.refreshToken?.value;
          
          if (!refreshToken && body) {
            const { refreshToken: bodyRefreshToken } = body as { refreshToken: string };
            refreshToken = bodyRefreshToken;
          }
          
          if (!refreshToken) {
            set.status = 401;
            return {
              success: false,
              message: 'Refresh token is required'
            };
          }
          
          const result = await adminService.refreshToken(refreshToken);
          
          // Set new HTTP-only cookies for tokens
          if (result.success && result.data) {
            // Set new access token cookie (1 hour)
            cookie.accessToken.set({
              value: result.data.accessToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 60 * 60, // 1 hour in seconds
              path: '/'
            });
            
            // Set new refresh token cookie (7 days)
            cookie.refreshToken.set({
              value: result.data.refreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
              path: '/'
            });
            
            // Remove tokens from response body for security
            const { accessToken, refreshToken: newRefreshToken, ...responseData } = result.data;
            return {
              ...result,
              data: responseData
            };
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
          summary: '🔄 Refresh Admin Access Token',
          description: `
Generate a new admin access token using a valid refresh token.

**Token Refresh Process:**
1. Validate the provided refresh token
2. Check if the token is not expired
3. Verify the associated admin account is still active
4. Generate new access and refresh tokens
5. Return new tokens for continued access

**Security Notes:**
- Refresh tokens are single-use (invalidated after use)
- New refresh token is generated with each refresh
- Access tokens have shorter expiration (1 hour)
- Refresh tokens have longer expiration (7 days)
          `,
          requestBody: {
            description: 'Admin refresh token data',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: {
                      type: 'string',
                      description: 'Valid JWT admin refresh token',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                  }
                },
                examples: {
                  refresh: {
                    summary: 'Admin Token Refresh Request',
                    value: {
                      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiMTIzNDU2Nzg5MCIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Admin token refreshed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Admin token refreshed successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { 
                            type: 'string', 
                            description: 'New JWT access token (expires in 1 hour)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          refreshToken: { 
                            type: 'string', 
                            description: 'New JWT refresh token (expires in 7 days)',
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
              description: 'Invalid or expired refresh token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid refresh token' }
                    }
                  },
                  examples: {
                    invalid_token: {
                      summary: 'Invalid Token',
                      value: {
                        success: false,
                        message: 'Invalid refresh token'
                      }
                    },
                    expired_token: {
                      summary: 'Expired Token',
                      value: {
                        success: false,
                        message: 'Refresh token expired'
                      }
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
          const refreshToken = cookie?.refreshToken?.value;
          
          if (refreshToken) {
            // Revoke the refresh token in database
            await adminService.revokeRefreshToken(refreshToken);
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
          
          // Still clear cookies even if there's an error
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
          summary: '🚪 Admin Logout',
          description: `
          Logout admin and clear authentication cookies.
          
          **Logout Process:**
          1. Revoke the current refresh token
          2. Clear access and refresh token cookies
          3. Return success confirmation
          
          **Security Features:**
          - Token revocation prevents reuse
          - Cookie clearing removes local authentication
          - Graceful error handling
          `,
          responses: {
            200: {
              description: 'Admin logout successful',
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
              description: 'Server error during logout',
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