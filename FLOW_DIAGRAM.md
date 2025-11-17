# Flow Diagrams - SuperApp Charging System

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph "Mobile App - SuperApp"
        QR[QR Scanner Screen]
        CS[Charge Session Screen]
        SUM[Summary Screen]
        API_CLIENT[API Services]
    end
    
    subgraph "WebSocket Gateway"
        UWS[User WebSocket Server]
        OWS[OCPP WebSocket Server]
        GSM[Gateway Session Manager]
        UCM[User Connection Manager]
    end
    
    subgraph "Backend API"
        REST[REST API Endpoints]
        DB[(PostgreSQL Database)]
    end
    
    subgraph "Charging Stations"
        CP1[Charge Point 1]
        CP2[Charge Point 2]
        CPN[Charge Point N]
    end
    
    QR -->|1. Scan QR| API_CLIENT
    API_CLIENT -->|2. REST: Get WebSocket URL| REST
    REST -->|3. Query/Store| DB
    REST -->|4. Return WS URL + Data| API_CLIENT
    API_CLIENT -->|5. Navigate with params| CS
    CS -->|6. WebSocket Connect| UWS
    UWS -.->|Manage| UCM
    UWS <-->|7. Relay Messages| GSM
    GSM <-->|8. Relay Messages| OWS
    OWS <-->|9. OCPP Protocol| CP1
    OWS <-->|OCPP Protocol| CP2
    OWS <-->|OCPP Protocol| CPN
    CS -->|10. REST: Create/Get Transaction| REST
    CS -->|11. Navigate with data| SUM
    
    style QR fill:#e1f5ff
    style CS fill:#e1f5ff
    style SUM fill:#e1f5ff
    style UWS fill:#fff3cd
    style OWS fill:#fff3cd
    style REST fill:#d4edda
    style CP1 fill:#f8d7da
    style CP2 fill:#f8d7da
    style CPN fill:#f8d7da
