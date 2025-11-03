# Charge Session Implementation Plan

This document outlines the steps required to implement the charge session flow, integrating the mobile application (SuperApp), backend service (backendBun), and WebSocket gateway (ws-gateway) with the charging station.

## 1. Initiate Charge Session from SuperApp

**File:** `/Users/admin/Documents/GitHub/SuperAppMobile/SuperApp/app/charge-session/index.tsx`

**Action:**
*   When a user initiates a charge, send a `RemoteStartTransaction` message to the WebSocket.
*   **Crucially, before sending `RemoteStartTransaction`:**
    *   Retrieve the `userId` from the device's keychain.
    *   Call the `backendBun` API to create a new `Transaction` record in the database. This API call should return a  `Id in table transaction`.
    *   Use this `Id in table transaction` as the `idTag` in the `RemoteStartTransaction` message sent to the charging station.

**Example WebSocket Message (with dynamic idTag):**
```json
{
  "type": "RemoteStartTransaction",
  "data": {
    "connectorId": 1,
    "idTag": "[TRANSACTION_ID_FROM_BACKEND]",
    "timestamp": "YYYY-MM-DDTHH:mm:ss.SSSZ"
  }
}
```

## 2. Handle Authorization from Charging Station

**File:** `/Users/admin/Documents/GitHub/SuperAppMobile/ws-gateway/src/versionModules/v1_6/handler.ts` (specifically around line 508)

**Action:**
*   When the WebSocket gateway receives an `Authorize` message from the charging station (e.g., `[2,"20","Authorize",{"idTag":"EV-USER-001"}]`), it must:
    *   Extract the `idTag` from the message.
    *   Query the `Transaction` table in the database (via `backendBun` or directly if `ws-gateway` has database access) using the `idTag` to verify the transaction.
    *   Based on the verification, send an appropriate authorization response back to the charging station.

## 3. Handle Status Notifications and Initiate Stop Charge

**Action:**
*   When the charging station sends a `StatusNotification` message indicating the charge is complete (e.g., `{"connectorId":1,"errorCode":"NoError","status":"SuspendedEV"}`), the system should:
    *   Initiate a `RemoteStopTransaction` command to the charging station. This command should be sent from the `SuperApp` via the WebSocket.

## 4. Initiate Stop Charge from SuperApp

**File:** `/Users/admin/Documents/GitHub/SuperAppMobile/SuperApp/app/charge-session/index.tsx`

**Action:**
*   When a user or the system (e.g., in response to a `StatusNotification`) initiates a stop charge, send a `RemoteStopTransaction` message to the WebSocket.

**Example WebSocket Message (RemoteStopTransaction):**
```json
{
  "type": "RemoteStopTransaction",
  "data": {
    "connectorId": 1,
    "transactionId": 473792, // This should be the transactionId obtained during RemoteStartTransaction
    "timestamp": "YYYY-MM-DDTHH:mm:ss.SSSZ"
  }
}
```

## 5. Process StopTransaction Data

**Action:**
*   Upon receiving a `StopTransaction` message from the charging station, which includes meter readings and timestamps (e.g., `meterStop`, `timestamp`, `transactionData`):
    *   Extract the relevant data: `idTag`, `meterStop`, `timestamp`, `reason`, `Id in table transaction`, and `transactionData` (including `sampledValue` for energy consumption).
    *   Store this information in the database, updating the corresponding `Transaction` record.

**Example StopTransaction Data:**
```json
{
  "method": "StopTransaction",
  "params": {
    "idTag": "FF88888801",
    "meterStop": 12563,
    "timestamp": "2025-10-29T09:02:44.206Z",
    "reason": "EVDisconnected",
    "transactionId": 528106,
    "transactionData": [
      {
        "timestamp": "2025-10-29T08:52:11.706Z",
        "sampledValue": [
          {
            "value": "0",
            "context": "Transaction.Begin",
            "format": "Raw",
            "measurand": "Energy.Active.Import.Register",
            "location": "Outlet",
            "unit": "kWh"
          }
        ]
      },
      {
        "timestamp": "2025-10-29T09:02:44.206Z",
        "sampledValue": [
          {
            "value": "12.562500000000007",
            "context": "Transaction.End",
            "format": "Raw",
            "measurand": "Energy.Active.Import.Register",
            "location": "Outlet",
            "unit": "kWh"
          },
          {
            "value": "100",
            "context": "Transaction.End",
            "location": "EV",
            "unit": "Percent",
            "measurand": "SoC"
          }
        ]
      }
    ]
  }
}