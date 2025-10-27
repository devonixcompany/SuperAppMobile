import { Elysia, t } from 'elysia';
import { ValidationService } from '../validation/validation.service';
import { UserService } from './user.service';

export const userController = (userService: UserService, validationService: ValidationService) =>
  new Elysia({ prefix: '/api/users' })
    .get(
      '/profile/:id',
      async ({ params, set }) => {
        try {
          const { id } = params;
          
          const user = await userService.findUserById(id);
          
          if (!user) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบข้อมูลผู้ใช้'
            };
          }
          
          return {
            success: true,
            data: {
              id: user.id,
              firebaseUid: user.firebaseUid,
              phoneNumber: user.phoneNumber,
              email: user.email,
              fullName: user.fullName,
              typeUser: user.typeUser,
              status: user.status,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            }
          };
          
        } catch (error) {
          console.error('Get profile error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
          };
        }
      },
      {
        detail: {
          tags: ['User Management'],
          summary: '👤 Get User Profile',
          description: `
Retrieve detailed user profile information by user ID.

**Profile Information Includes:**
- Basic user details (ID, email, full name)
- Account type (individual/corporate)
- Account status and timestamps
- Firebase UID for mobile integration

**Access Control:**
- Requires valid authentication
- Users can only access their own profile (unless admin)
          `,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'User ID to retrieve profile for',
              schema: {
                type: 'string',
                example: 'clp123abc456def789'
              }
            }
          ],
          responses: {
            200: {
              description: 'User profile retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/User' }
                    }
                  },
                  examples: {
                    individual: {
                      summary: 'Individual User Profile',
                      value: {
                        success: true,
                        data: {
                          id: 'clp123abc456def789',
                          firebaseUid: 'firebase_uid_123',
                          phoneNumber: '+66812345678',
                          email: 'somchai@gmail.com',
                          fullName: 'สมชาย ใจดี',
                          typeUser: 'individual',
                          status: 'ACTIVE',
                          createdAt: '2024-01-15T10:30:00Z',
                          updatedAt: '2024-01-15T10:30:00Z'
                        }
                      }
                    },
                    corporate: {
                      summary: 'Corporate User Profile',
                      value: {
                        success: true,
                        data: {
                          id: 'clp456def789ghi012',
                          firebaseUid: 'firebase_uid_456',
                          phoneNumber: '+66812345679',
                          email: 'admin@company.com',
                          fullName: 'บริษัท ตัวอย่าง จำกัด',
                          typeUser: 'corporate',
                          status: 'ACTIVE',
                          createdAt: '2024-01-15T11:00:00Z',
                          updatedAt: '2024-01-15T11:00:00Z'
                        }
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    not_found: {
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
          },
          security: [{ bearerAuth: [] }]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )
    
    .put(
      '/profile/:id',
      async ({ params, body, set }) => {
        try {
          const { id } = params;
          const updateData = body as any;
          
          // Validate input data
          if (updateData.email && !validationService.validateEmail(updateData.email)) {
            set.status = 400;
            return {
              success: false,
              message: 'รูปแบบอีเมลไม่ถูกต้อง'
            };
          }
          
          if (updateData.fullName && !validationService.validateFullName(updateData.fullName)) {
            set.status = 400;
            return {
              success: false,
              message: 'ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร'
            };
          }
          
          // Check if user exists
          const existingUser = await userService.findUserById(id);
          if (!existingUser) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบข้อมูลผู้ใช้'
            };
          }
          
          // Update user profile
          const updatedUser = await userService.updateUserProfile(id, {
            email: updateData.email,
            phoneNumber: updateData.phoneNumber
          });
          
          return {
            success: true,
            message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
            data: {
              id: updatedUser.id,
              firebaseUid: updatedUser.firebaseUid,
              phoneNumber: updatedUser.phoneNumber,
              email: updatedUser.email,
              fullName: updatedUser.fullName,
              typeUser: updatedUser.typeUser,
              status: updatedUser.status,
              updatedAt: updatedUser.updatedAt
            }
          };
          
        } catch (error) {
          console.error('Update profile error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้'
          };
        }
      },
      {
        detail: {
          tags: ['User Management'],
          summary: '✏️ Update User Profile',
          description: `
Update user profile information with validation.

**Updatable Fields:**
- Email address (with validation)
- Full name (2-100 characters)
- Phone number (optional)

**Validation Rules:**
- Email must be valid format
- Full name must be 2-100 characters
- Phone number must be valid format (if provided)
- Cannot update to existing email address

**Security:**
- Requires authentication
- Users can only update their own profile
          `,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'User ID to update profile for',
              schema: {
                type: 'string',
                example: 'clp123abc456def789'
              }
            }
          ],
          requestBody: {
            description: 'Profile update data',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'New email address',
                      example: 'newemail@example.com'
                    },
                    fullName: {
                      type: 'string',
                      minLength: 2,
                      maxLength: 100,
                      description: 'Updated full name',
                      example: 'สมชาย ใจดี (อัปเดต)'
                    },
                    phoneNumber: {
                      type: 'string',
                      description: 'Updated phone number',
                      example: '+66812345679'
                    }
                  }
                },
                examples: {
                  email_update: {
                    summary: 'Update Email',
                    value: {
                      email: 'newemail@gmail.com'
                    }
                  },
                  full_update: {
                    summary: 'Update All Fields',
                    value: {
                      email: 'updated@example.com',
                      fullName: 'สมชาย ใจดี (อัปเดต)',
                      phoneNumber: '+66812345679'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'อัปเดตข้อมูลสำเร็จ' },
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    invalid_email: {
                      summary: 'Invalid Email Format',
                      value: {
                        success: false,
                        message: 'รูปแบบอีเมลไม่ถูกต้อง'
                      }
                    },
                    invalid_name: {
                      summary: 'Invalid Full Name',
                      value: {
                        success: false,
                        message: 'ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร'
                      }
                    }
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
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
          },
          security: [{ bearerAuth: [] }]
        },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          email: t.Optional(t.String()),
          fullName: t.Optional(t.String()),
          phoneNumber: t.Optional(t.String())
        })
      }
    )
    
    .delete(
      '/profile/:id',
      async ({ params, set }) => {
        try {
          const { id } = params;
          
          // Check if user exists
          const existingUser = await userService.findUserById(id);
          if (!existingUser) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบข้อมูลผู้ใช้'
            };
          }
          
          // Deactivate user instead of deleting
          await userService.deactivateUser(id);
          
          return {
            success: true,
            message: 'ปิดใช้งานบัญชีผู้ใช้สำเร็จ'
          };
          
        } catch (error) {
          console.error('Deactivate user error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการปิดใช้งานบัญชีผู้ใช้'
          };
        }
      },
      {
        detail: {
          tags: ['User Management'],
          summary: '🗑️ Deactivate User Account',
          description: `
Deactivate a user account (soft delete).

**Deactivation Process:**
- Changes user status to 'INACTIVE'
- Preserves all user data for audit purposes
- User cannot login after deactivation
- Can be reversed by admin if needed

**Security:**
- Requires authentication
- Admin privileges may be required
- Irreversible action (requires admin to reactivate)

**Note:** This is a soft delete operation. User data is preserved but account becomes inactive.
          `,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'User ID to deactivate',
              schema: {
                type: 'string',
                example: 'clp123abc456def789'
              }
            }
          ],
          responses: {
            200: {
              description: 'User account deactivated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ปิดใช้งานบัญชีสำเร็จ' }
                    }
                  }
                }
              }
            },
            404: {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    not_found: {
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
          },
          security: [{ bearerAuth: [] }]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )
    
    .get(
      '/',
      async ({ query, set }) => {
        try {
          const page = parseInt(query.page as string) || 1;
          const limit = parseInt(query.limit as string) || 10;
          
          const result = await userService.getAllUsers(page, limit);
          
          return {
            success: true,
            data: result
          };
          
        } catch (error) {
          console.error('Get users error:', error);
          set.status = 500;
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
          };
        }
      },
      {
        detail: {
          tags: ['User Management'],
          summary: '📋 Get All Users',
          description: `
Retrieve a paginated list of all users in the system.

**Features:**
- Pagination support with page and limit parameters
- Returns user profiles with essential information
- Excludes sensitive data (passwords, tokens)
- Supports filtering and sorting (future enhancement)

**Query Parameters:**
- **page**: Page number (default: 1)
- **limit**: Number of users per page (default: 10, max: 100)

**Security:**
- Requires authentication
- Admin privileges recommended for full access
- Regular users may see limited information

**Response Format:**
Returns paginated user data with metadata including total count and pagination info.
          `,
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              description: 'Page number for pagination',
              schema: {
                type: 'string',
                default: '1',
                example: '1'
              }
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Number of users per page (max: 100)',
              schema: {
                type: 'string',
                default: '10',
                example: '10'
              }
            }
          ],
          responses: {
            200: {
              description: 'Users retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          users: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/User' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'number', example: 1 },
                              limit: { type: 'number', example: 10 },
                              total: { type: 'number', example: 150 },
                              totalPages: { type: 'number', example: 15 }
                            }
                          }
                        }
                      }
                    }
                  },
                  examples: {
                    success: {
                      summary: 'Successful Response',
                      value: {
                        success: true,
                        data: {
                          users: [
                            {
                              id: 'clp123abc456def789',
                              email: 'john.doe@example.com',
                              firstName: 'John',
                              lastName: 'Doe',
                              userType: 'INDIVIDUAL',
                              status: 'ACTIVE',
                              createdAt: '2024-01-15T10:30:00Z'
                            }
                          ],
                          pagination: {
                            page: 1,
                            limit: 10,
                            total: 150,
                            totalPages: 15
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid query parameters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                  examples: {
                    invalid_params: {
                      summary: 'Invalid Parameters',
                      value: {
                        success: false,
                        message: 'พารามิเตอร์ไม่ถูกต้อง'
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
          },
          security: [{ bearerAuth: [] }]
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String())
        })
      }
    );