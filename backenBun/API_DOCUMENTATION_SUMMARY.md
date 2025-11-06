# API Documentation Summary
# สรุปเอกสาร API

**Project:** SuperApp Backend - CSMS  
**Version:** 1.0.0  
**Base URL:** `http://localhost:8080` (Development)  
**OpenAPI Spec:** `/openapi/json`  
**Swagger UI:** `/openapi`

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints by Module](#api-endpoints-by-module)
4. [Common Response Patterns](#common-response-patterns)
5. [Error Codes](#error-codes)
6. [Rate Limits](#rate-limits)
7. [Webhooks](#webhooks)

---

## Overview

SuperApp Backend provides a comprehensive REST API for managing electric vehicle charging stations, transactions, payments, and user accounts. The API follows RESTful principles and uses JSON for request/response payloads.

### Key Features
- ✅ **Full OpenAPI 3.0 Documentation** - All 49 endpoints documented
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **OCPP Protocol Support** - OCPP 1.6, 2.0, 2.1
- ✅ **Payment Integration** - Omise payment gateway
- ✅ **Real-time Updates** - WebSocket support
- ✅ **Admin Panel API** - Separate admin endpoints

---

## Authentication

### Authentication Methods

#### 1. User Authentication (JWT Bearer Token)
```http
Authorization: Bearer <access_token>
```

**How to get tokens:**
1. Register: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Use returned `accessToken` in Authorization header

**Token Expiry:**
- Access Token: 15 minutes
- Refresh Token: 7 days

**Refresh Token:**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 2. Admin Authentication (JWT Bearer Token)
```http
Authorization: Bearer <admin_access_token>
```

**Admin Endpoints:**
- Register: `POST /api/admin/auth/register`
- Login: `POST /api/admin/auth/login`

**Admin Roles:**
- `SUPERADMIN` - Full system access
- `STAFF` - Limited administrative access

#### 3. Gateway API Key (Internal Services)
```http
X-API-Key: <gateway-api-key>
```

Used by WebSocket Gateway for internal communication.

#### 4. Public Endpoints (No Auth Required)
- `GET /health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /openapi/*` - API documentation

---

## API Endpoints by Module

### 1. Authentication & User Management

#### User Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user account | - |
| POST | `/api/auth/login` | Login user | - |
| POST | `/api/auth/refresh` | Refresh access token | - |
| GET | `/api/profile` | Get user profile | 🔐 User |

#### Admin Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/auth/register` | Register admin account | 🔐 Admin |
| POST | `/api/admin/auth/login` | Admin login | - |
| POST | `/api/admin/auth/logout` | Admin logout | 🔐 Admin |
| POST | `/api/admin/auth/refresh` | Refresh admin token | - |

#### User Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/` | List all users | 🔐 User |
| GET | `/api/users/profile/{id}` | Get user by ID | 🔐 User |

---

### 2. Charge Point Management (17 endpoints)

#### Public Charge Point Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chargepoints/` | List charge points with filters | 🔐 User |
| GET | `/api/chargepoints/{chargePointIdentity}` | Get charge point details | 🔐 User |
| GET | `/api/chargepoints/nearby/{lat}/{lng}` | Find nearby charge points | 🔐 User |
| GET | `/api/chargepoints/list` | Legacy: List all charge points | 🔐 User |
| GET | `/api/chargepoints/detail/{id}` | Legacy: Get charge point | 🔐 User |

**Query Parameters for List:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `status` - Filter by status (AVAILABLE, OCCUPIED, UNAVAILABLE, FAULTED, MAINTENANCE)
- `protocol` - Filter by OCPP version (OCPP16, OCPP20, OCPP21)
- `ownerId` - Filter by owner ID
- `isPublic` - Filter by public/private (true/false)

**Example:**
```http
GET /api/chargepoints/?page=1&limit=10&status=AVAILABLE&protocol=OCPP16
```

#### Charge Point Operations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/api/chargepoints/{chargePointIdentity}` | Update charge point | 🔐 User |
| PUT | `/api/chargepoints/{chargePointIdentity}/pricing` | Update pricing schedule | 🔐 User |
| DELETE | `/api/chargepoints/{chargePointIdentity}` | Delete charge point | 🔐 User |
| GET | `/api/chargepoints/{cpId}/{connectorId}/websocket-url` | Get WebSocket URL | 🔐 User |

#### OCPP Protocol Endpoints (Gateway)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/api/chargepoints/{cpId}/connection-status` | Update connection status | 🔑 Gateway |
| POST | `/api/chargepoints/{cpId}/heartbeat` | Process heartbeat | 🔑 Gateway |
| POST | `/api/chargepoints/{cpId}/status` | Update connector status | 🔑 Gateway |
| POST | `/api/chargepoints/{cpId}/update-from-boot` | Update from boot notification | 🔑 Gateway |
| POST | `/api/chargepoints/validate-whitelist` | Validate whitelist | 🔑 Gateway |
| POST | `/api/chargepoints/{cpId}/validate-ocpp` | Validate OCPP connection | 🔑 Gateway |
| GET | `/api/chargepoints/ws-gateway/chargepoints` | Get all for gateway | 🔑 Gateway |

#### Connector Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chargepoints/check-connectors/{cpId}` | Check connector data | 🔑 Gateway |
| POST | `/api/chargepoints/create-connectors` | Create connectors | 🔑 Gateway |

---

### 3. Transaction Management (7 endpoints)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/transactions/` | Create new transaction | 🔐 User |
| GET | `/api/transactions/user/{userId}` | Get user transactions | 🔐 User |
| GET | `/api/transactions/{transactionId}/summary` | Get transaction summary | 🔐 User |
| POST | `/api/transactions/{transactionId}/payment` | Process payment for transaction | 🔐 User |

#### OCPP Transaction Endpoints (Gateway)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/transactions/authorize` | Authorize transaction | 🔑 Gateway |
| POST | `/api/transactions/{transactionId}/start` | Record transaction start | 🔑 Gateway |
| POST | `/api/transactions/ocpp/{ocppTxnId}/stop` | Record transaction stop | 🔑 Gateway |

**Transaction Flow:**
```
1. Create Transaction (Client) → Returns transactionId
2. Authorize (Gateway) → Validates idTag
3. Start Transaction (Gateway) → Records OCPP transaction start
4. Charging happens...
5. Stop Transaction (Gateway) → Records completion
6. Process Payment (Client) → User pays for energy consumed
```

---

### 4. Payment Management (7 endpoints) ⭐

#### Payment Cards
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/cards` | Add payment card | 🔐 User |
| GET | `/api/payment/cards` | Get user's cards | 🔐 User |
| DELETE | `/api/payment/cards/{cardId}` | Remove payment card | 🔐 User |
| PUT | `/api/payment/cards/{cardId}/default` | Set default card | 🔐 User |

**Add Card Example:**
```http
POST /api/payment/cards
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "tokn_test_5xj6h36c0j1p2kxqskt",
  "setDefault": true
}
```

#### Payment Processing
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/process` | Process payment | 🔐 User |
| GET | `/api/payment/history` | Get payment history | 🔐 User |
| GET | `/api/payment/3ds/return` | Handle 3D Secure return | - |

**Process Payment Example:**
```http
POST /api/payment/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "txn_uuid_123",
  "cardId": "card_uuid_456"  // Optional, uses default if not provided
}
```

**Payment History Example:**
```http
GET /api/payment/history?page=1&limit=10
Authorization: Bearer <token>
```

---

### 5. Webhooks (1 endpoint) ⭐

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/omise/webhook` | Omise payment webhook | Signature |

**Supported Events:**
- `charge.complete` - Payment completed
- `charge.create` - Charge created
- `charge.update` - Charge status updated
- `charge.capture` - Authorized charge captured
- `refund.create` - Refund processed

**Webhook Security:**
- Validates `x-omise-signature` header
- Uses HMAC-SHA256 signature verification
- Requires `OMISE_WEBHOOK_SECRET` environment variable

---

### 6. Tax Invoice Profile (4 endpoints)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/sstaxinvoiceprofile/` | Create tax invoice profile | 🔐 User |
| GET | `/api/sstaxinvoiceprofile/user/{userId}` | Get user profiles | 🔐 User |
| PUT | `/api/sstaxinvoiceprofile/{id}` | Update profile | 🔐 User |
| PUT | `/api/sstaxinvoiceprofile/{id}/set-default` | Set default profile | 🔐 User |

**Tax Invoice Profile Types:**
- `INDIVIDUAL` - Individual taxpayer
- `CORPORATE` - Corporate taxpayer

**Branch Types:**
- `HEAD_OFFICE` - สำนักงานใหญ่
- `BRANCH` - สาขา

---

### 7. Admin Management (4 endpoints)

#### Admin Charge Point Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/chargepoints/` | Create charge point | 🔐 Admin |
| GET | `/api/admin/chargepoints/{cpId}/connectors` | Get connectors | 🔐 Admin |

#### Admin Station Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/stations/` | Create station | 🔐 Admin |

#### Admin Connector Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/connectors/` | Create connector | 🔐 Admin |

---

### 8. Health Check (1 endpoint)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | - |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-06T17:53:47.575Z",
  "uptime": 1234.56,
  "version": "1.0.0",
  "environment": "development"
}
```

---

## Common Response Patterns

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description in Thai/English",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Status | Description | Example |
|--------|-------------|---------|
| 200 | Success | Operation completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### Common Error Messages

#### Authentication Errors
```json
{
  "success": false,
  "message": "Unauthorized: missing or invalid user token"
}
```

#### Validation Errors
```json
{
  "success": false,
  "message": "Invalid input data",
  "errors": [
    {
      "field": "email",
      "message": "รูปแบบอีเมลไม่ถูกต้อง"
    }
  ]
}
```

#### Not Found Errors
```json
{
  "success": false,
  "message": "ไม่พบเครื่องชาร์จที่ระบุ"
}
```

---

## Rate Limits

### Current Implementation
⚠️ **Note:** Rate limiting is not yet implemented. This is a **critical missing feature** for production.

### Recommended Rate Limits for Production

#### Public Endpoints
- Authentication: 5 requests/minute per IP
- Registration: 3 requests/hour per IP

#### Authenticated Endpoints
- Standard: 100 requests/15 minutes per user
- List endpoints: 50 requests/15 minutes per user
- Payment: 10 requests/15 minutes per user

#### Admin Endpoints
- Standard: 500 requests/15 minutes per admin
- Bulk operations: 50 requests/15 minutes per admin

#### Gateway Endpoints
- Heartbeat: No limit
- Status updates: 1000 requests/minute per gateway
- Other: 500 requests/minute per gateway

**Rate Limit Headers (Recommended):**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699276800
```

---

## Webhooks

### Omise Payment Webhook

**Endpoint:** `POST /api/payment/omise/webhook`

**Security:**
- Validates `x-omise-signature` header
- HMAC-SHA256 signature

**Configuration:**
1. Set `OMISE_WEBHOOK_SECRET` environment variable
2. Configure webhook URL in Omise Dashboard
3. Select events to receive

**Supported Events:**

#### 1. charge.complete
Fired when a charge completes (success or failure)
```json
{
  "key": "charge.complete",
  "data": {
    "id": "chrg_test_5xj6h36c0j1p2kxqskt",
    "status": "successful",
    "paid": true,
    "amount": 150050,
    "currency": "thb"
  }
}
```

#### 2. charge.create
Fired when a new charge is created
```json
{
  "key": "charge.create",
  "data": {
    "id": "chrg_test_5xj6h36c0j1p2kxqskt",
    "status": "pending",
    "authorize_uri": "https://..."
  }
}
```

#### 3. refund.create
Fired when a refund is processed
```json
{
  "key": "refund.create",
  "data": {
    "id": "rfnd_test_5xj6h36c0j1p2kxqskt",
    "charge": "chrg_test_5xj6h36c0j1p2kxqskt",
    "amount": 150050
  }
}
```

**Webhook Retry Policy:**
- Omise will retry failed webhooks
- Exponential backoff
- Up to 10 retry attempts

---

## API Testing

### Using Swagger UI

Access the interactive API documentation at:
```
http://localhost:8080/openapi
```

Features:
- Try out all endpoints
- View request/response examples
- See authentication requirements
- Test different scenarios

### Using curl

#### 1. User Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0812345678",
    "password": "SecurePass123!"
  }'
```

#### 2. Get Charge Points (with auth)
```bash
curl -X GET "http://localhost:8080/api/chargepoints/?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Create Transaction
```bash
curl -X POST http://localhost:8080/api/transactions/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chargePointIdentity": "CP-001",
    "connectorId": 1,
    "vehicleId": "vehicle_123"
  }'
```

---

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key
```

### Optional (with defaults)
```env
PORT=8080
BASE_URL=http://localhost:8080
NODE_ENV=development
```

### Payment (Omise)
```env
OMISE_PUBLIC_KEY=pkey_test_...
OMISE_SECRET_KEY=skey_test_...
OMISE_WEBHOOK_SECRET=whsec_...
```

### Gateway
```env
WS_GATEWAY_API_KEY=your-gateway-api-key
```

### Frontend
```env
FRONTEND_URL=http://localhost:3000
```

---

## SDK & Client Libraries

### Official Libraries
- JavaScript/TypeScript: Use `fetch` or `axios`
- Mobile: React Native with `@react-native-community/fetch`

### Code Generation
Generate client SDK from OpenAPI spec:
```bash
# Download OpenAPI spec
curl http://localhost:8080/openapi/json > openapi.json

# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./generated-client
```

---

## Support & Resources

### Documentation
- **OpenAPI Spec:** `http://localhost:8080/openapi/json`
- **Swagger UI:** `http://localhost:8080/openapi`
- **Production Readiness:** See `PRODUCTION_READINESS_ANALYSIS.md`

### Contact
- **GitHub Issues:** [Report bugs or request features]
- **API Status:** Check `/health` endpoint

---

**Last Updated:** November 6, 2025  
**API Version:** 1.0.0  
**Documentation Coverage:** 100% (49/49 endpoints)