```

---

## 2. Complete Charging Flow (Start to Finish)

```mermaid
sequenceDiagram
    participant User
    participant QRScanner as QR Scanner Screen
    participant ChargeSession as Charge Session Screen
    participant APIClient as API Services
    participant Backend as Backend API
    participant WSGateway as WebSocket Gateway
    participant ChargePoint as Charge Point (OCPP)
    
    Note over User,ChargePoint: Phase 1: Scan QR Code
    User->>QRScanner: Scan QR Code on Charger
    QRScanner->>QRScanner: Parse QR Data<br/>(chargePointIdentity, connectorId)
    QRScanner->>APIClient: Get User Credentials
    
    Note over User,ChargePoint: Phase 2: Get WebSocket URL
    QRScanner->>APIClient: getWebSocketUrl(cpId, connectorId, userId)
    APIClient->>Backend: GET /api/chargepoints/{cpId}/{conn}/websocket-url
    Backend->>Backend: Check User Payment Cards
    alt No Payment Card
        Backend-->>APIClient: 402 NO_PAYMENT_CARDS
        APIClient-->>QRScanner: Payment Required Error
        QRScanner->>User: Alert: Add Payment Card
    else Has Payment Card
        Backend->>Backend: Generate WebSocket URL
        Backend-->>APIClient: Return WS URL + Charge Point Info
        APIClient-->>QRScanner: Success
        QRScanner->>ChargeSession: Navigate with params
    end
    
    Note over User,ChargePoint: Phase 3: Connect WebSocket
    ChargeSession->>WSGateway: WebSocket Connect<br/>ws://gateway/user-cp/{cpId}/{conn}/{userId}
    WSGateway->>WSGateway: Verify Charge Point Online
    WSGateway->>ChargeSession: Connected + Initial Status
    ChargeSession->>User: Display: Ready to Charge
    
    Note over User,ChargePoint: Phase 4: Start Charging
    User->>ChargeSession: Press "Start Charging"
    ChargeSession->>APIClient: createTransaction(cpId, conn, userId)
    APIClient->>Backend: POST /api/v1/user/transactions
    Backend->>Backend: Create Transaction Record
    Backend-->>APIClient: Return Transaction ID
    APIClient-->>ChargeSession: transactionId
    
    ChargeSession->>WSGateway: WS: RemoteStartTransaction<br/>{idTag: transactionId}
    WSGateway->>ChargePoint: OCPP: RemoteStartTransaction
    ChargePoint-->>WSGateway: OCPP: Accepted
    WSGateway-->>ChargeSession: WS: RemoteStartTransactionResponse
    
    ChargePoint->>WSGateway: OCPP: StartTransaction<br/>{transactionId: 42, meterStart}
    WSGateway->>Backend: Store Transaction Data
    WSGateway->>ChargeSession: WS: StartTransaction
    ChargeSession->>ChargeSession: Update UI: Charging Started
    
    Note over User,ChargePoint: Phase 5: Real-time Updates
    loop Every 30 seconds or on change
        ChargePoint->>WSGateway: OCPP: MeterValues<br/>{energy, power, voltage, SoC}
        WSGateway->>WSGateway: Process Meter Values
        WSGateway->>ChargeSession: WS: charging_data
        ChargeSession->>ChargeSession: Update UI<br/>(energy, power, cost)
        ChargeSession->>User: Display Real-time Data
    end
    
    loop Every 30 seconds
        ChargePoint->>WSGateway: OCPP: Heartbeat
        WSGateway->>ChargeSession: WS: heartbeat
    end
    
    Note over User,ChargePoint: Phase 6: Stop Charging
    User->>ChargeSession: Press "Stop Charging"
    ChargeSession->>WSGateway: WS: RemoteStopTransaction<br/>{transactionId: 42}
    WSGateway->>ChargePoint: OCPP: RemoteStopTransaction
    ChargePoint-->>WSGateway: OCPP: Accepted
    
    ChargePoint->>ChargePoint: Stop Charging Process
    ChargePoint->>WSGateway: OCPP: StopTransaction<br/>{meterStop, reason}
    WSGateway->>Backend: Update Transaction
    WSGateway->>ChargeSession: WS: StopTransaction
    
    ChargePoint->>WSGateway: OCPP: StatusNotification<br/>{status: Finishing}
    WSGateway->>ChargeSession: WS: connectorStatus
    
    Note over User,ChargePoint: Phase 7: Get Summary
    ChargeSession->>APIClient: getTransactionSummary(transactionId)
    APIClient->>Backend: GET /api/v1/user/transactions/{id}/summary
    Backend->>Backend: Calculate Total Energy & Cost
    Backend-->>APIClient: Return Summary Data
    APIClient-->>ChargeSession: Summary
    ChargeSession->>ChargeSession: Navigate to Summary Screen
    ChargeSession->>User: Display Final Summary
