import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

// Simple logger for now
class SimpleLogger {
  constructor(private serviceName: string) {}

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: this.serviceName,
      message,
      ...(meta && { meta })
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: this.serviceName,
      message,
      ...(error && { error })
    }));
  }
}

const logger = new SimpleLogger('APIGateway');

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'API Gateway Service is healthy',
      timestamp: new Date(),
      service: 'api-gateway'
    };
  })
  .get('/services', () => {
    return {
      success: true,
      data: {
        services: [
          {
            name: 'station-service',
            url: 'http://station-service:3001',
            status: 'healthy',
            version: '1.0.0'
          },
          {
            name: 'billing-service',
            url: 'http://billing-service:3003',
            status: 'healthy',
            version: '1.0.0'
          },
          {
            name: 'ocpp-gateway',
            url: 'http://ocpp-gateway:4000',
            status: 'healthy',
            version: '1.0.0'
          }
        ]
      },
      timestamp: new Date()
    };
  })
  .get('/stations/:stationId/charge-points', ({ params }) => {
    return {
      success: true,
      data: {
        stationId: params.stationId,
        chargePoints: [
          {
            id: 'CP001',
            status: 'Available',
            connectorType: 'Type 2',
            maxPower: 22,
            currentPower: 0
          }
        ]
      },
      timestamp: new Date()
    };
  })
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  });

app.listen(3000);

console.log('🚀 API Gateway is running on port 3000');
console.log('📊 Health check: http://localhost:3000/health');
console.log('🔍 Services: http://localhost:3000/services');