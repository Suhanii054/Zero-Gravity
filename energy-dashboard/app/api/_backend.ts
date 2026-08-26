import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.FORECAST_API_BASE_URL ?? 'http://127.0.0.1:8000';

export function queryString(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  if (!params.get('model')) {
    params.set('model', 'lightgbm');
  }
  if (params.get('start') && !params.get('start_date')) {
    params.set('start_date', params.get('start')!);
    params.delete('start');
  }
  if (params.get('end') && !params.get('end_date')) {
    params.set('end_date', params.get('end')!);
    params.delete('end');
  }
  if (params.get('aggregation') && !params.get('resolution')) {
    params.set('resolution', params.get('aggregation')!);
    params.delete('aggregation');
  }
  return params.toString();
}

export async function proxyJson(request: Request, backendPath: string, init?: RequestInit) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('fallback') === '1') {
    return NextResponse.json({ error: 'Fallback mock data is disabled; live dataset API is required.' }, { status: 503 });
  }

  try {
    const suffix = queryString(searchParams);
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`${BACKEND_BASE_URL}${backendPath}${suffix ? `?${suffix}` : ''}`, {
      cache: 'no-store',
      ...init,
      headers,
    });
    if (!response.ok) {
      throw new Error(`Backend ${backendPath} failed: ${response.status}`);
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : `Backend ${backendPath} unavailable.` },
      { status: 503 }
    );
  }
}