```

---

## 3. WebSocket Connection Flow (User → Gateway → Charge Point)

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant UWS as User WebSocket Server
    participant GSM as Gateway Session Manager
    participant OWS as OCPP WebSocket Server
    participant CP as Charge Point
    
    Note over App,CP: Initial Connection
    App->>UWS: Connect to /user-cp/{cpId}/{conn}/{userId}
    UWS->>UWS: Parse URL Parameters
    UWS->>GSM: Check if Charge Point Online
    
    alt Charge Point Online
        GSM-->>UWS: Charge Point Found
        UWS->>UWS: Add to UserConnectionManager
        UWS->>App: Send Initial Status
    else Charge Point Offline
        UWS->>App: Error: CHARGE_POINT_OFFLINE
        UWS->>App: Close Connection
    end
    
    Note over App,CP: Message Flow - Start Charging
    App->>UWS: RemoteStartTransaction
    UWS->>UWS: Validate Message
    UWS->>GSM: Get Charge Point
    GSM->>OWS: Forward to OCPP WS
    OWS->>CP: [2, msgId, "RemoteStartTransaction", {...}]
    CP-->>OWS: [3, msgId, {"status": "Accepted"}]
    OWS->>GSM: OCPP Response
    GSM->>UWS: Response Data
    UWS->>App: RemoteStartTransactionResponse
    
    Note over App,CP: OCPP Notifications
    CP->>OWS: [2, msgId, "StartTransaction", {...}]
    OWS->>GSM: Process StartTransaction
    GSM->>UWS: Find User Connections
    UWS->>App: StartTransaction Event
    
    Note over App,CP: Real-time Updates
    loop Periodic Updates
        CP->>OWS: [2, msgId, "MeterValues", {...}]
        OWS->>GSM: Process MeterValues
        GSM->>GSM: Update Connector Metrics
        GSM->>UWS: Find User Connections
        UWS->>App: charging_data Event
    end
    
    Note over App,CP: Stop Charging
    App->>UWS: RemoteStopTransaction
    UWS->>GSM: Forward Request
    GSM->>OWS: To OCPP WS
    OWS->>CP: [2, msgId, "RemoteStopTransaction", {...}]
    CP->>OWS: [2, msgId, "StopTransaction", {...}]
    OWS->>GSM: Process StopTransaction
    GSM->>UWS: Stop Event
    UWS->>App: StopTransaction Event
```

---

## 4. OCPP Message Processing Flow

```mermaid
flowchart TD
    Start([Charge Point sends OCPP Message]) --> Parse[Parse OCPP Array]
    Parse --> CheckType{Message Type?}
    
    CheckType -->|Type 2: CALL| ProcessCall[Process CALL Message]
    CheckType -->|Type 3: CALLRESULT| ProcessResult[Process CALLRESULT]
    CheckType -->|Type 4: CALLERROR| ProcessError[Process CALLERROR]
    
    ProcessCall --> CheckAction{Action Type?}
    
    CheckAction -->|StartTransaction| HandleStart[Handle StartTransaction]
    CheckAction -->|StopTransaction| HandleStop[Handle StopTransaction]
    CheckAction -->|MeterValues| HandleMeter[Handle MeterValues]
    CheckAction -->|StatusNotification| HandleStatus[Handle StatusNotification]
    CheckAction -->|Heartbeat| HandleHeart[Handle Heartbeat]
    CheckAction -->|BootNotification| HandleBoot[Handle BootNotification]
    CheckAction -->|Other Actions| HandleOther[Handle Other Actions]
    
    HandleStart --> UpdateSession[Update Gateway Session]
    HandleStop --> UpdateSession
    HandleMeter --> UpdateMetrics[Update Connector Metrics]
    HandleStatus --> UpdateConnStatus[Update Connector Status]
    HandleHeart --> UpdateLastSeen[Update Last Seen Time]
    HandleBoot --> AuthChargePoint[Authenticate Charge Point]
    
    UpdateSession --> NotifyUsers[Notify Connected Users]
    UpdateMetrics --> NotifyUsers
    UpdateConnStatus --> NotifyUsers
    UpdateLastSeen --> NotifyUsers
    AuthChargePoint --> NotifyUsers
    HandleOther --> NotifyUsers
    
    NotifyUsers --> FormatMessage[Format User-Friendly Message]
    FormatMessage --> SendWebSocket[Send via User WebSocket]
    SendWebSocket --> End([Message Delivered])
    
    ProcessResult --> MatchRequest[Match with Pending Request]
    MatchRequest --> HandleResponse[Handle Response]
    HandleResponse --> End
    
    ProcessError --> LogError[Log Error]
    LogError --> NotifyError[Notify User of Error]
    NotifyError --> End
    
    style Start fill:#e1f5ff
    style End fill:#d4edda
    style HandleStart fill:#fff3cd
    style HandleStop fill:#fff3cd
    style HandleMeter fill:#fff3cd
    style HandleStatus fill:#fff3cd
```

