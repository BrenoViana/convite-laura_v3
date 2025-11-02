# Setup-RSVP-Clean.ps1
$ErrorActionPreference = "Stop"
$root = Get-Location

function Ensure-Dir($p){ $d=Split-Path -Parent $p; if($d -and -not (Test-Path $d)){ New-Item -ItemType Directory -Force $d | Out-Null } }
function Write-NoBom($p,$t){ Ensure-Dir $p; $enc = New-Object System.Text.UTF8Encoding($false); [IO.File]::WriteAllText($p,$t,$enc) }

# ------------ 1) Cloudflare Pages Functions (KV) ------------
$rsvpTs = @'
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
'@
Write-NoBom "$root/functions/api/rsvp.ts" $rsvpTs

$rsvpCsvTs = @'
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
'@
Write-NoBom "$root/functions/api/rsvp.csv.ts" $rsvpCsvTs

# ------------ 2) Angular service + component ------------
$rsvpService = @'
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

export type RsvpPayload = {
  name: string;
  attending: boolean;
  adults?: number;
  children?: number;
  phone?: string;
  message?: string;
};

@Injectable({ providedIn: "root" })
export class RsvpService {
  constructor(private http: HttpClient) {}
  submit(data: RsvpPayload) {
    return this.http.post<{ ok: boolean; id: string }>("/api/rsvp", data);
  }
}
'@
Write-NoBom "$root/src/app/services/rsvp.service.ts" $rsvpService

$rsvpBlockTs = @'
import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { RsvpService } from "../../services/rsvp.service";

@Component({
  selector: "app-rsvp-block",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: "./rsvp-block.component.html",
  styleUrls: ["./rsvp-block.component.scss"],
})
export class RsvpBlockComponent {
  @Output() close = new EventEmitter<void>();
  sending = false; ok = false; err = "";

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    attending: [true, Validators.required],
    adults: [1],
    children: [0],
    phone: [""],
    message: [""],
  });

  constructor(private fb: FormBuilder, private rsvp: RsvpService) {}

  send() {
    this.ok = false; this.err = "";
    if (this.form.invalid) return;
    this.sending = true;
    this.rsvp.submit(this.form.value as any).subscribe({
      next: () => { this.sending = false; this.ok = true; },
      error: () => { this.sending = false; this.err = "Falha ao enviar. Tente novamente."; },
    });
  }
  closeModal(){ this.close.emit(); }
}
'@
Write-NoBom "$root/src/app/components/rsvp-block/rsvp-block.component.ts" $rsvpBlockTs

$rsvpBlockHtml = @'
<section class="rsvp-card" role="dialog" aria-modal="true" aria-label="Lista de presença">
  <button class="x" type="button" (click)="closeModal()" aria-label="Fechar">×</button>
  <h2>Confirme sua presença</h2>

  <form [formGroup]="form" (ngSubmit)="send()">
    <label class="field">
      <span>Nome *</span>
      <input formControlName="name" required placeholder="Seu nome completo" />
    </label>

    <div class="row">
      <label class="radio">
        <input type="radio" formControlName="attending" [value]="true" />
        Vou! 🎉
      </label>
      <label class="radio">
        <input type="radio" formControlName="attending" [value]="false" />
        Não vou 😢
      </label>
    </div>

    <div class="row">
      <label class="field">
        <span>Adultos</span>
        <input type="number" min="0" formControlName="adults" />
      </label>
      <label class="field">
        <span>Crianças</span>
        <input type="number" min="0" formControlName="children" />
      </label>
    </div>

    <label class="field">
      <span>Telefone</span>
      <input formControlName="phone" placeholder="(xx) xxxxx-xxxx" />
    </label>

    <label class="field">
      <span>Recado</span>
      <textarea formControlName="message" rows="3" placeholder="Mensagem opcional"></textarea>
    </label>

    <button type="submit" [disabled]="form.invalid || sending">
      {{ sending ? 'Enviando...' : 'Enviar confirmação' }}
    </button>

    <p class="ok" *ngIf="ok">Recebido, obrigado! 💗</p>
    <p class="err" *ngIf="err">{{ err }}</p>
  </form>
</section>
'@
Write-NoBom "$root/src/app/components/rsvp-block/rsvp-block.component.html" $rsvpBlockHtml

$rsvpBlockScss = @'
$ruby: #6a2240;
$petal: #ffd3df;

