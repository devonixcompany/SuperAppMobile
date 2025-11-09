import { Elysia, t } from 'elysia';
import { ValidationError } from '../../lib/validation';
import { AuthService } from './auth.service';

export const authController = (authService: AuthService) =>
  new Elysia({ prefix: '/api/auth' })
    .post(
      '/register',
      async ({ body, set }) => {
        try {
          const result = await authService.register(body as any);
          set.status = 201;
          return result;
          
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
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: '🔐 User Registration',
          description: `
Register a new user account in the SuperApp system.

**Supported User Types:**
- **Individual**: Personal user account
- **Corporate**: Business/company account

**Password Requirements:**
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter  
- Must contain at least one number
- Must contain at least one special character

**Email Validation:**
- Must be a valid email format
- Corporate users may require specific domain validation
          `,
          requestBody: {
            description: 'User registration data',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userType', 'fullName', 'email', 'phoneNumber', 'password', 'confirmPassword', 'firebaseUid'],
                  properties: {
                    firebaseUid: {
                      type: 'string',
                      description: 'Firebase Authentication UID',
                      example: 'abc123xyz456firebase'
                    },
                    phoneNumber: {
                      type: 'string',
                      description: 'User phone number in E.164 or local format',
                      example: '+66812345678'
                    },
                    userType: {
                      type: 'string',
                      enum: ['individual', 'corporate'],
                      description: 'Type of user account',
                      example: 'individual'
                    },
                    fullName: {
                      type: 'string',
                      minLength: 2,
                      maxLength: 100,
                      description: 'User full name',
                      example: 'สมชาย ใจดี'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email address',
                      example: 'somchai@example.com'
                    },
                    password: {
                      type: 'string',
                      minLength: 8,
                      description: 'User password (must meet security requirements)',
                      example: 'SecurePass123!'
                    },
                    confirmPassword: {
                      type: 'string',
                      description: 'Password confirmation (must match password)',
                      example: 'SecurePass123!'
                    }
                  }
                },
                examples: {
                  individual: {
                    summary: 'Individual User Registration',
                      value: {
                        firebaseUid: 'abc123xyz456firebase',
                        phoneNumber: '+66812345678',
                        userType: 'individual',
                        fullName: 'สมชาย ใจดี',
                        email: 'somchai@gmail.com',
                        password: 'SecurePass123!',
                        confirmPassword: 'SecurePass123!'
                    }
                  },
                  corporate: {
                    summary: 'Corporate User Registration',
                      value: {
                        firebaseUid: 'def789uvw012firebase',
                        phoneNumber: '+66898765432',
                        userType: 'corporate',
                        fullName: 'บริษัท ตัวอย่าง จำกัด',
                        email: 'admin@company.com',
                        password: 'CorporatePass456!',
                        confirmPassword: 'CorporatePass456!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ลงทะเบียนสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
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
              description: 'Validation error or user already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    validation: {
                      summary: 'Validation Error',
                      value: {
                        success: false,
                        message: 'รูปแบบอีเมลไม่ถูกต้อง'
                      }
                    },
                    duplicate: {
                      summary: 'User Already Exists',
                      value: {
                        success: false,
                        message: 'อีเมลนี้ถูกใช้งานแล้ว'
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        },
        body: t.Object({
          firebaseUid: t.String(),
          phoneNumber: t.String(),
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
          const result = await authService.login(body as any);
          return result;
          
        } catch (error) {
          console.error('Login error:', error);
          
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              message: error.message
            };
          }
          
          set.status = 401;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: '🔑 User Login',
          description: `
Authenticate a user and receive access tokens.

**Login Process:**
1. Validate email and password
2. Check user account status
3. Generate JWT access and refresh tokens
4. Return user information and tokens

**Security Features:**
- Password hashing verification
- Account status validation
- JWT token generation
- Secure session management
          `,
          requestBody: {
            description: 'User login credentials',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: {
                    phoneNumber: {
                      type: 'string',
                      description: 'User phone number (Thai format)',
                      example: '0812345678'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email address',
                      example: 'somchai@example.com'
                    },
                    password: {
                      type: 'string',
                      description: 'User password',
                      example: 'SecurePass123!'
                    }
                  },
                  oneOf: [
                    {
                      required: ['phoneNumber', 'password'],
                      properties: {
                        phoneNumber: { type: 'string' },
                        password: { type: 'string' }
                      }
                    },
                    {
                      required: ['email', 'password'],
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  ]
                },
                examples: {
                  individual: {
                    summary: 'Individual User Login with Phone',
                    value: {
                      phoneNumber: '0812345678',
                      password: 'SecurePass123!'
                    }
                  },
                  individual_email: {
                    summary: 'Individual User Login with Email',
                    value: {
                      email: 'somchai@gmail.com',
                      password: 'SecurePass123!'
                    }
                  },
                  corporate: {
                    summary: 'Corporate User Login with Email',
                    value: {
                      email: 'admin@company.com',
                      password: 'CorporatePass456!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'เข้าสู่ระบบสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          accessToken: { 
                            type: 'string', 
                            description: 'JWT access token (expires in 15 minutes)',
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
            400: {
              description: 'Invalid input data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    validation: {
                      summary: 'Validation Error',
                      value: {
                        success: false,
                        message: 'รูปแบบอีเมลไม่ถูกต้อง'
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
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
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
                        message: 'บัญชีผู้ใช้ถูกระงับ'
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        },
        body: t.Object({
          phoneNumber: t.Optional(t.String()),
          password: t.String()
        })
      }
    )
    
    .post(
      '/refresh',
      async ({ body, set }) => {
        try {
          const { refreshToken } = body as { refreshToken: string };
          const result = await authService.refreshToken(refreshToken);
          return result;
          
        } catch (error) {
          console.error('Refresh token error:', error);
          set.status = 401;
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to refresh token'
          };
        }
      },
      {
        detail: {
          tags: ['Authentication'],
          summary: '🔄 Refresh Access Token',
          description: `
Generate a new access token using a valid refresh token.

**Token Refresh Process:**
1. Validate the provided refresh token
2. Check if the token is not expired
3. Verify the associated user account is still active
4. Generate new access and refresh tokens
5. Update the refresh token in the database

**Security Notes:**
- Refresh tokens are single-use (invalidated after use)
- New refresh token is generated with each refresh
- Access tokens have shorter expiration (15 minutes)
- Refresh tokens have longer expiration (7 days)
          `,
          requestBody: {
            description: 'Refresh token data',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: {
                      type: 'string',
                      description: 'Valid JWT refresh token',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                  }
                },
                examples: {
                  refresh: {
                    summary: 'Token Refresh Request',
                    value: {
                      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'รีเฟรชโทเค็นสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { 
                            type: 'string', 
                            description: 'New JWT access token (expires in 15 minutes)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          refreshToken: { 
                            type: 'string', 
                            description: 'New JWT refresh token (expires in 7 days)',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          },
                          user: { $ref: '#/components/schemas/User' }
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
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    invalid_token: {
                      summary: 'Invalid Token',
                      value: {
                        success: false,
                        message: 'รีเฟรชโทเค็นไม่ถูกต้อง'
                      }
                    },
                    expired_token: {
                      summary: 'Expired Token',
                      value: {
                        success: false,
                        message: 'รีเฟรชโทเค็นหมดอายุแล้ว'
                      }
                    },
                    user_not_found: {
                      summary: 'User Not Found',
                      value: {
                        success: false,
                        message: 'ไม่พบข้อมูลผู้ใช้'
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        },
        body: t.Object({
          refreshToken: t.String()
        })
      }
    );
