import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.FORECAST_API_BASE_URL ?? 'http://127.0.0.1:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/range-chat`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Backend range-chat failed: ${response.status}`);
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Range-chat backend unavailable.' },
      { status: 503 }
    );
  }
}
