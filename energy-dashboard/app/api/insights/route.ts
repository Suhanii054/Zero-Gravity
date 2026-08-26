import { proxyJson } from '@/app/api/_backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyJson(request, '/insights');
}
