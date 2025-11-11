import { GatewayRouteRule } from "../types/request";

export const GATEWAY_API_KEY = process.env.WS_GATEWAY_API_KEY || "your-api-key";

export const GATEWAY_ROUTE_RULES: GatewayRouteRule[] = [
  {
    methods: ["GET"],
    pattern: /^\/api\/chargepoints\/ws-gateway\/chargepoints$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/validate-whitelist$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/validate-ocpp$/ },
  {
    methods: ["PUT"],
    pattern: /^\/api\/chargepoints\/[^/]+\/connection-status$/,
  },
  { methods: ["GET"], pattern: /^\/api\/chargepoints\/[^/]+$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints$/ },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/status$/ },
  {
    methods: ["POST"],
    pattern: /^\/api\/chargepoints\/[^/]+\/update-from-boot$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/[^/]+\/heartbeat$/ },
  {
    methods: ["GET"],
    pattern: /^\/api\/chargepoints\/check-connectors\/[^/]+$/,
  },
  { methods: ["POST"], pattern: /^\/api\/chargepoints\/create-connectors$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/authorize$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/[^/]+\/start$/ },
  { methods: ["POST"], pattern: /^\/api\/transactions\/ocpp\/[^/]+\/stop$/ },
];

export const isGatewayRoute = (method: string, path: string) =>
  GATEWAY_ROUTE_RULES.some(
    (rule) =>
      rule.methods.includes(method.toUpperCase()) && rule.pattern.test(path)
  );

export const extractGatewayKey = (request: Request) => {
  const headerValue =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization") ||
    "";

  if (!headerValue) {
    return null;
  }

  return headerValue.startsWith("Bearer ")
    ? headerValue.substring(7).trim()
    : headerValue.trim();
};