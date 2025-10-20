import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { prisma } from './lib/prisma';
import { serviceContainer } from './services';

// Get services from container
const { jwtService } = serviceContainer;

const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'SuperApp API',
        version: '1.0.0',
        description: `
# SuperApp Backend API

A comprehensive backend service for SuperApp mobile application built with Bun, Elysia, and Prisma.

## Features
- 🔐 JWT-based authentication
- 👤 User management system
- 📱 Mobile-first design
- 🏢 Support for individual and corporate users
- 🔒 Secure password handling
- 📊 Health monitoring

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Error Handling
All endpoints return consistent error responses:
\`\`\`json
{
  "success": false,
  "message": "Error description"
}
\`\`\`
        `,
        contact: {
          name: 'SuperApp Development Team',
          email: 'dev@superapp.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        },
        {
          url: 'https://api.superapp.com',
          description: 'Production server'
        }
      ],
      tags: [
        {
          name: 'Authentication',
          description: '🔐 User authentication and authorization endpoints including registration, login, and token refresh'
        },
        {
          name: 'User Management',
          description: '👤 User profile management endpoints for viewing, updating, and managing user accounts'
        },
        {
          name: 'Health',
          description: '🏥 System health check and monitoring endpoints'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication'
          }
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { 
                type: 'string', 
                description: 'Unique user identifier',
                example: 'clp123abc456def789' 
              },
              email: { 
                type: 'string', 
                format: 'email',
                description: 'User email address',
                example: 'john.doe@example.com' 
              },
              firstName: { 
                type: 'string',
                description: 'User first name',
                example: 'John' 
              },
              lastName: { 
                type: 'string',
                description: 'User last name', 
                example: 'Doe' 
              },
              userType: { 
                type: 'string', 
                enum: ['INDIVIDUAL', 'CORPORATE'],
                description: 'Type of user account',
                example: 'INDIVIDUAL' 
              },
              status: { 
                type: 'string', 
                enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
                description: 'Current user account status',
                example: 'ACTIVE' 
              },
              phoneNumber: { 
                type: 'string',
                description: 'User phone number',
                example: '+66812345678' 
              },
              dateOfBirth: { 
                type: 'string', 
                format: 'date',
                description: 'User date of birth (YYYY-MM-DD)',
                example: '1990-05-15' 
              },
              address: { 
                type: 'string',
                description: 'User address',
                example: '123 Main St, Bangkok, Thailand' 
              },
              companyName: { 
                type: 'string',
                description: 'Company name (for corporate users)',
                example: 'Tech Solutions Ltd.' 
              },
              taxId: { 
                type: 'string',
                description: 'Tax identification number (for corporate users)',
                example: '1234567890123' 
              },
              createdAt: { 
                type: 'string', 
                format: 'date-time',
                description: 'Account creation timestamp',
                example: '2024-01-15T10:30:00Z' 
              },
              updatedAt: { 
                type: 'string', 
                format: 'date-time',
                description: 'Last update timestamp',
                example: '2024-01-20T14:45:00Z' 
              }
            },
            required: ['id', 'email', 'firstName', 'lastName', 'userType', 'status']
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { 
                type: 'boolean', 
                description: 'Indicates if the operation was successful',
                example: true 
              },
              message: { 
                type: 'string',
                description: 'Success message in Thai or English',
                example: 'ดำเนินการสำเร็จ' 
              },
              data: { 
                type: 'object',
                description: 'Response data (varies by endpoint)',
                additionalProperties: true
              }
            },
            required: ['success']
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { 
                type: 'boolean', 
                description: 'Always false for error responses',
                example: false 
              },
              message: { 
                type: 'string',
                description: 'Error message in Thai or English',
                example: 'เกิดข้อผิดพลาด' 
              },
              error: { 
                type: 'string',
                description: 'Error code or type (optional)',
                example: 'VALIDATION_ERROR' 
              },
              details: { 
                type: 'object',
                description: 'Additional error details (optional)',
                additionalProperties: true
              }
            },
            required: ['success', 'message']
          },
          ValidationError: {
            type: 'object',
            properties: {
              success: { 
                type: 'boolean', 
                example: false 
              },
              message: { 
                type: 'string',
                example: 'ข้อมูลไม่ถูกต้อง' 
              },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { 
                      type: 'string',
                      description: 'Field name that failed validation',
                      example: 'email' 
                    },
                    message: { 
                      type: 'string',
                      description: 'Validation error message',
                      example: 'รูปแบบอีเมลไม่ถูกต้อง' 
                    }
                  }
                }
              }
            }
          },
          AuthTokens: {
            type: 'object',
            properties: {
              accessToken: { 
                type: 'string',
                description: 'JWT access token for API authentication',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
              },
              refreshToken: { 
                type: 'string',
                description: 'JWT refresh token for token renewal',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
              },
              expiresIn: { 
                type: 'number',
                description: 'Access token expiration time in seconds',
                example: 3600 
              }
            },
            required: ['accessToken', 'refreshToken', 'expiresIn']
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .use(serviceContainer.getAuthController())
  .use(serviceContainer.getUserController())
  .use(serviceContainer.getChargePointController())
  .derive(async ({ request, set }: { request: Request; set: any }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null
      };
    }

    const token = authHeader.substring(7);
    const payload = await jwtService.verifyToken(token);

    if (!payload) {
      return {
        user: null
      };
    }

    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phoneNumber: true,
        status: true,
        typeUser: true,
        createdAt: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return {
        user: null
      };
    }

    return {
      user
    };
  })
  .guard(
    ({ user }: any) => !!user,
    (app: any) =>
      app.get('/api/profile', ({ user }: any) => {
        return {
          success: true,
          data: {
            user
          }
        };
      })
  )
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }), {
    detail: {
      tags: ['Health'],
      summary: '🏥 Health Check',
      description: 'Returns the current status and health information of the API server',
      responses: {
        200: {
          description: 'Server is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  timestamp: { type: 'string', format: 'date-time' },
                  uptime: { type: 'number', description: 'Server uptime in seconds' },
                  version: { type: 'string', example: '1.0.0' },
                  environment: { type: 'string', example: 'development' }
                }
              }
            }
          }
        }
      }
    }
  })
  .onError(({ code, error, set }: { code: any; error: any; set: any }) => {
    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return {
          success: false,
          message: 'Invalid input data',
          errors: error.all
        };
      case 'NOT_FOUND':
        set.status = 404;
        return {
          success: false,
          message: 'Resource not found'
        };
      case 'INTERNAL_SERVER_ERROR':
        set.status = 500;
        return {
          success: false,
          message: 'Internal server error'
        };
      default:
        set.status = 500;
        return {
          success: false,
          message: 'An unexpected error occurred'
        };
    }
  });

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

app.listen(port, () => {
  console.log(`🦊 Server is running on port ${port}`);
  console.log(`📚 Swagger Documentation: http://localhost:${port}/swagger`);
  console.log(`📝 API Endpoints:`);
  console.log(`   POST /api/auth/register - User registration`);
  console.log(`   POST /api/auth/login - User login`);
  console.log(`   POST /api/auth/refresh - Refresh token`);
  console.log(`   GET /api/profile - Get user profile (protected)`);
  console.log(`   GET /health - Health check`);
});