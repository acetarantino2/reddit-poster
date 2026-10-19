import { isAuthenticated } from '@/lib/auth';
import { applyOp, validateOp } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  let op: unknown;
  try {
    op = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!validateOp(op)) {
    return Response.json({ error: 'invalid_op' }, { status: 400 });
  }
  try {
    await applyOp(op);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'database_error' }, { status: 500 });
  }
}
