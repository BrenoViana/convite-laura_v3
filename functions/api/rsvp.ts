/// <reference types="@cloudflare/workers-types" />

// Tipos do ambiente (bindings configurados no Cloudflare Pages)
interface Env {
  RSVP: KVNamespace;          // KV mapeado para "convite-rsvp"
  ADMIN_TOKEN: string;        // Variável de texto com o token de admin
}

// Modelo salvo no KV
interface StoredRsvp {
  id: string;
  ts: string;
  name: string;
  attending: boolean;
  adults: number;
  hasCompanion?: boolean;
  companionName?: string;
  hasChildren?: boolean;
  children?: { name: string; age: number }[] | number;
  phone?: string;
  message?: string;
  ip?: string;
  ua?: string;
}

// Utilitários
const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });

function notAuthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Bearer realm="RSVP Admin"' },
  });
}

function badRequest(msg = 'Bad Request') {
  return json({ error: msg }, { status: 400 });
}

async function readBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

function getBearer(req: Request): string | null {
  const h = req.headers.get('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

async function listAll(env: Env): Promise<StoredRsvp[]> {
  const out: StoredRsvp[] = [];
  let cursor: string | undefined = undefined;

  do {
    const page = await env.RSVP.list({ prefix: 'rsvp:', cursor });
    for (const k of page.keys) {
      const raw = await env.RSVP.get(k.name);
      if (raw) {
        try {
          out.push(JSON.parse(raw) as StoredRsvp);
        } catch {
          // ignora corrompidos
        }
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // Mais recentes primeiro
  out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return out;
}

function toCSV(rows: StoredRsvp[]) {
  const escape = (s: unknown) => {
    const v = s == null ? '' : String(s);
    return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };

  const headers = [
    'id',
    'data_hora',
    'nome',
    'presenca',
    'adultos',
    'acompanha',
    'nome_acompanhante',
    'leva_criancas',
    'criancas',
    'telefone',
    'mensagem',
    'ip',
    'ua'
  ];

  const lines = rows.map(r => {
    const kids = Array.isArray(r.children)
      ? r.children.map(k => `${k.name} (${k.age})`).join('; ')
      : (typeof r.children === 'number' ? r.children : '');

    return [
      r.id,
      r.ts,
      r.name,
      r.attending ? 'Sim' : 'Não',
      r.adults ?? 0,
      r.hasCompanion ? 'Sim' : 'Não',
      r.companionName ?? '',
      r.hasChildren ? 'Sim' : 'Não',
      kids,
      r.phone ?? '',
      r.message ?? '',
      r.ip ?? '',
      r.ua ?? ''
    ].map(escape).join(',');
  });

  return [headers.join(','), ...lines].join('\n');
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const pathname = url.pathname; // /api/rsvp, /api/rsvp/export, /api/rsvp/clear

  // Pré-flight CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      }
    });
  }

  // --------- EXPORTAÇÃO (GET /api/rsvp/export?format=json|csv) ---------
  if (method === 'GET' && pathname.endsWith('/export')) {
    const key = getBearer(request) || url.searchParams.get('key');
    if (!key || key !== env.ADMIN_TOKEN) return notAuthorized();

    const rows = await listAll(env);
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    if (format === 'csv') {
      return new Response(toCSV(rows), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="rsvp-${new Date().toISOString().slice(0,10)}.csv"`
        }
      });
    }
    return json(rows);
  }

  // --------- LIMPAR (POST /api/rsvp/clear?confirm=YES) -----------------
  if (method === 'POST' && pathname.endsWith('/clear')) {
    const key = getBearer(request) || url.searchParams.get('key');
    if (!key || key !== env.ADMIN_TOKEN) return notAuthorized();
    if (url.searchParams.get('confirm') !== 'YES') return badRequest('confirmação ausente');

    // apaga todos os rsvp:*
    let cursor: string | undefined = undefined;
    do {
      const page = await env.RSVP.list({ prefix: 'rsvp:', cursor });
      await Promise.all(page.keys.map(k => env.RSVP.delete(k.name)));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    return json({ ok: true, cleared: true });
  }

  // --------- LISTAGEM ADMIN (GET /api/rsvp?list=1) ---------------------
  if (method === 'GET' && url.searchParams.get('list') === '1') {
    const key = getBearer(request) || url.searchParams.get('key');
    if (!key || key !== env.ADMIN_TOKEN) return notAuthorized();
    const rows = await listAll(env);
    return json(rows);
  }

  // --------- CRIAÇÃO (POST /api/rsvp) ----------------------------------
  if (method === 'POST') {
    type ClientPayload = {
      name?: string;
      attending?: boolean;
      adults?: number;
      hasCompanion?: boolean;
      companionName?: string;
      hasChildren?: boolean;
      children?: { name: string; age: number }[] | number;
      phone?: string;
      message?: string;
    };

    const body = await readBody<ClientPayload>(request);
    if (!body) return badRequest('JSON inválido');

    const name = (body.name || '').trim();
    if (!name) return badRequest('Nome é obrigatório');

    const id = crypto.randomUUID();
    const item: StoredRsvp = {
      id,
      ts: new Date().toISOString(),
      name,
      attending: !!body.attending,
      adults: Number(body.adults ?? 0),
      hasCompanion: !!body.hasCompanion,
      companionName: body.companionName?.trim() || undefined,
      hasChildren: !!body.hasChildren,
      children: Array.isArray(body.children) || typeof body.children === 'number' ? body.children : undefined,
      phone: body.phone?.trim() || undefined,
      message: body.message?.trim() || undefined,
      ip: request.headers.get('cf-connecting-ip') || undefined,
      ua: request.headers.get('user-agent') || undefined
    };

    await env.RSVP.put(`rsvp:${id}`, JSON.stringify(item), { expirationTtl: 60 * 60 * 24 * 365 }); // 1 ano

    return json({ ok: true, id }, { status: 200 });
  }

  // Qualquer outro método/rota
  return new Response('Not found', { status: 404 });
};
