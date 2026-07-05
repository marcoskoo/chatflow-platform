#!/usr/bin/env tsx
/**
 * scripts/send-test-event.ts
 *
 * Dispara un evento de Stripe firmado localmente para probar el webhook
 * /api/stripe/webhook sin necesidad del Stripe CLI.
 *
 * Útil cuando quieres probar el flujo completo (checkout → invoice paid →
 * actualización de Subscription local) en tu entorno de desarrollo.
 *
 * Requisitos:
 *   - STRIPE_SECRET_KEY válida
 *   - STRIPE_WEBHOOK_SECRET (whsec_...) — obtén la correcta de tu endpoint
 *     con `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 *
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_xxx \
 *   STRIPE_WEBHOOK_SECRET=whsec_xxx \
 *   npx tsx scripts/send-test-event.ts checkout.session.completed
 *
 * Eventos soportados:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */
import Stripe from 'stripe'

const apiKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/stripe/webhook'
const eventType = process.argv[2]

if (!apiKey || !webhookSecret) {
  console.error('✗ Faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET en el entorno.')
  process.exit(1)
}
if (!eventType) {
  console.error('✗ Indica el tipo de evento. Ej: checkout.session.completed')
  process.exit(1)
}

const stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' as any })

async function buildEvent(type: string): Promise<Stripe.Event> {
  const ts = Math.floor(Date.now() / 1000)
  switch (type) {
    case 'checkout.session.completed': {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_PRO_MONTHLY || '', quantity: 1 }],
        success_url: 'http://localhost:3000/?billing=success',
        cancel_url: 'http://localhost:3000/?billing=cancel',
        metadata: { planId: 'pro', customerId: 'cust_test_local' },
      }, { api_key: apiKey })
      // Retrieve the session expanded
      const expanded = await stripe.checkout.sessions.retrieve(session.id)
      return {
        id: `evt_test_${ts}`,
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: ts,
        type: 'checkout.session.completed',
        data: { object: expanded as any },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      } as Stripe.Event
    }
    case 'invoice.payment_succeeded': {
      // Fabrica un invoice de ejemplo sin llamar a Stripe
      return {
        id: `evt_test_${ts}`,
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: ts,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: `in_test_${ts}`,
            object: 'invoice',
            customer: 'cus_test_local',
            subscription: 'sub_test_local',
            total: 4900,
            currency: 'usd',
            status: 'paid',
            paid: true,
            invoice_pdf: 'https://example.com/invoice.pdf',
            hosted_invoice_url: 'https://example.com/invoice',
          } as any,
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      } as Stripe.Event
    }
    default: {
      // Genera un evento minimal
      return {
        id: `evt_test_${ts}`,
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: ts,
        type,
        data: { object: { id: `id_test_${ts}` } as any },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      } as Stripe.Event
    }
  }
}

async function main() {
  const event = await buildEvent(eventType)
  const payload = JSON.stringify(event)

  // Firma el payload con el webhook secret
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  })

  console.log(`→ POST ${webhookUrl}  (event: ${eventType})`)
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  })
  const body = await res.text()
  console.log(`← ${res.status} ${res.statusText}`)
  console.log(body)
}

main().catch((e) => {
  console.error('✗ Error:', e)
  process.exit(1)
})
