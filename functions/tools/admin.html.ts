// functions/tools/admin.html.ts
interface Bindings {
  ADMIN_PASSWORD: string;
  ADMIN_USER?: string;
  ASSETS: Fetcher;
}

export const onRequest: PagesFunction<Bindings> = async ({ request, env }) => {
  const user = (env.ADMIN_USER || 'admin').trim();
  const pass = (env.ADMIN_PASSWORD || '').trim();

  const auth = request.headers.get('Authorization') || '';
  const expected = 'Basic ' + btoa(`${user}:${pass}`);

  if (!pass || auth !== expected) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="RSVP Admin"' },
    });
  }

  // Autenticado: servir o arquivo estático /tools/admin.html
  const url = new URL(request.url);
  url.pathname = '/tools/admin.html';
  return env.ASSETS.fetch(new Request(url.toString(), request));
};
