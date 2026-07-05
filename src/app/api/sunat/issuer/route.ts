import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/issuer
 *
 * Returns the public SUNAT issuer info (emisor). Sensitive fields are
 * masked. Used by the dashboard to show "Datos del emisor" panel.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      ruc: process.env.SUNAT_ISSUER_RUC || null,
      razonSocial: process.env.SUNAT_ISSUER_RAZON_SOCIAL || null,
      nombreComercial: process.env.SUNAT_ISSUER_NOMBRE_COMERCIAL || null,
      address: process.env.SUNAT_ISSUER_DIRECCION || null,
      departamento: process.env.SUNAT_ISSUER_DEPARTAMENTO || null,
      provincia: process.env.SUNAT_ISSUER_PROVINCIA || null,
      distrito: process.env.SUNAT_ISSUER_DISTRITO || null,
      ubigeo: process.env.SUNAT_ISSUER_UBIGEO || null,
      senderUrl: process.env.SUNAT_SENDER_URL ? '(configurado)' : null,
    },
  })
}
