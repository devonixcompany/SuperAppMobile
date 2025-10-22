# Admin Module

This module provides admin authentication and management functionality for the SuperApp backend system.

## Features

- 🔐 Admin registration and login
- 🎭 Role-based access control (SUPERADMIN, STAFF)
- 🔒 Secure password handling with bcrypt
- 🎫 JWT token generation and refresh
- 📊 Account status management
- 🚀 RESTful API endpoints

## Admin Roles

### SUPERADMIN
- Full system access
- Can create and manage other admin accounts
- Can access all system features
- Maximum permissions

### STAFF
- Limited administrative access
- Can perform specific assigned tasks
- Cannot manage other admin accounts
- Restricted permissions

## API Endpoints

### Registration
```
POST /api/admin/register
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STAFF"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ลงทะเบียนแอดมินสำเร็จ",
  "data": {
    "admin": {
      "id": "admin_uuid_here",
      "email": "admin@example.com",
      "role": "STAFF",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### Login
```
POST /api/admin/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "เข้าสู่ระบบแอดมินสำเร็จ",
  "data": {
    "admin": {
      "id": "admin_uuid_here",
      "email": "admin@example.com",
      "role": "STAFF",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### Refresh Token
```
POST /api/admin/refresh
```

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin token refreshed successfully",
  "data": {
    "token": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
  }
}
```

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Role Validation**: Role-based access control for different admin levels
- **Account Status**: Active/inactive account management
- **Input Validation**: Comprehensive input validation and sanitization

## Default Admin Accounts

The system comes with pre-configured admin accounts:

### Superadmin Accounts
- **Email**: superadmin1@superapp.com
- **Password**: SuperAdmin123!

- **Email**: superadmin2@superapp.com
- **Password**: SuperAdmin456!

### Staff Account
- **Email**: staff@superapp.com
- **Password**: StaffPass123!

## Usage Examples

### Register a New Admin
```bash
curl -X POST http://localhost:8080/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "NewAdminPass123!",
    "confirmPassword": "NewAdminPass123!",
    "firstName": "New",
    "lastName": "Admin",
    "role": "STAFF"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:8080/api/admin/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

## Database Schema

The admin module uses the following database schema:

```sql
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'STAFF');
```

## File Structure

```
src/admin/
├── controller/
│   └── admin.controller.ts    # API endpoints and request handling
├── routes/
│   └── admin.routes.ts        # Route definitions and validation
├── service/
│   └── admin.service.ts       # Business logic and database operations
├── seed.ts                    # Database seeding script
├── index.ts                   # Module exports
└── README.md                  # This documentation
```

## Development

### Running the Seed Script
To create the initial admin accounts:
```bash
bun run src/admin/seed.ts
```

### Adding New Admin Features
1. Update the `AdminService` class for business logic
2. Add new endpoints in `AdminController`
3. Update routes and validation as needed
4. Update the database schema if required
5. Create and run new migrations

## Security Considerations

- Always use HTTPS in production
- Change default passwords immediately
- Implement rate limiting for authentication endpoints
- Use environment variables for sensitive configuration
- Regularly update dependencies for security patches
- Implement proper logging and monitoring
- Consider implementing 2FA for additional security

## Troubleshooting

### Common Issues

1. **Migration Errors**: Ensure database is accessible and permissions are correct
2. **Token Issues**: Check JWT secret configuration and token expiration
3. **Password Problems**: Verify bcrypt hashing is working correctly
4. **Database Connection**: Ensure database URL and credentials are correct

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
DEBUG=true bun run src/app.ts