---

## 5. Transaction Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: System Ready
    
    Idle --> Scanning: User Opens QR Scanner
    Scanning --> RequestingWS: QR Code Scanned
    RequestingWS --> Connecting: WebSocket URL Received
    RequestingWS --> Error: Payment Card Required
    
    Connecting --> Connected: WebSocket Connected
    Connecting --> Error: Connection Failed
    
    Connected --> CreatingTxn: User Press "Start"
    CreatingTxn --> SendingStart: Transaction Created
    SendingStart --> WaitingStart: RemoteStartTransaction Sent
    
    WaitingStart --> Charging: StartTransaction Received
    WaitingStart --> Error: Charge Point Rejected
    
    Charging --> Charging: MeterValues Updates
    Charging --> SendingStop: User Press "Stop"
    Charging --> Stopping: Auto Stop (Full/Error)
    
    SendingStop --> Stopping: RemoteStopTransaction Sent
    Stopping --> Finishing: StopTransaction Received
    
    Finishing --> FetchingSummary: Request Summary
    FetchingSummary --> Summary: Summary Received
    
    Summary --> [*]: Session Complete
    Error --> [*]: User Action Required
    
    note right of Idle
        Connector Status:
        - Available
        - Preparing
        - Occupied
    end note
    
    note right of Charging
        Real-time Updates:
        - Energy (kWh)
        - Power (kW)
        - Voltage, Current
        - SoC (%)
        - Cost (THB)
    end note
    
    note right of Summary
        Final Data:
        - Total Energy
        - Total Cost
        - Duration
        - Start/End Time
    end note
```

---

## 6. Error Handling Flow

```mermaid
flowchart TD
    Start([Error Occurs]) --> CheckType{Error Type?}
    
    CheckType -->|401 Unauthorized| Handle401[Clear Tokens & Credentials]
    CheckType -->|402 Payment Required| Handle402[Show Payment Card Alert]
    CheckType -->|404 Not Found| Handle404[Show Not Found Message]
    CheckType -->|Network Error| HandleNetwork[Show Network Error]
    CheckType -->|WebSocket Closed| HandleWSClose[Update Connection State]
    CheckType -->|OCPP Error| HandleOCPP[Process OCPP Error]
    CheckType -->|Transaction Error| HandleTxn[Show Transaction Error]
    
    Handle401 --> ShowAlert401[Alert: Session Expired]
    ShowAlert401 --> Navigate401[Navigate to Login]
    Navigate401 --> End([Error Handled])
    
    Handle402 --> ShowAlert402[Alert: Add Payment Card]
    ShowAlert402 --> UserChoice402{User Action?}
    UserChoice402 -->|Add Card| Navigate402[Navigate to Card Page]
    UserChoice402 -->|Cancel| ResetScanner[Reset Scanner State]
    Navigate402 --> End
    ResetScanner --> End
    
    Handle404 --> ShowAlert404[Alert: Resource Not Found]
    ShowAlert404 --> LogError404[Log Error Details]
    LogError404 --> End
    
    HandleNetwork --> ShowAlertNet[Alert: Network Error]
    ShowAlertNet --> RetryOption{Offer Retry?}
    RetryOption -->|Yes| RetryRequest[Retry Request]
    RetryOption -->|No| End
    RetryRequest --> End
    
    HandleWSClose --> CheckClosed{Connection Lost?}
    CheckClosed -->|Yes| ShowDisconnected[Show Disconnected State]
    CheckClosed -->|No| NormalClose[Normal Close]
    ShowDisconnected --> End
    NormalClose --> End
    
    HandleOCPP --> ParseOCPP[Parse OCPP Error Code]
    ParseOCPP --> ShowOCPPAlert[Alert: OCPP Error]
    ShowOCPPAlert --> LogOCPP[Log OCPP Error]
    LogOCPP --> End
    
    HandleTxn --> CheckTxnError{Transaction Error Type?}
    CheckTxnError -->|Not Found| ShowTxnNotFound[Alert: Transaction Not Found]
    CheckTxnError -->|Invalid State| ShowInvalidState[Alert: Cannot Start/Stop]
    CheckTxnError -->|Other| ShowGenericTxn[Alert: Transaction Error]
    ShowTxnNotFound --> End
    ShowInvalidState --> End
    ShowGenericTxn --> End
    
    style Start fill:#f8d7da
    style End fill:#d4edda
    style Handle401 fill:#fff3cd
    style Handle402 fill:#fff3cd
    style HandleNetwork fill:#fff3cd
