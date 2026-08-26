import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.FORECAST_API_BASE_URL ?? 'http://127.0.0.1:8000';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/operational_insights?${searchParams.toString()}`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error(`Backend operational_insights failed: ${response.status}`);
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operational insights backend unavailable.' },
      { status: 503 }
    );
  }
}
