// functions/tools/admin.html.ts
interface Bindings {
  ADMIN_PASSWORD: string;
  ADMIN_USER?: string;
  ASSETS: Fetcher;
}

export const onRequest: PagesFunction<Bindings> = async ({ request, env }) => {
  const user = (env.ADMIN_USER || 'admin').trim();
  const pass = (env.ADMIN_PASSWORD || '').trim();

  const hdr = request.headers.get('Authorization') || '';
  const expected = 'Basic ' + btoa(`${user}:${pass}`);

  if (!pass || hdr !== expected) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="RSVP Admin"' },
    });
  }

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