```

---

## 7. Data Flow - Real-time Charging Updates

```mermaid
flowchart LR
    subgraph "Charge Point"
        CPMeter[Meter Sensors]
        CPOCPP[OCPP Client]
    end
    
    subgraph "WebSocket Gateway"
        direction TB
        OCPPServer[OCPP WebSocket Server]
        Processor[Message Processor]
        Metrics[Metrics Calculator]
        UserWS[User WebSocket Server]
    end
    
    subgraph "Mobile App"
        direction TB
        WSClient[WebSocket Client]
        StateManager[State Manager]
        UI[User Interface]
    end
    
    CPMeter -->|Raw Values| CPOCPP
    CPOCPP -->|OCPP MeterValues| OCPPServer
    
    OCPPServer -->|Parse Message| Processor
    Processor -->|Extract Data| Metrics
    
    Metrics -->|Calculate<br/>- Energy kWh<br/>- Power kW<br/>- Voltage V<br/>- Current A<br/>- SoC %| UserWS
    
    UserWS -->|Format JSON| WSClient
    WSClient -->|Update State| StateManager
    
    StateManager -->|Render| UI
    
    UI -->|Display<br/>- Current Power<br/>- Energy Delivered<br/>- Charging %<br/>- Estimated Cost<br/>- Time Elapsed| User((User))
    
    style CPOCPP fill:#f8d7da
    style Processor fill:#fff3cd
    style Metrics fill:#fff3cd
    style StateManager fill:#e1f5ff
    style UI fill:#e1f5ff
```

---

## 8. Payment Card Check Flow

```mermaid
sequenceDiagram
    participant User
    participant QRScanner
    participant API
    participant Backend
    participant DB
    
    User->>QRScanner: Scan QR Code
    QRScanner->>API: getWebSocketUrl(cpId, connId, userId)
    API->>Backend: GET /api/chargepoints/.../websocket-url
    
    Backend->>DB: Query User Payment Cards
    DB-->>Backend: Return Cards
    
    alt Has Payment Cards
        Backend->>Backend: Generate WebSocket URL
        Backend->>Backend: Prepare Charge Point Info
        Backend-->>API: 200 OK + WS URL
        API-->>QRScanner: Success
        QRScanner->>User: Navigate to Charging Screen
    else No Payment Cards
        Backend-->>API: 402 Payment Required
        API-->>QRScanner: Payment Card Error
        QRScanner->>User: Alert: Add Payment Card
        
        alt User Chooses to Add Card
            User->>QRScanner: Click "Add Card"
            QRScanner->>User: Navigate to Card Page
            User->>User: Add Payment Card
            User->>QRScanner: Return to Scanner
            QRScanner->>User: Scan QR Again
        else User Cancels
            User->>QRScanner: Click "Cancel"
            QRScanner->>User: Ready to Scan Again
        end
    end
