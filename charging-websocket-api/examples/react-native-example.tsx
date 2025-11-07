/**
 * React Native Charging WebSocket API Example
 * Complete implementation for integrating with the Charging WebSocket API
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';

// Type definitions
interface WebSocketMessage {
  id: string;
  type: string;
  timestamp: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ChargingSession {
  chargePointId: string;
  connectorId: number;
  transactionId?: number;
  status: string;
  startTime?: string;
  energyDelivered?: number;
  powerKw?: number;
}

interface MeterValues {
  energyImportKWh: number;
  powerKw: number;
  voltage: number;
  current: number;
  timestamp: string;
  stateOfCharge?: number;
}

interface ChargingWebSocketClient {
  ws: WebSocket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  sessionId: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  messageQueue: Map<string, (message: WebSocketMessage) => void>;
  messageId: number;

  connect(url: string): Promise<void>;
  disconnect(): void;
  authenticate(token: string): Promise<void>;
  startCharging(chargePointId: string, connectorId: number, idTag: string): Promise<WebSocketMessage>;
  stopCharging(chargePointId: string, transactionId: number): Promise<WebSocketMessage>;
  getConnectorStatus(chargePointId: string, connectorId?: number): Promise<WebSocketMessage>;
  sendHeartbeat(): Promise<WebSocketMessage>;
  onStatusUpdate(callback: (data: any) => void): void;
  onMeterValuesUpdate(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
}

// WebSocket Client Implementation
class ChargingWebSocketClientImpl implements ChargingWebSocketClient {
  ws: WebSocket | null = null;
  isConnected = false;
  isAuthenticated = false;
  sessionId = '';
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  messageQueue = new Map<string, (message: WebSocketMessage) => void>();
  messageId = 1;
  reconnectTimer: NodeJS.Timeout | null = null;
  heartbeatTimer: NodeJS.Timeout | null = null;

  private statusUpdateCallback?: (data: any) => void;
  private meterValuesCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private reconnectCallback?: () => void;
  private disconnectCallback?: () => void;

  constructor() {
    console.log('🔌 Charging WebSocket Client initialized');
  }

  async connect(url: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected');
      return;
    }

    console.log(`🔗 Connecting to: ${url}`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        const connectionTimeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          this.isAuthenticated = false;
          this.stopHeartbeat();
          this.disconnectCallback?.();

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(url);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);
          this.isConnected = false;
          this.errorCallback?.(new Error('WebSocket connection error'));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    console.log('🛑 Disconnecting WebSocket');
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.isAuthenticated = false;
  }

  async authenticate(token: string): Promise<void> {
    const response = await this.sendMessage('auth_request', { token });

    if (response.data?.success) {
      this.isAuthenticated = true;
      this.sessionId = response.data.sessionId;
      console.log('✅ Authentication successful');
    } else {
      throw new Error(response.data?.message || 'Authentication failed');
    }
  }

  async startCharging(chargePointId: string, connectorId: number, idTag: string): Promise<WebSocketMessage> {
    return this.sendMessage('start_charging_request', {
      chargePointId,
      connectorId,
      idTag
    });
  }

  async stopCharging(chargePointId: string, transactionId: number): Promise<WebSocketMessage> {
    return this.sendMessage('stop_charging_request', {
      chargePointId,
      transactionId
    });
  }

  async getConnectorStatus(chargePointId: string, connectorId?: number): Promise<WebSocketMessage> {
    return this.sendMessage('status_request', {
      chargePointId,
      connectorId
    });
  }

  async sendHeartbeat(): Promise<WebSocketMessage> {
    return this.sendMessage('heartbeat', {});
  }

  onStatusUpdate(callback: (data: any) => void): void {
    this.statusUpdateCallback = callback;
  }

  onMeterValuesUpdate(callback: (data: any) => void): void {
    this.meterValuesCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onReconnect(callback: () => void): void {
    this.reconnectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  private async sendMessage(type: string, data?: any): Promise<WebSocketMessage> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    const messageId = this.getNextMessageId();
    const message: WebSocketMessage = {
      id: messageId,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error(`Timeout waiting for response to ${type}`));
      }, 30000);

      this.messageQueue.set(messageId, (responseMessage) => {
        clearTimeout(timeout);
        this.messageQueue.delete(messageId);

        if (responseMessage.error) {
          reject(new Error(`${responseMessage.error.code}: ${responseMessage.error.message}`));
        } else {
          resolve(responseMessage);
        }
      });

      try {
        this.ws!.send(JSON.stringify(message));
        console.log(`📤 Sent message: ${type} (ID: ${messageId})`);
      } catch (error) {
        clearTimeout(timeout);
        this.messageQueue.delete(messageId);
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log(`📥 Received message: ${message.type}`);

      // Handle queued responses
      if (this.messageQueue.has(message.id)) {
        const callback = this.messageQueue.get(message.id);
        callback?.(message);
        return;
      }

      // Handle real-time updates
      switch (message.type) {
        case 'charging_status_update':
          this.statusUpdateCallback?.(message.data);
          break;
        case 'meter_values_update':
          this.meterValuesCallback?.(message.data);
          break;
        case 'error':
          this.errorCallback?.(new Error(message.error?.message || 'Unknown error'));
          break;
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat().catch(error => {
          console.error('❌ Heartbeat failed:', error);
        });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      try {
        await this.connect(url);
        this.reconnectCallback?.();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(url);
        }
      }
    }, delay);
  }

  private getNextMessageId(): string {
    return (this.messageId++).toString();
  }
}

// React Native Component
export const ChargingControlComponent: React.FC = () => {
  const [client] = useState(() => new ChargingWebSocketClientImpl());
  const [connectionUrl, setConnectionUrl] = useState('ws://localhost:8082/ws');
  const [authToken, setAuthToken] = useState('');
  const [chargePointId, setChargePointId] = useState('CP_001');
  const [connectorId, setConnectorId] = useState('1');
  const [idTag, setIdTag] = useState('USER_123');

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<ChargingSession | null>(null);
  const [meterValues, setMeterValues] = useState<MeterValues | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  useEffect(() => {
    // Setup client callbacks
    client.onReconnect(() => {
      addLog('🔄 Reconnected to server');
      setIsConnected(true);
    });

    client.onDisconnect(() => {
      addLog('🔌 Disconnected from server');
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    client.onError((error) => {
      addLog(`❌ Error: ${error.message}`);
    });

    client.onStatusUpdate((data) => {
      addLog(`📊 Status update: ${data.status}`);
      if (data.chargePointId === chargePointId) {
        setCurrentSession(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    client.onMeterValuesUpdate((data) => {
      if (data.chargePointId === chargePointId) {
        setMeterValues(data.meterValue);
        addLog(`⚡ Meter: ${data.meterValue.energyImportKWh.toFixed(3)} kWh, ${data.meterValue.powerKw.toFixed(1)} kW`);
      }
    });

    return () => {
      client.disconnect();
    };
  }, [client, chargePointId, addLog]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await client.connect(connectionUrl);
      setIsConnected(true);
      addLog('✅ Connected to WebSocket server');
    } catch (error) {
      addLog(`❌ Connection failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
    addLog('🛑 Disconnected');
  };

  const handleAuthenticate = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect first');
      return;
    }

    setIsLoading(true);
    try {
      await client.authenticate(authToken);
      setIsAuthenticated(true);
      addLog('✅ Authentication successful');
    } catch (error) {
      addLog(`❌ Authentication failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCharging = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please authenticate first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await client.startCharging(
        chargePointId,
        parseInt(connectorId),
        idTag
      );

      if (response.data?.success) {
        addLog(`✅ Charging started - Transaction: ${response.data.transactionId}`);
        setCurrentSession({
          chargePointId,
          connectorId: parseInt(connectorId),
          transactionId: response.data.transactionId,
          status: response.data.status,
          startTime: new Date().toISOString()
        });
      } else {
        addLog(`❌ Failed to start charging: ${response.data?.message}`);
      }
    } catch (error) {
      addLog(`❌ Start charging error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCharging = async () => {
    if (!currentSession?.transactionId) {
      Alert.alert('Error', 'No active charging session');
      return;
    }

    setIsLoading(true);
    try {
      const response = await client.stopCharging(
        currentSession.chargePointId,
        currentSession.transactionId
      );

      if (response.data?.success) {
        addLog('✅ Charging stopped successfully');
        setCurrentSession(null);
        setMeterValues(null);
      } else {
        addLog(`❌ Failed to stop charging: ${response.data?.message}`);
      }
    } catch (error) {
      addLog(`❌ Stop charging error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔌 Charging Control</Text>

      {/* Connection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Settings</Text>

        <TextInput
          style={styles.input}
          placeholder="WebSocket URL"
          value={connectionUrl}
          onChangeText={setConnectionUrl}
          editable={!isConnected}
        />

        <TextInput
          style={styles.input}
          placeholder="JWT Token"
          value={authToken}
          onChangeText={setAuthToken}
          secureTextEntry
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, isConnected && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={isConnected || isLoading}
          >
            <Text style={styles.buttonText}>
              {isConnected ? 'Connected' : 'Connect'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isConnected && styles.buttonDisabled]}
            onPress={handleDisconnect}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          onPress={handleAuthenticate}
          disabled={!isConnected || isAuthenticated || isLoading}
        >
          <Text style={styles.buttonText}>
            {isAuthenticated ? 'Authenticated' : 'Authenticate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Charging Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Charging Control</Text>

        <TextInput
          style={styles.input}
          placeholder="Charge Point ID"
          value={chargePointId}
          onChangeText={setChargePointId}
        />

        <TextInput
          style={styles.input}
          placeholder="Connector ID"
          value={connectorId}
          onChangeText={setConnectorId}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="ID Tag"
          value={idTag}
          onChangeText={setIdTag}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, (!isAuthenticated || isLoading) && styles.buttonDisabled]}
            onPress={handleStartCharging}
            disabled={!isAuthenticated || isLoading || !!currentSession}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Start Charging'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (!currentSession || isLoading) && styles.buttonDisabled]}
            onPress={handleStopCharging}
            disabled={!currentSession || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Stop Charging'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>

        <View style={styles.statusRow}>
          <Text>Connection:</Text>
          <Text style={isConnected ? styles.statusActive : styles.statusInactive}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text>Authentication:</Text>
          <Text style={isAuthenticated ? styles.statusActive : styles.statusInactive}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Text>
        </View>

        {currentSession && (
          <>
            <View style={styles.statusRow}>
              <Text>Session Status:</Text>
              <Text style={styles.statusActive}>{currentSession.status}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text>Transaction ID:</Text>
              <Text style={styles.statusValue}>{currentSession.transactionId}</Text>
            </View>
          </>
        )}

        {meterValues && (
          <>
            <View style={styles.statusRow}>
              <Text>Energy:</Text>
              <Text style={styles.statusValue}>{meterValues.energyImportKWh.toFixed(3)} kWh</Text>
            </View>
            <View style={styles.statusRow}>
              <Text>Power:</Text>
              <Text style={styles.statusValue}>{meterValues.powerKw.toFixed(1)} kW</Text>
            </View>
            {meterValues.stateOfCharge && (
              <View style={styles.statusRow}>
                <Text>SoC:</Text>
                <Text style={styles.statusValue}>{meterValues.stateOfCharge}%</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Logs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <TouchableOpacity onPress={() => setLogs([])}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.logText}>No logs yet...</Text>
          )}
        </ScrollView>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusActive: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  statusInactive: {
    color: '#FF3B30',
  },
  statusValue: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    padding: 8,
  },
  logText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  clearButton: {
    color: '#007AFF',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChargingControlComponent;
