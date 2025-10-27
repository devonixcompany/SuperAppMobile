const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const ensureTrailingSlashTrimmed = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value;

/**
 * แปลง URL ที่ชี้ไปยัง localhost ภายใน QR/response ให้เป็น host ที่อุปกรณ์สามารถเข้าถึงได้
 */
export const normalizeUrlToDevice = (
  rawUrl: string,
  baseApiUrl: string
): string => {
  try {
    const parsed = new URL(rawUrl);
    if (!LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
      return parsed.toString();
    }

    const envUrl = new URL(baseApiUrl);
    parsed.protocol = envUrl.protocol;
    parsed.hostname = envUrl.hostname;
    parsed.port = envUrl.port;
    parsed.username = envUrl.username;
    parsed.password = envUrl.password;

    const basePath = ensureTrailingSlashTrimmed(envUrl.pathname);
    if (basePath && !parsed.pathname.startsWith(basePath)) {
      const joiner = parsed.pathname.startsWith("/") ? "" : "/";
      parsed.pathname = `${basePath}${joiner}${parsed.pathname}`;
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

/**
 * ปรับ WebSocket URL ที่ชี้ไปยัง localhost ให้ตรงกับ host จาก base API
 */
export const normalizeWebSocketUrlToDevice = (
  rawUrl: string,
  baseApiUrl: string
) : string => {
  try {
    const parsed = new URL(rawUrl);
    if (!LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
      return parsed.toString();
    }

    const envUrl = new URL(baseApiUrl);
    parsed.hostname = envUrl.hostname;
    parsed.port = parsed.port || envUrl.port;
    parsed.username = envUrl.username;
    parsed.password = envUrl.password;

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};
