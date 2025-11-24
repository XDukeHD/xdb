/**
 * Authentication and error handling middleware for XDB API
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  authenticated?: boolean;
  token?: string;
}

/**
 * Add CORS headers to response for all origins and methods
 * This is critical for Vercel deployment where CORS is handled differently
 */
export function addCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');
  return response;
}

/**
 * Authenticate request using Bearer token
 */
export function authenticate(request: NextRequest): { authenticated: boolean; error?: NextResponse } {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    const errorResponse = NextResponse.json(
      { status: 'error', error: 'Missing Authorization header' },
      { status: 401 },
    );
    return {
      authenticated: false,
      error: addCORSHeaders(errorResponse),
    };
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  const expectedToken = process.env.AUTH_TOKEN;

  if (!expectedToken) {
    console.error('AUTH_TOKEN not configured in environment');
    const errorResponse = NextResponse.json(
      { status: 'error', error: 'Server misconfiguration' },
      { status: 500 },
    );
    return {
      authenticated: false,
      error: addCORSHeaders(errorResponse),
    };
  }

  if (token !== expectedToken) {
    const errorResponse = NextResponse.json(
      { status: 'error', error: 'Invalid authentication token' },
      { status: 401 },
    );
    return {
      authenticated: false,
      error: addCORSHeaders(errorResponse),
    };
  }

  return { authenticated: true };
}

/**
 * Format elapsed time in seconds
 */
export function getElapsedSeconds(startTime: number): number {
  return Number(((Date.now() - startTime) / 1000).toFixed(3));
}

/**
 * Add CORS headers to response
 * (replaces old disableCORS function which had misleading name)
 */
export function disableCORS(response: NextResponse): NextResponse {
  return addCORSHeaders(response);
}

/**
 * Create success response with CORS headers
 */
export function createSuccessResponse(
  data: unknown,
  elapsedSeconds: number,
  status = 200,
): NextResponse {
  const response = NextResponse.json(
    {
      status: 'ok',
      data,
      elapsed_seconds: elapsedSeconds,
    },
    { status },
  );
  return addCORSHeaders(response);
}

/**
 * Create error response with CORS headers
 */
export function createErrorResponse(
  error: string | Error,
  status = 400,
): NextResponse {
  const message = typeof error === 'string' ? error : error.message;

  const response = NextResponse.json(
    {
      status: 'error',
      error: message,
    },
    { status },
  );
  return addCORSHeaders(response);
}
