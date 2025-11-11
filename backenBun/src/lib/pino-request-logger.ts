import { Elysia } from "elysia";
import { logger } from "../shared/logger";

export const pinoRequestLogger = new Elysia({ name: "pino-request-logger" })
  .derive(({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const method = request.method;
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    logger.info({
      requestId,
      method,
      url: url.pathname + url.search,
      ip,
      userAgent: request.headers.get("user-agent") || "unknown",
      timestamp: new Date().toISOString(),
    }, "Incoming request");

    return {
      requestId,
      startTime,
    };
  })
  .onAfterHandle(({ request, set, requestId, startTime }: any) => {
    const endTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const statusCode = set.status || 200;

    let responseTime = 0;
    if (startTime) {
      responseTime = endTime - startTime;
    }

    logger.info({
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
    }, "Request completed");
  })
  .onError(({ request, set, error, requestId, startTime }: any) => {
    const endTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const statusCode = set.status || 500;

    let responseTime = 0;
    if (startTime) {
      responseTime = endTime - startTime;
    }

    logger.error({
      requestId,
      method,
      url: url.pathname + url.search,
      statusCode,
      responseTime,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, "Request failed");
  });
