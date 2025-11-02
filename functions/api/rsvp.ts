// functions/api/rsvp.ts
// Endpoints:
//  POST /api/rsvp                       -> grava confirmação
//  GET  /api/rsvp?list=1               -> lista (admin)
//  GET  /api/rsvp/export?format=csv|json (admin)
//  POST /api/rsvp/clear?confirm=YES    -> limpa tudo (admin)
// Suporta Authorization: Bearer <ADMIN_TOKEN> ou ?key=<ADMIN_TOKEN>

interface Bindings {
  RSVP: KVNamespace;
  ADMIN_TOKEN: string;
}

type Kid = { name?: string; age?: number };
type Details = { companion?: { name?: string } | null; kids?: Kid[] };

type Item = {
  id: string;
  ts: string;
  name: string;
  attending: boolean;
  adults: number;
  children: number;
  phone?: string;
  message?: string;
  ip?: string;
  ua?: string;
  details?: Details;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export const onRequest: PagesFunction<Bindings> = async (ctx) => {
  const { request, env } = ctx;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  const isAdmin = (req: Request) => {
    const h = req.headers.get('Authorization') || '';
    const bearer = h.startsWith('Bearer ') ? h.slice(7) : '';
    const key = url.searchParams.get('key') || '';
    return !!env.ADMIN_TOKEN && (bearer === env.ADMIN_TOKEN || key === env.ADMIN_TOKEN);
  };

  // ---------- EXPORT ----------
  if (path.endsWith('/export')) {
    if (!isAdmin(request)) return new Response('Unauthorized', { status: 401, headers: CORS });
    const format = (url.searchParams.get('format') || 'csv').toLowerCase();
    const list = await loadAll(env);
    if (format === 'json') {
      return json(list);
    }
    // CSV
    const rows = [
      [
        'id','ts','name','attending','adults','children',
        'companion','companion_name','kids_count','kids_details','phone','message','ip','ua'
      ].join(';')
    ];
    for (const r of list) {
      const companion = !!(r.details?.companion?.name);
      const compName = r.details?.companion?.name || '';
      const kids = r.details?.kids || [];
      const kidsStr = kids.map(k => `${(k.name||'').replace(/;/g,',')} (${Number(k.age)||0})`).join(' | ');
      rows.push([
        r.id, r.ts, safe(r.name), String(!!r.attending), r.adults, r.children,
        companion ? 'yes' : 'no', safe(compName), kids.length, safe(kidsStr),
        safe(r.phone||''), safe(r.message||''), r.ip||'', (r.ua||'').replace(/;/g,',')
      ].join(';'));
    }
    return new Response(rows.join('\n'), {
      headers: { ...CORS, 'Content-Type': 'text/csv; charset=utf-8' },
    });
  }

  // ---------- CLEAR ----------
  if (path.endsWith('/clear')) {
    if (!isAdmin(request)) return new Response('Unauthorized', { status: 401, headers: CORS });
    const ok = (url.searchParams.get('confirm') || '') === 'YES';
    if (!ok) return new Response('Missing confirm=YES', { status: 400, headers: CORS });
    const keys = await env.RSVP.list({ prefix: 'rsvp:' });
    await Promise.all(keys.keys.map(k => env.RSVP.delete(k.name)));
    return json({ ok: true, cleared: keys.keys.length });
  }

  // ---------- LIST ----------
  if (request.method === 'GET' && url.searchParams.get('list') === '1') {
    if (!isAdmin(request)) return new Response('Unauthorized', { status: 401, headers: CORS });
    const list = await loadAll(env);
    return json(list);
  }

  // ---------- CREATE ----------
  if (request.method === 'POST') {
    let data: any;
    try { data = await request.json(); } catch { return bad('invalid json'); }

    const name = str(data.name);
    if (!name || name.length < 2) return bad('nome inválido');

    // normaliza detalhes:
    const withComp = !!data.withCompanion || !!(data.details?.companion);
    const companionName = str(data.companionName || data.details?.companion?.name);
    const kids: Kid[] = Array.isArray(data.kids || data.details?.kids) ? (data.kids || data.details?.kids) : [];
    const cleanKids = kids
      .map((k: any) => ({ name: str(k.name), age: num(k.age) }))
      .filter(k => !!k.name);

    const adults = Math.max(1, Number(data.adults ?? (1 + (withComp ? 1 : 0))) | 0);
    const children = Number.isFinite(data.children) ? Number(data.children) | 0 : cleanKids.length;

    const item: Item = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      name,
      attending: !!data.attending,
      adults,
      children,
      phone: str(data.phone),
      message: str(data.message),
      ip: ctx.request.headers.get('cf-connecting-ip') || undefined,
      ua: ctx.request.headers.get('user-agent') || undefined,
      details: {
        companion: withComp ? { name: companionName } : null,
        kids: cleanKids
      }
    };

    await env.RSVP.put(`rsvp:${item.id}`, JSON.stringify(item), { metadata: { ts: item.ts, name: item.name } });
    return json({ ok: true, id: item.id });
  }

  return new Response('Not found', { status: 404, headers: CORS });
};

// ---------- helpers ----------
const json = (o: any) => new Response(JSON.stringify(o), { headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
const bad  = (m: string) => new Response(JSON.stringify({ ok: false, error: m }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
const str = (v: any) => (typeof v === 'string' ? v.trim() : '');
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const safe = (s: string) => (s||'').replace(/\r?\n/g,' ').replace(/;/g,',');

async function loadAll(env: Bindings) {
  const page = await env.RSVP.list({ prefix: 'rsvp:' });
  const values = await Promise.all(page.keys.map(async k => {
    try { return JSON.parse((await env.RSVP.get(k.name)) || '{}'); } catch { return null; }
  }));
  return values.filter(Boolean) as Item[];
}
