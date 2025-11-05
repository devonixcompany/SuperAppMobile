# Token Refresh Fix Summary

## Problem
The frontend was experiencing 401 Unauthorized errors even after successful token refresh when calling `/api/chargepoints/CP-TH-BKK-001/1/websocket-url`. The logs showed:

1. First API call with expired token → 401 error
2. Token refresh succeeds → New tokens generated
3. Retry API call → Still uses old expired token → Another 401 error

## Root Cause
The issue was in the HTTP client retry logic in `/services/api/client.ts`:

1. **Token refresh function**: Updated `cachedTokens` but the update wasn't immediately available to the request interceptor
2. **Request interceptor**: Always loaded tokens from cache using `loadTokens()`, which could return stale tokens
3. **Retry logic**: Set the Authorization header but the interceptor would override it with cached tokens

## Solution
Made three key changes:

### 1. Update cached tokens immediately after refresh
```typescript
// In refreshAccessToken function
await persistTokens(tokens);

// ✅ CRITICAL: Update cached tokens immediately so subsequent requests use the new tokens
cachedTokens = tokens;
console.log('✅ [HTTP] Cached tokens updated after refresh');
```

### 2. Respect existing Authorization headers in request interceptor
```typescript
// In request interceptor
if (!requestConfig.skipAuth) {
  // ✅ CRITICAL: Check if Authorization header is already set (from retry after refresh)
  if (headers.Authorization) {
    console.log('🎫 [HTTP] Using existing Authorization header (retry after refresh)');
  } else {
    // Load tokens from cache/storage only if header not already set
    const tokens = await loadTokens();
    // ... rest of token loading logic
  }
}
```

### 3. Enhanced retry logic
```typescript
if (refreshed?.accessToken) {
  console.log('✅ [HTTP] Token refreshed successfully, retrying request');
  
  const headers = ensureHeadersObject(requestConfig);
  headers.Authorization = `Bearer ${refreshed.accessToken}`;
  
  // Mark this request as already having valid auth to prevent interceptor from overriding
  requestConfig._retry = true;
  requestConfig.skipAuth = false;
  
  return api(requestConfig);
}
```

## Key Insights
- The request interceptor runs **after** the retry logic sets headers
- `cachedTokens` needs to be updated immediately, not just through `persistTokens()`
- Authorization headers set in retry logic must be preserved by the interceptor

## Testing
The fix ensures that:
1. Token refresh updates both storage AND memory cache immediately
2. Retry requests use the fresh tokens instead of stale cached ones
3. The request interceptor respects headers set during retry
4. No race conditions between token refresh and retry requests

This should resolve the 401 errors you were seeing when calling the WebSocket URL endpoint.