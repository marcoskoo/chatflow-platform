#!/usr/bin/env tsx
/**
 * scripts/setup-stripe.ts
 *
 * Configura automáticamente los productos y precios en Stripe para los
 * planes Pro y Business de ChatFlow, con frecuencias mensual y anual.
 *
 * Requisitos:
 *   - Variable de entorno STRIPE_SECRET_KEY con valor válido (sk_test_... o sk_live_...)
 *   - tsx instalado: `npm i -g tsx` o usar `npx tsx`
 *
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe.ts
 *
 * Salida:
 *   - Crea (o reutiliza) productos "ChatFlow Pro" y "ChatFlow Business"
 *   - Crea 4 precios (pro mensual, pro anual, business mensual, business anual)
 *   - Imprime los price_XXX para que los copies a tu .env
 *   - Opcional: con --write actualiza el .env directamente
 */
import Stripe from 'stripe'

const apiKey = process.env.STRIPE_SECRET_KEY
if (!apiKey) {
  console.error('✗ Falta STRIPE_SECRET_KEY en el entorno.')
  console.error('  Ejecuta: STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe.ts')
  process.exit(1)
}

const stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' as any })

// ─── Definición de planes (debe coincidir con src/lib/stripe.ts) ───────────
const PLANS = [
  {
    id: 'pro',
    name: 'ChatFlow Pro',
    description: 'Plan Pro — equipos pequeños en crecimiento (5 bots, todos los canales, plantillas HSM)',
    monthly: 4900, // $49.00 USD
    annual: 47000, // $470.00 USD (aprox 2 meses gratis)
  },
  {
    id: 'business',
    name: 'ChatFlow Business',
    description: 'Plan Business — empresas con alto volumen (bots ilimitados, white label, SLA 99.9%)',
    monthly: 14900, // $149.00 USD
    annual: 143000, // $1,430.00 USD
  },
] as const

const CURRENCY = 'usd'

async function findOrCreateProduct(name: string, description: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `name:'${name}'`,
    limit: 1,
  })
  if (existing.data.length > 0) {
    console.log(`✓ Producto existente: ${name} (${existing.data[0].id})`)
    return existing.data[0]
  }
  const product = await stripe.products.create({ name, description })
  console.log(`+ Producto creado:   ${name} (${product.id})`)
  return product
}

async function findOrCreatePrice(
  product: Stripe.Product,
  unitAmount: number,
  interval: 'month' | 'year',
  nickname: string
): Promise<Stripe.Price> {
  // Busca un precio activo existente para este producto, monto e intervalo
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    type: 'recurring',
    expand: ['data.tiers'],
  })
  const existing = prices.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === CURRENCY &&
      p.recurring?.interval === interval
  )
  if (existing) {
    console.log(`  ✓ Precio existente: ${nickname} → ${existing.id} ($${(unitAmount / 100).toFixed(2)}/${interval})`)
    return existing
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: CURRENCY,
    recurring: { interval },
    nickname,
  })
  console.log(`  + Precio creado:    ${nickname} → ${price.id} ($${(unitAmount / 100).toFixed(2)}/${interval})`)
  return price
}

async function main() {
  console.log('\n=== Configuración de Stripe para ChatFlow ===\n')
  console.log(`Modo: ${apiKey.startsWith('sk_live') ? 'PRODUCCIÓN' : 'TEST'}\n`)

  const result: Record<string, string> = {}

  for (const plan of PLANS) {
    console.log(`\n— Procesando plan: ${plan.name} —`)
    const product = await findOrCreateProduct(plan.name, plan.description)

    const monthly = await findOrCreatePrice(product, plan.monthly, 'month', `${plan.name} mensual`)
    const annual = await findOrCreatePrice(product, plan.annual, 'year', `${plan.name} anual`)

    result[`STRIPE_PRICE_${plan.id.toUpperCase()}_MONTHLY`] = monthly.id
    result[`STRIPE_PRICE_${plan.id.toUpperCase()}_ANNUAL`] = annual.id
  }

  console.log('\n\n=== Resultado — copia estos valores en tu .env ===\n')
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`)
  }

  // Opcional: escribir directamente en .env
  if (process.argv.includes('--write')) {
    const fs = await import('fs/promises')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env')
    let env = ''
    try { env = await fs.readFile(envPath, 'utf8') } catch { /* no .env yet */ }

    let updated = env
    for (const [key, value] of Object.entries(result)) {
      const re = new RegExp(`^#?\\s*${key}=.*$`, 'm')
      if (re.test(updated)) {
        updated = updated.replace(re, `${key}=${value}`)
      } else {
        updated = updated.trimEnd() + `\n${key}=${value}\n`
      }
    }
    await fs.writeFile(envPath, updated)
    console.log(`\n✓ Variables escritas en ${envPath}`)
  } else {
    console.log('\nTip: agrega --write para actualizar automáticamente tu .env')
  }

  console.log('\n✓ Configuración completa.\n')
}

main().catch((e) => {
  console.error('✗ Error:', e)
  process.exit(1)
})