.rsvp-card {
  position: relative;
  margin: 0 auto;
  padding: 18px;
  width: min(92vw, 620px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0,0,0,.12);
  border: 1px solid #f3c7d3;

  .x {
    position: absolute; top: 8px; right: 10px;
    width: 36px; height: 36px; border-radius: 50%;
    border: 0; cursor: pointer; background: $petal; color: $ruby;
    font-size: 22px; line-height: 1;
  }

  h2 { margin: 4px 0 12px; color: $ruby; font-weight: 800; text-align: center; }

  form {
    display: grid; gap: 12px;

    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .field {
      display: grid; gap: 6px;
      span { font-weight: 600; color: $ruby; }
      input, textarea {
        padding: 10px 12px; border-radius: 12px;
        border: 1px solid #e6c1cc; outline: none;
        transition: box-shadow .2s, border-color .2s;
        &:focus { border-color: #d77f99; box-shadow: 0 0 0 3px rgba(255,211,223,.6); }
      }
    }

    .radio {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border: 1px solid #e6c1cc; border-radius: 12px;
      background: #fff7fa; color: $ruby;
      input { transform: scale(1.15); }
    }

    button {
      padding: 12px 16px; border: 0; border-radius: 999px; cursor: pointer;
      background: $petal; color: $ruby; font-weight: 800;
      transition: transform .05s ease-in;
      &:active { transform: scale(.98); }
      &:disabled { opacity: .6; cursor: not-allowed; }
    }

    .ok { color: #2f8f3f; font-weight: 700; text-align: center; }
    .err { color: #b00020; font-weight: 700; text-align: center; }
  }
}
'@
Write-NoBom "$root/src/app/components/rsvp-block/rsvp-block.component.scss" $rsvpBlockScss

# ------------ 3) Host independente (não altera seu layout) ------------
$rsvpHostTs = @'
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { RsvpBlockComponent } from "./components/rsvp-block/rsvp-block.component";

@Component({
  selector: "rsvp-host",
  standalone: true,
  imports: [CommonModule, HttpClientModule, RsvpBlockComponent],
  template: `
    <button class="rsvp-fab" type="button" (click)="open()">Lista de presença</button>

    <div class="overlay" *ngIf="openModal" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <app-rsvp-block (close)="close()"></app-rsvp-block>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0 auto auto 0; pointer-events: none; }
    .rsvp-fab {
      position: fixed; right: 16px; bottom: 16px;
      pointer-events: auto;
      padding: 12px 16px; border-radius: 999px; border: 0; cursor: pointer;
      background: #ffd3df; color: #6a2240; font-weight: 800; box-shadow: 0 8px 20px rgba(0,0,0,.15);
    }
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35);
      display: grid; place-items: center; z-index: 9999; pointer-events: auto;
    }
    .modal { width: min(96vw, 720px); }
  `],
})
export class RsvpHostComponent {
  openModal = false;
  open() { this.openModal = true; }
  close() { this.openModal = false; }
}
'@
Write-NoBom "$root/src/app/rsvp-host.component.ts" $rsvpHostTs

# ------------ 4) Index e main para montar o host ------------
# adiciona <rsvp-host></rsvp-host> ao index.html (se não existir)
$idx = Get-Content "$root/src/index.html" -Raw
if ($idx -notmatch "<rsvp-host") {
  $idx = $idx -replace "(</body>)", "  <rsvp-host></rsvp-host>`r`n$1"
  Write-NoBom "$root/src/index.html" $idx
}

# adapta main.ts para bootstraps duplos
$mainTs = @'
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { RsvpHostComponent } from "./app/rsvp-host.component";

bootstrapApplication(AppComponent).catch(err => console.error(err));
bootstrapApplication(RsvpHostComponent).catch(err => console.error(err));
'@
Write-NoBom "$root/src/main.ts" $mainTs

# ------------ 5) Proxy local (opcional) ------------
$proxy = @'
{
  "/api": {
    "target": "https://SEU_DOMINIO_DO_PAGES.pages.dev",
    "secure": true,
    "changeOrigin": true
  }
}
'@
Write-NoBom "$root/proxy.local.json" $proxy

# ------------ 6) Git commit ------------
git add functions/ src/app/services/rsvp.service.ts src/app/components/rsvp-block/* src/app/rsvp-host.component.ts src/index.html src/main.ts proxy.local.json 2>$null
git commit -m "feat(rsvp): botão 'Lista de presença' + formulário com Cloudflare KV" 2>$null | Out-Null
Write-Host "`n✓ Arquivos criados/atualizados. Agora:" -f Green
Write-Host "1) Configure no Cloudflare Pages: KV binding 'RSVP' e variável 'ADMIN_TOKEN' (Environment > Functions)." -f Yellow
Write-Host "2) Para rodar local apontando para produção: ng serve --proxy-config proxy.local.json" -f Yellow
Write-Host "3) Para testar POST local (com proxy): curl -X POST http://localhost:4200/api/rsvp -H 'Content-Type: application/json' -d '{`"name`":`"Teste`",`"attending`":true}'" -f Yellow