```

---

## 9. Gateway Session Management

```mermaid
flowchart TD
    Start([Charge Point Connects]) --> CheckAuth{Authenticated?}
    
    CheckAuth -->|No| SendBoot[Send BootNotification]
    SendBoot --> WaitAuth[Wait for Response]
    WaitAuth --> CheckAuth
    
    CheckAuth -->|Yes| CreateSession[Create Gateway Session]
    CreateSession --> InitData[Initialize Session Data]
    
    InitData --> SetProps[Set Properties:<br/>- chargePointId<br/>- serialNumber<br/>- connectors<br/>- connectedAt<br/>- ocppVersion]
    
    SetProps --> AddToManager[Add to Session Manager]
    AddToManager --> StartMonitor[Start Monitoring]
    
    StartMonitor --> Active{Session Active?}
    
    Active -->|Yes| CheckHeartbeat{Heartbeat OK?}
    
    CheckHeartbeat -->|Yes| UpdateLastSeen[Update Last Seen]
    CheckHeartbeat -->|No| MarkStale[Mark as Stale]
    
    UpdateLastSeen --> ProcessMsg{New Message?}
    MarkStale --> ProcessMsg
    
    ProcessMsg -->|Yes| HandleMsg[Handle Message]
    ProcessMsg -->|No| Active
    
    HandleMsg --> UpdateMetrics[Update Metrics]
    UpdateMetrics --> NotifyUsers[Notify Connected Users]
    NotifyUsers --> Active
    
    Active -->|No| Cleanup[Cleanup Session]
    Cleanup --> RemoveFromManager[Remove from Manager]
    RemoveFromManager --> CloseConnections[Close User Connections]
    CloseConnections --> End([Session Ended])
    
    style Start fill:#e1f5ff
    style Active fill:#fff3cd
    style End fill:#d4edda
```

---

## 10. Summary Screen Navigation Flow

```mermaid
flowchart TD
    Start([Charging Stopped]) --> CheckEvent{Stop Event<br/>Received?}
    
    CheckEvent -->|Yes| CheckStatus{Connector<br/>Status?}
    CheckEvent -->|No| Wait[Wait for Event]
    Wait --> CheckEvent
    
    CheckStatus -->|Finishing| FetchSummary
    CheckStatus -->|SuspendedEV| FetchSummary
    CheckStatus -->|SuspendedEVSE| FetchSummary
    CheckStatus -->|Available| FetchSummary
    CheckStatus -->|Other| Wait
    
    FetchSummary[Fetch Transaction Summary] --> APICall[GET /transactions/{id}/summary]
    APICall --> CheckResponse{Response OK?}
    
    CheckResponse -->|Yes| ParseData[Parse Summary Data]
    CheckResponse -->|No| ShowError[Show Error Message]
    
    ParseData --> PrepareParams[Prepare Navigation Params:<br/>- transactionId<br/>- energy<br/>- cost<br/>- duration<br/>- startTime<br/>- endTime<br/>- meterStart<br/>- meterStop<br/>- rate]
    
    PrepareParams --> Navigate[router.replace('/charge-session/summary')]
    Navigate --> DisplaySummary[Display Summary Screen]
    
    DisplaySummary --> ShowData[Show:<br/>- Energy Delivered<br/>- Total Cost<br/>- Duration<br/>- Start/End Time<br/>- Rate Applied]
    
    ShowData --> UserAction{User Action?}
    UserAction -->|Back to Home| NavigateHome[Navigate Home]
    UserAction -->|View History| NavigateHistory[Navigate to History]
    UserAction -->|Stay| ShowData
    
    NavigateHome --> End([Flow Complete])
    NavigateHistory --> End
    ShowError --> End
    
    style Start fill:#f8d7da
    style FetchSummary fill:#fff3cd
    style DisplaySummary fill:#e1f5ff
    style End fill:#d4edda
```

---

## Legend

```mermaid
graph LR
    Mobile[Mobile App Component]
    Gateway[WebSocket Gateway]
    Backend[Backend API]
    ChargePoint[Charge Point / Station]
    
    style Mobile fill:#e1f5ff
    style Gateway fill:#fff3cd
    style Backend fill:#d4edda
    style ChargePoint fill:#f8d7da
```

- **Blue**: Mobile App Components
- **Yellow**: WebSocket Gateway Components
- **Green**: Backend API Components
- **Red**: Charging Station / Charge Point Components
