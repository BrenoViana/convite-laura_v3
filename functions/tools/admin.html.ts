/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;           // Pages asset binding
  ADMIN_USER?: string;       // usuário do Basic Auth (ex.: "admin")
  ADMIN_PASSWORD?: string;   // senha do Basic Auth
}

function basicAuthHeader(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`);
  return `Basic ${token}`;
}

function parseBasic(h: string | null): { user: string; pass: string } | null {
  if (!h) return null;
  const m = /^Basic\s+(.+)$/i.exec(h);
  if (!m) return null;
  try {
    const [user, pass] = atob(m[1]).split(':', 2);
    return { user, pass };
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const wantUser = env.ADMIN_USER || 'admin';
  const wantPass = env.ADMIN_PASSWORD || 'changeme';

  const creds = parseBasic(request.headers.get('authorization'));
  const ok = creds && creds.user === wantUser && creds.pass === wantPass;

  if (!ok) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="RSVP Admin"' }
    });
  }

  // Serve o HTML estático do admin (em src/assets/tools/admin.html -> publicado como /assets/tools/admin.html)
  // Como a função está em /functions/tools/admin.html.ts, a URL pública é /tools/admin.html
  // O Pages primeiro passa pela Function; aqui podemos delegar para os assets:
  return env.ASSETS.fetch(request);
};
