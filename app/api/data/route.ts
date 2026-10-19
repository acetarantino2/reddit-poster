import { isAuthenticated } from '@/lib/auth';
import { loadAll } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const data = await loadAll();
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'database_error' }, { status: 500 });
  }
}
