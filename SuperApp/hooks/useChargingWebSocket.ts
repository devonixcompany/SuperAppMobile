import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChargingWebSocketClient,
    ConnectionStatus,
    MeterValues,
    TransactionUpdate
} from '../services/websocket/ChargingWebSocketClient';

export interface ChargingWebSocketData {
  connectionStatus: ConnectionStatus['status'];
  connectionMessage: string;
  transactionData: TransactionUpdate['data'] | null;
  meterValues: MeterValues;
  isConnected: boolean;
}

/**
 * React Hook สำหรับ WebSocket Real-time updates
 */
export function useChargingWebSocket(userId?: string): ChargingWebSocketData & {
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => void;
} {
  const wsClientRef = useRef<ChargingWebSocketClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus['status']>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState<string>('Not connected');
  const [transactionData, setTransactionData] = useState<TransactionUpdate['data'] | null>(null);
  const [meterValues, setMeterValues] = useState<MeterValues>({
    energyDelivered: 0,
    currentSoC: undefined,
    powerDelivered: 0,
    currentMeterValue: 0,
    timestamp: new Date().toISOString()
  });

  // สร้าง WebSocket client ครั้งเดียว
  useEffect(() => {
    if (!wsClientRef.current) {
      wsClientRef.current = new ChargingWebSocketClient();
      
      // Setup event listeners
      wsClientRef.current.onConnectionStatus = (status: ConnectionStatus) => {
        console.log('🔌 [HOOK] Connection status changed:', status);
        setConnectionStatus(status.status);
        setConnectionMessage(status.message);
      };
      
      wsClientRef.current.onTransactionUpdate = (update: TransactionUpdate) => {
        console.log('🔄 [HOOK] Transaction update:', update);
        setTransactionData(prev => ({
          ...(prev || {}),
          ...update.data
        }));
      };
      
      wsClientRef.current.onMeterValues = (values: MeterValues) => {
        console.log('⚡ [HOOK] Meter values update:', values);
        setMeterValues({
          transactionId: values.transactionId,
          chargePointId: values.chargePointId,
          connectorId: values.connectorId,
          energyDelivered: values.energyDelivered,
          currentSoC: values.currentSoC,
          powerDelivered: values.powerDelivered,
          currentMeterValue: values.currentMeterValue || 0,
          timestamp: values.timestamp
        });
      };
    }

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, []);

  // Connect function
  const connect = useCallback(async (userId: string) => {
    if (wsClientRef.current && userId) {
      console.log('🔌 [HOOK] Connecting WebSocket for user:', userId);
      await wsClientRef.current.connect(userId);
    }
  }, []);

  // Disconnect function  
  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      console.log('🔌 [HOOK] Disconnecting WebSocket');
      wsClientRef.current.disconnect();
    }
  }, []);

  // Send message function
  const sendMessage = useCallback((message: any) => {
    if (wsClientRef.current) {
      wsClientRef.current.send(message);
    }
  }, []);

  // Auto connect เมื่อมี userId
  useEffect(() => {
    if (userId && wsClientRef.current) {
      connect(userId).catch(error => {
        console.error('❌ [HOOK] Failed to auto-connect:', error);
      });
    }

    return () => {
      if (wsClientRef.current) {
        disconnect();
      }
    };
  }, [userId, connect, disconnect]);

  return {
    connectionStatus,
    connectionMessage,
    transactionData,
    meterValues,
    isConnected: connectionStatus === 'connected',
    connect,
    disconnect,
    sendMessage
  };
}