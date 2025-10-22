# OCPP + CSMS Microservices Architecture

## 🔌 Services Overview

### OCPP-Specific Services:

1. **OCPP Gateway Service** (Port 4000) - WebSocket Gateway for Charge Points
2. **Charge Point Service** (Port 4001) - Charge Point management
3. **Transaction Service** (Port 4002) - Charging transaction management
4. **Charging Station Service** (Port 4003) - Station configuration and monitoring
5. **OCPP Protocol Service** (Port 4004) - Protocol version adapters

### Integration with Existing Services:

- **User Service** - EV driver profiles
- **Order Service** - Billing and payments
- **Auth Service** - Driver/Station authentication
- **Product Service** - Charging plans and tariffs

## 🏗️ Architecture Flow

```
Charge Point (OCPP)
        ↓
   OCPP Gateway (WebSocket)
        ↓
   Protocol Adapter (1.6/2.0.1/2.1)
        ↓
   Business Logic Services
        ↓
   Database & Infrastructure
```

## 📡 Communication Patterns

- **WebSocket**: Real-time communication with Charge Points
- **REST API**: Management and monitoring interfaces
- **Event-driven**: Transaction events and notifications
- **Service Discovery**: Consul integration