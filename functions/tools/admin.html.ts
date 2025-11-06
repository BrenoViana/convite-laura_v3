/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;            // Pages asset binding padrão
  ADMIN_USER?: string;        // ex.: "admin"
  ADMIN_PASSWORD?: string;    // ex.: "sua-senha"
}

const unauthorized = () =>
  new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"RSVP Admin\"" }
  });

function parseBasic(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const [user, pass] = atob(header.slice(6)).split(":");
    return { user, pass };
  } catch { return null; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(env.ADMIN_USER && env.ADMIN_PASSWORD)) return unauthorized();
  const creds = parseBasic(request.headers.get("Authorization"));
  if (!creds || creds.user !== env.ADMIN_USER || creds.pass !== env.ADMIN_PASSWORD) return unauthorized();

  return env.ASSETS.fetch(request); // entrega /public/tools/admin.html
};
