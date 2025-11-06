// Cloudflare Pages Functions - /api/rsvp.csv
// Exporta CSV com Authorization: Bearer <ADMIN_TOKEN>

export interface Env {
  RSVP: KVNamespace;     // binding do KV
  ADMIN_TOKEN?: string;  // secret
}

const PREFIX = "rsvp:";

function csvCell(s: unknown) {
  if (s == null) return "";
  const t = String(s);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows: string[] = [];
  rows.push("ts,name,hasChildren,childrenCount,children");

  let cursor: string | undefined;
  do {
    const page = await env.RSVP.list({ prefix: PREFIX, cursor });
    cursor = page.cursor;

    for (const k of page.keys) {
      const txt = await env.RSVP.get(k.name);
      if (!txt) continue;
      const r = JSON.parse(txt);
      rows.push([
        csvCell(r.ts),
        csvCell(r.name),
        csvCell(r.hasChildren ? "yes" : "no"),
        csvCell(Array.isArray(r.children) ? r.children.length : 0),
        csvCell(Array.isArray(r.children) ? r.children.map((c: any) => `${c.name}(${c.age})`).join("; ") : ""),
      ].join(","));
    }
  } while (cursor);

  return new Response(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"rsvp.csv\"",
      "access-control-allow-origin": "*",
    },
  });
};

// OPTIONS (CORS) opcional
export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Content-Type, Authorization",
      "access-control-allow-methods": "GET,OPTIONS",
    },
  });
