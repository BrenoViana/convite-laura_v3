// functions/tools/admin.html.ts
// Protege /tools/admin.html com Basic Auth e, após autenticar,
// entrega o HTML estático que está em /assets/tools/admin.html no build.

interface Bindings {
  ADMIN_PASSWORD: string;   // defina nas Variáveis do Pages
  ADMIN_USER?: string;      // opcional, default 'admin'
  ASSETS: Fetcher;          // binding padrão do Pages p/ estáticos
}

export const onRequest: PagesFunction<Bindings> = async ({ request, env }) => {
  const user = (env.ADMIN_USER || 'admin').trim();
  const pass = (env.ADMIN_PASSWORD || '').trim();

  // Cabeçalho Authorization esperado (Basic <base64(user:pass)>)
  const header = request.headers.get('Authorization') || '';
  const expected = 'Basic ' + btoa(`${user}:${pass}`);

  if (!pass || header !== expected) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="RSVP Admin"' },
    });
  }

  // Autenticado: devolve o HTML do admin a partir dos assets do build
  const url = new URL(request.url);
  url.pathname = '/assets/tools/admin.html';

  const upstream = await env.ASSETS.fetch(new Request(url.toString(), request));
  const h = new Headers(upstream.headers);
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex,nofollow');

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: h,
  });
};
