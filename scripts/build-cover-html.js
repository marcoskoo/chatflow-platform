/**
 * Cover HTML for the Manual de Configuración ChatFlow.
 * Template 01 (HUD Data Terminal) — adapted for Spanish content.
 * Rendered to PDF via html2poster.js (single page, 794x1123 px = A4).
 */
const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual de Configuración ChatFlow</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --page-bg: #f6f6f5;
    --text-primary: #252421;
    --text-muted: #828078;
    --header-fill: #554e3b;
    --accent: #887129;
    --border: #dad5c7;
    --card-bg: #efeeea;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--page-bg);
    color: var(--text-primary);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  @page { size: 794px 1123px; margin: 0; }
  .poster {
    position: relative;
    width: 794px;
    height: 1123px;
    background: var(--page-bg);
    overflow: hidden;
  }
  /* Layer 1: subtle grid background */
  .grid-bg {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(to right, rgba(85,78,59,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(85,78,59,0.04) 1px, transparent 1px);
    background-size: 50px 50px;
    z-index: 1;
  }
  /* Layer 2: left anchor line */
  .anchor-line {
    position: absolute;
    left: 95px;     /* 0.12 * 794 = 95.28 */
    top: 112px;     /* 0.10 * 1123 */
    width: 6px;
    height: 899px;  /* 0.80 * 1123 */
    background: var(--header-fill);
    z-index: 2;
  }
  /* Layer 3: content */
  .content {
    position: absolute;
    left: 125px;    /* anchor + 30px */
    top: 0; right: 60px; bottom: 0;
    z-index: 3;
  }
  .kicker {
    position: absolute;
    top: 168px;     /* 0.15 * 1123 */
    left: 0;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 3px;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .kicker .dot {
    display: inline-block;
    width: 6px; height: 6px;
    background: var(--accent);
    border-radius: 50%;
    margin-right: 10px;
    vertical-align: middle;
    transform: translateY(-2px);
  }
  .hero-title {
    position: absolute;
    top: 250px;     /* near 0.22 * H, room for 3 lines */
    left: 0;
    width: 580px;
    font-size: 64px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1.5px;
    color: var(--text-primary);
  }
  .hero-title .accent {
    color: var(--accent);
    font-weight: 900;
  }
  .subtitle {
    position: absolute;
    top: 470px;     /* below hero */
    left: 0;
    width: 560px;
    font-size: 22px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--header-fill);
  }
  .summary {
    position: absolute;
    top: 580px;     /* 0.50 * H zone */
    left: 0;
    width: 560px;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.7;
    color: var(--text-primary);
    opacity: 0.85;
  }
  .summary strong {
    color: var(--accent);
    font-weight: 600;
  }
  /* Modules row */
  .modules {
    position: absolute;
    top: 760px;
    left: 0;
    display: flex;
    gap: 16px;
    width: 560px;
  }
  .module {
    flex: 1;
    background: var(--card-bg);
    border-left: 3px solid var(--accent);
    padding: 16px 18px;
    border-radius: 2px;
  }
  .module .num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .module .name {
    font-size: 15px;
    font-weight: 700;
    color: var(--header-fill);
    line-height: 1.3;
  }
  .module .desc {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    line-height: 1.4;
  }
  /* Meta block */
  .meta {
    position: absolute;
    top: 920px;     /* near 0.82 * H */
    left: 0;
    width: 560px;
  }
  .meta .row {
    display: flex;
    align-items: baseline;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .meta .row:last-child { border-bottom: 1px solid var(--border); }
  .meta .label {
    width: 140px;
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 500;
  }
  .meta .value {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }
  .meta .value.mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
  }
  /* Footer */
  .footer {
    position: absolute;
    bottom: 36px;
    left: 125px;
    right: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    z-index: 3;
  }
  .footer .brand {
    font-family: 'JetBrains Mono', monospace;
    color: var(--header-fill);
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="poster">
  <div class="grid-bg"></div>
  <div class="anchor-line"></div>
  <div class="content">
    <div class="kicker"><span class="dot"></span>MANUAL TÉCNICO · V1.0 · 2026</div>
    <h1 class="hero-title">Manual de<br>Configuración<br><span class="accent">ChatFlow</span></h1>
    <div class="subtitle">Pruebas E2E, documentación OpenAPI y facturación Stripe — lista para replicar en cualquier negocio.</div>
    <div class="summary">
      Guía paso a paso para implementar las tres piezas clave de una plataforma SaaS moderna:
      <strong>pruebas automatizadas end-to-end con Playwright</strong>,
      <strong>documentación API auto-actualizable con OpenAPI 3.1 y Scalar</strong>, y
      <strong>facturación real con Stripe</strong> (incluye el webhook y el portal de cliente).
      Pensado para replicarse en otro proyecto sin partir de cero.
    </div>
    <div class="modules">
      <div class="module">
        <div class="num">01</div>
        <div class="name">Pruebas E2E</div>
        <div class="desc">Playwright + 5 suites de pruebas listas</div>
      </div>
      <div class="module">
        <div class="num">02</div>
        <div class="name">OpenAPI / Swagger</div>
        <div class="desc">Spec 3.1 + Scalar UI + try-it-now</div>
      </div>
      <div class="module">
        <div class="num">03</div>
        <div class="name">Stripe Real</div>
        <div class="desc">Checkout, webhook, portal, invoices</div>
      </div>
    </div>
    <div class="meta">
      <div class="row">
        <div class="label">Plataforma</div>
        <div class="value">ChatFlow Platform · Next.js 16 · React 19</div>
      </div>
      <div class="row">
        <div class="label">Stack</div>
        <div class="value">PostgreSQL · Prisma · TypeScript · Stripe</div>
      </div>
      <div class="row">
        <div class="label">Audiencia</div>
        <div class="value">Equipos técnicos que quieren replicar el setup</div>
      </div>
      <div class="row">
        <div class="label">Versión doc</div>
        <div class="value mono">DOC-MAN-001 · ES · 2026-07</div>
      </div>
    </div>
  </div>
  <div class="footer">
    <span class="brand">CHATFLOW / DEVOPS</span>
    <span>CONFIDENCIAL · USO INTERNO</span>
  </div>
</div>
</body>
</html>`;

const outPath = process.argv[2] || path.join(__dirname, 'manual-cover.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Cover HTML written to:', outPath);
