export interface Env {
  RSVP: KVNamespace;
  ADMIN_TOKEN: string;
}

type Entry = {
  id: string;
  ts: string;
  name: string;
  attending: boolean;
  adults?: number;
  children?: number;
  phone?: string;
  message?: string;
  ip?: string | null;
  ua?: string | null;
};

const PREFIX = "rsvp:";

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  if (request.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders(request) });
  }

  if (request.method === "POST") {
    const data = await safeJson(request);
    if (!data || typeof data.name !== "string" || !data.name.trim()) {
      return json({ ok: false, error: "Nome é obrigatório." }, 400, request);
    }

    const entry: Entry = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      name: data.name.trim(),
      attending: !!data.attending,
      adults: toNum(data.adults),
      children: toNum(data.children),
      phone: toStr(data.phone),
      message: toStr(data.message),
      ip: request.headers.get("CF-Connecting-IP"),
      ua: request.headers.get("User-Agent"),
    };

    await env.RSVP.put(PREFIX + entry.id, JSON.stringify(entry));
    return json({ ok: true, id: entry.id }, 201, request);
  }

  if (request.method === "GET") {
    if (!authorized(request, env.ADMIN_TOKEN)) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
    }
    const keys = await env.RSVP.list({ prefix: PREFIX });
    const items: Entry[] = [];
    for (const k of keys.keys) {
      const v = await env.RSVP.get(k.name);
      if (v) items.push(JSON.parse(v));
    }
    items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return json(items, 200, request);
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders(request) });
};

function json(obj: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

function toNum(v: any) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function toStr(v: any) { if (v == null) return undefined; const s = String(v).trim(); return s ? s : undefined; }

function authorized(req: Request, token: string) {
  const auth = req.headers.get("Authorization") || "";
  return auth === `Bearer ${token}`;
}
function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}