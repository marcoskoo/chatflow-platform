import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { formatDocNumber, DOC_FACTURA, DOC_BOLETA, DOC_NOTA_CREDITO, DOC_NOTA_DEBITO } from '@/lib/sunat'

export const runtime = 'nodejs'

const DOC_NAMES: Record<string, string> = {
  [DOC_FACTURA]: 'FACTURA ELECTRÓNICA',
  [DOC_BOLETA]: 'BOLETA DE VENTA ELECTRÓNICA',
  [DOC_NOTA_CREDITO]: 'NOTA DE CRÉDITO ELECTRÓNICA',
  [DOC_NOTA_DEBITO]: 'NOTA DE DÉBITO ELECTRÓNICA',
}

/**
 * GET /api/sunat/documents/[id]/pdf
 *
 * Returns an HTML printable representation of the SUNAT document with a
 * `Content-Type: text/html` and a `window.print()` onload script. Users can
 * "Save as PDF" directly from the browser. This avoids pulling a heavy PDF
 * rendering dependency while still producing a print-ready voucher that
 * conforms visually to SUNAT format.
 *
 * For production use a server-side PDF generator (puppeteer / pdfkit) and
 * return `application/pdf`.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const { id } = await params
  const doc = await db.sunatDocument.findUnique({
    where: { id },
    include: { customerTaxInfo: true },
  })
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const items = JSON.parse(doc.items)
  const issuer = {
    ruc: process.env.SUNAT_ISSUER_RUC || '',
    razonSocial: process.env.SUNAT_ISSUER_RAZON_SOCIAL || '',
    address: process.env.SUNAT_ISSUER_DIRECCION || '',
    departamento: process.env.SUNAT_ISSUER_DEPARTAMENTO || '',
    provincia: process.env.SUNAT_ISSUER_PROVINCIA || '',
    distrito: process.env.SUNAT_ISSUER_DISTRITO || '',
  }
  const docNumber = formatDocNumber(doc.serie, doc.correlativo)
  const docName = DOC_NAMES[doc.tipoDocumento] || 'COMPROBANTE'
  const fecha = doc.fechaEmision.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const itemsRows = items
    .map(
      (it: any, idx: number) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${escapeHtml(it.descripcion)}</td>
        <td class="num">${Number(it.cantidad).toFixed(2)}</td>
        <td class="num">S/ ${Number(it.precioUnitario).toFixed(2)}</td>
        <td class="num">S/ ${Number(it.total || Number(it.cantidad) * Number(it.precioUnitario)).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${docName} ${docNumber}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', serif;
    margin: 0;
    padding: 24px;
    color: #1a1a1a;
    font-size: 12px;
  }
  .voucher { max-width: 800px; margin: 0 auto; border: 1px solid #ccc; padding: 24px; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 12px;
  }
  .header .issuer h1 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; }
  .header .issuer p { margin: 2px 0; font-size: 11px; }
  .header .doc-box {
    border: 2px solid #1a1a1a;
    padding: 8px 16px;
    text-align: center;
    min-width: 200px;
  }
  .header .doc-box h2 {
    margin: 0;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .header .doc-box .doc-number {
    font-size: 18px;
    font-weight: bold;
    margin-top: 4px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin: 16px 0;
    font-size: 11px;
  }
  .info-grid div { padding: 2px 0; }
  .info-grid .label { color: #666; display: inline-block; min-width: 100px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 11px;
  }
  th {
    background: #f0f0f0;
    border: 1px solid #ccc;
    padding: 6px;
    text-align: left;
    font-weight: bold;
  }
  td {
    border: 1px solid #ccc;
    padding: 6px;
  }
  td.num, th.num { text-align: right; }
  .totals {
    margin-left: auto;
    width: 280px;
    font-size: 12px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dotted #ccc;
  }
  .totals .row.grand {
    font-weight: bold;
    font-size: 14px;
    border-top: 2px solid #1a1a1a;
    border-bottom: 2px solid #1a1a1a;
    margin-top: 8px;
    padding: 8px 0;
  }
  .legend {
    margin-top: 24px;
    padding: 8px;
    background: #fafafa;
    border-left: 3px solid #888;
    font-size: 10px;
  }
  .status {
    display: inline-block;
    padding: 4px 12px;
    background: #f0f9ff;
    border: 1px solid #0284c7;
    color: #0c4a6e;
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status.enviado { background: #ecfdf5; border-color: #059669; color: #064e3b; }
  .status.aceptado { background: #ecfdf5; border-color: #059669; color: #064e3b; }
  .status.rechazado { background: #fef2f2; border-color: #dc2626; color: #7f1d1d; }
  .status.anulado { background: #f3f4f6; border-color: #6b7280; color: #1f2937; }
  @media print {
    body { padding: 0; }
    .voucher { border: none; max-width: none; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="voucher">
  <div class="header">
    <div class="issuer">
      <h1>${escapeHtml(issuer.razonSocial)}</h1>
      <p>RUC: ${escapeHtml(issuer.ruc)}</p>
      <p>${escapeHtml(issuer.address)}</p>
      <p>${escapeHtml(issuer.distrito)}, ${escapeHtml(issuer.provincia)}, ${escapeHtml(issuer.departamento)}</p>
    </div>
    <div class="doc-box">
      <h2>${docName}</h2>
      <div>R.U.C. ${escapeHtml(issuer.ruc)}</div>
      <div class="doc-number">${docNumber}</div>
      <div style="margin-top: 6px"><span class="status ${doc.estado}">${doc.estado.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div><span class="label">Señor(es):</span> ${escapeHtml(doc.customerName)}</div>
    <div><span class="label">Fecha emisión:</span> ${fecha}</div>
    <div><span class="label">Doc. Identidad:</span> ${escapeHtml(doc.customerDocType === '6' ? 'RUC' : doc.customerDocType === '1' ? 'DNI' : 'Otro')} ${escapeHtml(doc.customerDocNumber)}</div>
    <div><span class="label">Moneda:</span> ${escapeHtml(doc.moneda)}</div>
    ${doc.customerAddress ? `<div style="grid-column: 1 / -1"><span class="label">Dirección:</span> ${escapeHtml(doc.customerAddress)}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="num" style="width: 30px">#</th>
        <th>Descripción</th>
        <th class="num" style="width: 80px">Cantidad</th>
        <th class="num" style="width: 110px">P. Unit.</th>
        <th class="num" style="width: 110px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Op. Gravadas:</span><span>S/ ${Number(doc.totalGravada).toFixed(2)}</span></div>
    ${Number(doc.totalExonerada) > 0 ? `<div class="row"><span>Op. Exoneradas:</span><span>S/ ${Number(doc.totalExonerada).toFixed(2)}</span></div>` : ''}
    ${Number(doc.totalInafecta) > 0 ? `<div class="row"><span>Op. Inafectas:</span><span>S/ ${Number(doc.totalInafecta).toFixed(2)}</span></div>` : ''}
    ${Number(doc.totalGratuita) > 0 ? `<div class="row"><span>Op. Gratuitas:</span><span>S/ ${Number(doc.totalGratuita).toFixed(2)}</span></div>` : ''}
    <div class="row"><span>IGV (18%):</span><span>S/ ${Number(doc.totalIgv).toFixed(2)}</span></div>
    <div class="row grand"><span>TOTAL:</span><span>S/ ${Number(doc.total).toFixed(2)}</span></div>
  </div>

  ${doc.sunatDescription ? `<div class="legend"><strong>SUNAT:</strong> ${escapeHtml(doc.sunatDescription)}<br>${doc.sunatTicket ? `<strong>Ticket:</strong> ${escapeHtml(doc.sunatTicket)}` : ''}</div>` : ''}

  <div class="no-print" style="margin-top: 24px; text-align: center;">
    <button onclick="window.print()" style="padding: 8px 24px; background: #1a1a1a; color: white; border: none; cursor: pointer; font-size: 12px;">Imprimir / Guardar como PDF</button>
  </div>
</div>
<script>
  // Auto-open print dialog after load
  // window.onload = () => setTimeout(() => window.print(), 300);
</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
