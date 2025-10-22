import { useEffect, useRef, useState } from 'react';

export interface ConnectorStatus {
  id: number;
  type: string;
  maxCurrent: number;
  status: 'Available' | 'Preparing' | 'Charging' | 'SuspendedEVSE' | 'SuspendedEV' | 'Finishing' | 'Reserved' | 'Unavailable' | 'Faulted';
}

export interface ChargePointStatus {
  chargePointId: string;
  status: 'ONLINE' | 'OFFLINE';
  connectors: ConnectorStatus[];
  lastUpdate: string;
}

interface UseWebSocketOptions {
  chargePointId: string;
  connectorId?: number;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  status: ChargePointStatus | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

const WS_BASE_URL = 'ws://localhost:8081';

export function useWebSocket({
  chargePointId,
  connectorId = 1,
  autoConnect = false,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ChargePointStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnect = useRef(false);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);
    isManualDisconnect.current = false;

    try {
      const wsUrl = `${WS_BASE_URL}/user-cp/${chargePointId}/${connectorId}`;
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`✅ WebSocket connected to ${chargePointId}`);
        setConnectionStatus('connected');
        setError(null);
        setReconnectAttempts(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          if (data.type === 'initialStatus' || data.type === 'connectorStatus') {
            setStatus({
              chargePointId: data.chargePointId,
              status: data.status,
              connectors: data.connectors || [],
              lastUpdate: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
          setError('Failed to parse message from server');
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected from ${chargePointId}:`, event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect if not manually disconnected and within retry limits
        if (!isManualDisconnect.current && reconnectAttempts < maxReconnectAttempts) {
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
          setReconnectAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
        }
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket connection:', err);
      setConnectionStatus('error');
      setError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    isManualDisconnect.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setStatus(null);
    setError(null);
    setReconnectAttempts(0);
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [chargePointId, connectorId, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    status,
    connectionStatus,
    error,
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected'
  };
}