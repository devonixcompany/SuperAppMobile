# WebSocket Gateway for OCPP Protocol

This project implements a WebSocket gateway for handling OCPP (Open Charge Point Protocol) communications between charging stations and central management systems.

## Project Structure

```
ws-gateway/
├── src/
│   ├── index.ts                  # Entry point of the gateway
│   ├── config/
│   │   └── gatewayConfig.ts      # Configuration for supported versions, port, path
│   ├── handlers/
│   │   ├── connection.ts         # WebSocket connection/handshake logic
│   │   ├── versionNegotiation.ts # Subprotocol/version negotiation
│   │   ├── cpHandler.ts          # Routing messages from CP to version modules
│   │   ├── uiHandler.ts          # UI message routing, subscription, commands
│   │   └── messageRouter.ts      # Central routing between version modules
│   ├── versionModules/           # Logic separated by OCPP version
│   │   ├── v1_6/                 # OCPP 1.6 implementation
│   │   │   ├── formatter.ts      # Request/response formatting for 1.6
│   │   │   ├── parser.ts         # Message parsing for 1.6
│   │   │   └── handler.ts        # Version-specific logic for 1.6
│   │   ├── v2_0_1/               # OCPP 2.0.1 implementation
│   │   │   ├── formatter.ts      # Request/response formatting for 2.0.1
│   │   │   ├── parser.ts         # Message parsing for 2.0.1
│   │   │   └── handler.ts        # Version-specific logic for 2.0.1
│   │   └── ... (other versions)
│   ├── store/                    # State management for cpId → connection mapping
│   ├── brokerClient/             # Client for message broker publish/subscribe
│   ├── utils/                    # Helper functions, logger, validation
│   └── middlewares/              # Authentication, certificate, module checks
├── package.json
├── tsconfig.json
└── README.md
```

## Features

- Support for multiple OCPP versions (1.6, 2.0.1)
- WebSocket connection management
- Version negotiation during handshake
- Message routing between charging points and UI
- Authentication and certificate validation
- Message broker integration
- Comprehensive logging and validation

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Configuration

Edit `src/config/gatewayConfig.ts` to configure:
- Port number
- WebSocket path
- Supported OCPP versions
- Other gateway settings

## License

MIT