import { ServiceRegistry } from '../services/service-registry.js';
import { Logger } from '../../../../shared/utils/logger.js';

const logger = new Logger('ProxyMiddleware');

export const createProxyMiddleware = (serviceRegistry: ServiceRegistry) => {
  return {
    async proxy(request: Request, serviceName: string, path: string) {
      try {
        const serviceUrl = serviceRegistry.getServiceUrl(serviceName);

        if (!serviceUrl) {
          const service = await serviceRegistry.discoverService(serviceName);
          if (!service) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Service ${serviceName} not available`,
                timestamp: new Date()
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        const targetUrl = `${serviceRegistry.getServiceUrl(serviceName)}${path}`;
        logger.info(`Proxying request to: ${targetUrl}`);

        // Clone the request with modified URL
        const proxyRequest = new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow'
        });

        // Remove host header to avoid conflicts
        proxyRequest.headers.delete('host');

        const response = await fetch(proxyRequest);

        // Create new response with CORS headers
        const corsHeaders = new Headers(response.headers);
        corsHeaders.set('Access-Control-Allow-Origin', '*');
        corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: corsHeaders
        });

      } catch (error) {
        logger.error(`Proxy error for service ${serviceName}:`, error);

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable',
            timestamp: new Date()
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  };
};