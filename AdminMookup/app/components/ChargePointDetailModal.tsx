import { useEffect } from 'react';
import { useWebSocket, type ChargePointStatus, type ConnectorStatus } from '../hooks/useWebSocket';
import type { ChargePoint } from '../services/api';

interface ChargePointDetailModalProps {
  chargePoint: ChargePoint;
  isOpen: boolean;
  onClose: () => void;
}

const getConnectorStatusColor = (status: ConnectorStatus['status']): string => {
  switch (status) {
    case 'Available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Charging':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Preparing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Finishing':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Reserved':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SuspendedEVSE':
    case 'SuspendedEV':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Unavailable':
    case 'Faulted':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getConnectorStatusLabel = (status: ConnectorStatus['status']): string => {
  switch (status) {
    case 'Available':
      return 'ว่าง';
    case 'Charging':
      return 'กำลังชาร์จ';
    case 'Preparing':
      return 'เตรียมพร้อม';
    case 'Finishing':
      return 'กำลังจบ';
    case 'Reserved':
      return 'จองแล้ว';
    case 'SuspendedEVSE':
      return 'หยุดชั่วคราว (EVSE)';
    case 'SuspendedEV':
      return 'หยุดชั่วคราว (EV)';
    case 'Unavailable':
      return 'ไม่พร้อมใช้งาน';
    case 'Faulted':
      return 'ขัดข้อง';
    default:
      return 'ไม่ทราบสถานะ';
  }
};

const getChargePointStatusColor = (status: 'ONLINE' | 'OFFLINE'): string => {
  return status === 'ONLINE' 
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200';
};

export function ChargePointDetailModal({ chargePoint, isOpen, onClose }: ChargePointDetailModalProps) {
  const { 
    status, 
    connectionStatus, 
    error, 
    connect, 
    disconnect, 
    isConnected 
  } = useWebSocket({
    chargePointId: chargePoint.chargePointIdentity,
    connectorId: 1,
    autoConnect: false,
    reconnectInterval: 3000,
    maxReconnectAttempts: 3
  });

  useEffect(() => {
    if (isOpen) {
      connect();
    } else {
      disconnect();
    }
  }, [isOpen, connect, disconnect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{chargePoint.name}</h2>
            <p className="text-gray-600">{chargePoint.stationName}</p>
            <p className="text-sm text-gray-500">ID: {chargePoint.chargePointIdentity}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Connection Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">สถานะการเชื่อมต่อ</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium">
                  {connectionStatus === 'connected' && 'เชื่อมต่อแล้ว'}
                  {connectionStatus === 'connecting' && 'กำลังเชื่อมต่อ...'}
                  {connectionStatus === 'disconnected' && 'ไม่ได้เชื่อมต่อ'}
                  {connectionStatus === 'error' && 'เกิดข้อผิดพลาด'}
                </span>
              </div>
              
              {!isConnected && (
                <button
                  onClick={connect}
                  disabled={connectionStatus === 'connecting'}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  เชื่อมต่อใหม่
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Charge Point Status */}
          {status && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">สถานะเครื่องชาร์จ</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">สถานะเครื่อง:</span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getChargePointStatusColor(status.status)}`}>
                    {status.status === 'ONLINE' ? 'ออนไลน์' : 'ออฟไลน์'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  อัปเดตล่าสุด: {new Date(status.lastUpdate).toLocaleString('th-TH')}
                </div>
              </div>
            </div>
          )}

          {/* Connectors Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">สถานะหัวชาร์จ</h3>
            
            {status?.connectors && status.connectors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status.connectors.map((connector) => (
                  <div key={connector.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">หัวชาร์จ #{connector.id}</h4>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getConnectorStatusColor(connector.status)}`}>
                        {getConnectorStatusLabel(connector.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ประเภท:</span>
                        <span className="font-medium">{connector.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">กระแสสูงสุด:</span>
                        <span className="font-medium">{connector.maxCurrent}A</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isConnected ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>กำลังโหลดข้อมูลหัวชาร์จ...</p>
                  </div>
                ) : (
                  <p>กรุณาเชื่อมต่อเพื่อดูสถานะหัวชาร์จ</p>
                )}
              </div>
            )}
          </div>

          {/* Charge Point Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">ข้อมูลเครื่องชาร์จ</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ตำแหน่ง:</span>
                  <p className="font-medium">{chargePoint.location}</p>
                </div>
                <div>
                  <span className="text-gray-600">หมายเลขเครื่อง:</span>
                  <p className="font-medium">{chargePoint.serialNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600">ยี่ห้อ:</span>
                  <p className="font-medium">{chargePoint.brand}</p>
                </div>
                <div>
                  <span className="text-gray-600">กำลังไฟ:</span>
                  <p className="font-medium">{chargePoint.powerRating} kW</p>
                </div>
                <div>
                  <span className="text-gray-600">จำนวนหัวชาร์จ:</span>
                  <p className="font-medium">{chargePoint.connectorCount} หัว</p>
                </div>
                <div>
                  <span className="text-gray-600">โปรโตคอล:</span>
                  <p className="font-medium">{chargePoint.protocol}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}