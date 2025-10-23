/**
 * Test Utilities for Service Testing
 * Provides helpers for testing Elysia services
 */

import { Elysia } from 'elysia';

export interface TestResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export class ServiceTester {
  private app: Elysia;

  constructor(app: Elysia) {
    this.app = app;
  }

  async get<T = any>(path: string, headers?: Record<string, string>): Promise<TestResponse<T>> {
    const response = await this.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'GET',
        headers: new Headers(headers)
      })
    );

    return {
      status: response.status,
      body: await response.json() as T,
      headers: response.headers
    };
  }

  async post<T = any>(
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<TestResponse<T>> {
    const response = await this.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          ...headers
        }),
        body: body ? JSON.stringify(body) : undefined
      })
    );

    return {
      status: response.status,
      body: await response.json() as T,
      headers: response.headers
    };
  }

  async put<T = any>(
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<TestResponse<T>> {
    const response = await this.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'PUT',
        headers: new Headers({
          'Content-Type': 'application/json',
          ...headers
        }),
        body: body ? JSON.stringify(body) : undefined
      })
    );

    return {
      status: response.status,
      body: await response.json() as T,
      headers: response.headers
    };
  }

  async delete<T = any>(path: string, headers?: Record<string, string>): Promise<TestResponse<T>> {
    const response = await this.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'DELETE',
        headers: new Headers(headers)
      })
    );

    return {
      status: response.status,
      body: await response.json() as T,
      headers: response.headers
    };
  }
}

export function createMockDate(isoString: string = '2025-01-15T10:00:00.000Z'): Date {
  return new Date(isoString);
}

export function assertSuccess(response: TestResponse, message?: string) {
  if (!response.body.success) {
    throw new Error(message || `Expected success response but got: ${JSON.stringify(response.body)}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

export function assertStatusCode(response: TestResponse, expectedStatus: number, message?: string) {
  if (response.status !== expectedStatus) {
    throw new Error(
      message || `Expected status ${expectedStatus} but got ${response.status}`
    );
  }
}
