// functions/api/rsvp.ts
export interface Env {
  RSVP: KVNamespace;
  ADMIN_TOKEN: string;
}

type RsvpIn = {
  name: string;
  attending: boolean;
  adults?: number;
  children?: number;
  phone?: string;
  message?: string;
};

type RsvpStored = RsvpIn & {
  id: string;
  ts: string;
  ip?: string;
  ua?: string;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(r: Response, extra: Record<string, string> = {}) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries({ ...CORS, ...extra })) h.set(k, v);
  return new Response(r.body, { status: r.status, headers: h });
}

function json(data: unknown, init: ResponseInit = {}) {
  const h = new Headers(init.headers);
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json; charset=utf-8");
  return withCors(new Response(JSON.stringify(data), { ...init, headers: h }));
}

function unauthorized() {
  return withCors(new Response("Unauthorized", { status: 401 }));
}

function badRequest(msg: string) {
  return json({ ok: false, error: msg }, { status: 400 });
}

function ok(data: unknown) {
  return json(data, { status: 200 });
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  // 1) Header Authorization: Bearer <token>
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && m[1] === env.ADMIN_TOKEN) return true;

  // 2) Query string ?key=<token> (para curl/testes)
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key && key === env.ADMIN_TOKEN) return true;

  return false;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  // Preflight
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  const url = new URL(request.url);

  if (request.method === "POST") {
    let body: RsvpIn | undefined;
    try {
      body = (await request.json()) as RsvpIn;
    } catch {
      return badRequest("Invalid JSON");
    }

    if (!body?.name || typeof body.attending !== "boolean") {
      return badRequest("Fields 'name' (string) and 'attending' (boolean) are required.");
    }

    const id = crypto.randomUUID();
    const rec: RsvpStored = {
      id,
      ts: new Date().toISOString(),
      name: body.name.trim(),
      attending: body.attending,
      adults: Number(body.adults ?? 0),
      children: Number(body.children ?? 0),
      phone: body.phone?.trim() || "",
      message: body.message?.trim() || "",
      ip: request.headers.get("CF-Connecting-IP") ?? undefined,
      ua: request.headers.get("User-Agent") ?? undefined,
    };

    await env.RSVP.put(`rsvp:${id}`, JSON.stringify(rec));
    // opcional: índice por data para paginação futura
    await env.RSVP.put(`rsvp:ts:${rec.ts}:${id}`, "1");

    return ok({ ok: true, id });
  }

  if (request.method === "GET") {
    // Somente admin pode listar
    if (!(await isAuthorized(request, env))) return unauthorized();

    // ?list=1 -> lista completa
    if (url.searchParams.has("list")) {
      const keys = await env.RSVP.list({ prefix: "rsvp:" });
      const items: RsvpStored[] = [];
      for (const k of keys.keys) {
        if (!k.name.startsWith("rsvp:ts:")) {
          const raw = await env.RSVP.get(k.name);
          if (raw) items.push(JSON.parse(raw));
        }
      }
      // mais recente primeiro
      items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
      return ok(items);
    }

    // Sem ?list: ping/admin info
    return ok({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

