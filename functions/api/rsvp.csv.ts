export interface Env {
  RSVP: KVNamespace;
  ADMIN_TOKEN: string;
}
const PREFIX = "rsvp:";
export const onRequest: PagesFunction<Env> = async ({ env, request }) => {
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return new Response("Unauthorized", { status: 401 });

  const keys = await env.RSVP.list({ prefix: PREFIX });
  const rows: string[] = [];
  rows.push("ts,name,attending,adults,children,phone,message");

  for (const k of keys.keys) {
    const txt = await env.RSVP.get(k.name);
    if (!txt) continue;
    const e = JSON.parse(txt);
    rows.push([
      csv(e.ts), csv(e.name), e.attending ? "yes" : "no", e.adults ?? "", e.children ?? "", csv(e.phone ?? ""), csv(e.message ?? "")
    ].join(","));
  }
  const body = rows.join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"rsvp.csv\"",
    },
  });
};
function csv(s: string) {
  if (s == null) return "";
  s = String(s);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}