// Cloudflare Pages Functions - /api/rsvp
// Um único handler "onRequest" lida com GET, POST e OPTIONS.
// Evita qualquer ambiguidade do roteamento por método.

export interface Env {
  RSVP: KVNamespace;          // Binding do KV (no Pages, associe seu namespace como "RSVP")
  ADMIN_TOKEN?: string;       // Secret para GET/CSV
}

type Kid = { name: string; age: number };
type RsvpPayload =
  | { name: string; hasChildren?: boolean; children?: Kid[] }
  | { name: string; attending?: boolean; adults?: number; kids?: Kid[]; children?: number };

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Content-Type, Authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const json = (obj: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS, ...extra },
  });

const bad = (msg: string, status = 400) => json({ ok: false, error: msg }, status);
const key = (id: string) => `rsvp:${id}`;
const uid = () => `${Date.now().toString(36)}-${crypto.randomUUID()}`;

async function handlePost(request: Request, env: Env) {
  let data: RsvpPayload;
  try { data = await request.json<RsvpPayload>(); } catch { return bad("JSON inválido"); }

  const name = (data as any)?.name;
  if (!name || typeof name !== "string" || !name.trim()) return bad("Nome é obrigatório");

  // Normaliza diferentes formatos (children[] ou kids[])
  let kids: Kid[] = [];
  if (Array.isArray((data as any).children) && typeof (data as any).children[0] === "object") {
    kids = ((data as any).children as any[])
      .filter(k => k && typeof k.name === "string" && k.name.trim())
      .map(k => ({ name: k.name.trim(), age: Number(k.age) || 0 }));
  } else if (Array.isArray((data as any).kids)) {
    kids = ((data as any).kids as any[])
      .filter(k => k && typeof k.name === "string" && k.name.trim())
      .map(k => ({ name: k.name.trim(), age: Number(k.age) || 0 }));
  }

  const hasChildren =
    (typeof (data as any).hasChildren === "boolean" ? (data as any).hasChildren : undefined) ??
    (typeof (data as any).children === "number" ? (data as any).children > 0 : undefined) ??
    (kids.length > 0);

  const item = {
    id: uid(),
    ts: new Date().toISOString(),
    name: name.trim(),
    hasChildren: !!hasChildren,
    children: kids,
  };

  await env.RSVP.put(key(item.id), JSON.stringify(item));
  return json({ ok: true, id: item.id });
}

async function handleGet(request: Request, env: Env) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return bad("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") || undefined;

  const { keys, list_complete, cursor: next } = await env.RSVP.list({ prefix: "rsvp:", cursor });
  const items = [];
  for (const k of keys) {
    const v = await env.RSVP.get(k.name);
    if (v) items.push(JSON.parse(v));
  }

  return json({ ok: true, items, list_complete, cursor: next });
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (method === "POST") {
    return handlePost(request, env);
  }
  if (method === "GET") {
    return handleGet(request, env);
  }

  return bad("Method Not Allowed", 405);
};
