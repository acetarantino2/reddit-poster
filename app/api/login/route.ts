import { cookies } from 'next/headers';
import { checkPassword, createSessionToken, getPassword, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  // The login screen normally sends JSON; a plain form post happens if someone
  // submits before the page's JavaScript has loaded. Support both.
  const isForm = !(request.headers.get('content-type') ?? '').includes('application/json');
  const redirect = (path: string) => new Response(null, { status: 303, headers: { Location: path } });

  if (!getPassword()) {
    return isForm ? redirect('/') : Response.json({ error: 'not_configured' }, { status: 500 });
  }

  let password = '';
  try {
    if (isForm) {
      const form = await request.formData();
      password = String(form.get('password') ?? '');
    } else {
      const body = await request.json();
      password = typeof body?.password === 'string' ? body.password : '';
    }
  } catch {
    return isForm ? redirect('/?error=1') : Response.json({ error: 'bad_request' }, { status: 400 });
  }

  if (!checkPassword(password)) {
    // small delay to slow down guessing
    await new Promise((r) => setTimeout(r, 600));
    return isForm ? redirect('/?error=1') : Response.json({ error: 'wrong_password' }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return isForm ? redirect('/') : Response.json({ ok: true });
}
