import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKeyString, hashApiKey } from '@/lib/auth'

/**
 * POST /api/setup
 *
 * Idempotent bootstrap endpoint. It creates:
 *   - 1 admin API key (returned in the response — only time it's ever exposed)
 *   - 3 default teams (Soporte, Ventas, Técnico)
 *   - 4 channels (WhatsApp, Messenger, Instagram, Telegram)
 *   - 4 webhook configs (one per channel, isActive=false until user adds credentials)
 *   - 4 demo bots with rich, multi-node flows
 *
 * If any of these already exist, they are skipped (truly idempotent).
 * This endpoint is unauthenticated so the first-ever request can succeed.
 */
export async function POST(_request: NextRequest) {
  const created = {
    apiKey: null as string | null,
    teams: 0,
    channels: 0,
    webhooks: 0,
    bots: 0,
    flows: 0,
  }

  try {
    // ─── 1. Admin API key ──────────────────────────────────────────────────
    const existingKeys = await db.apiKey.count()
    if (existingKeys === 0) {
      const rawKey = generateApiKeyString()
      await db.apiKey.create({
        data: {
          name: 'Admin Master Key',
          key: hashApiKey(rawKey),
          permissions: JSON.stringify(['admin', 'read', 'write', 'webhooks']),
          isActive: true,
        },
      })
      created.apiKey = rawKey
    }

    // ─── 2. Teams ──────────────────────────────────────────────────────────
    const existingTeams = await db.team.count()
    if (existingTeams === 0) {
      await db.team.createMany({
        data: [
          { name: 'Soporte General', description: 'Equipo de soporte al cliente', members: JSON.stringify(['Ana García', 'Carlos López']), color: '#10b981' },
          { name: 'Ventas', description: 'Equipo comercial y ventas', members: JSON.stringify(['María Rodríguez', 'Pedro Sánchez']), color: '#f59e0b' },
          { name: 'Soporte Técnico', description: 'Equipo de soporte técnico avanzado', members: JSON.stringify(['Luis Martínez', 'Sofia Hernández']), color: '#8b5cf6' },
        ],
      })
      created.teams = 3
    }

    // ─── 3. Channels ───────────────────────────────────────────────────────
    const existingChannels = await db.channel.count()
    if (existingChannels === 0) {
      await db.channel.createMany({
        data: [
          { type: 'whatsapp', name: 'WhatsApp Business', connected: true, config: JSON.stringify({}) },
          { type: 'messenger', name: 'Facebook Messenger', connected: true, config: JSON.stringify({}) },
          { type: 'instagram', name: 'Instagram Direct', connected: false, config: JSON.stringify({}) },
          { type: 'telegram', name: 'Telegram Bot', connected: true, config: JSON.stringify({}) },
        ],
      })
      created.channels = 4
    }

    // ─── 4. Webhook configs (placeholders, inactive until user configures) ─
    const existingWebhooks = await db.webhookConfig.count()
    if (existingWebhooks === 0) {
      await db.webhookConfig.createMany({
        data: [
          { channel: 'whatsapp', apiVersion: 'v18.0', isActive: false },
          { channel: 'messenger', apiVersion: 'v18.0', isActive: false },
          { channel: 'instagram', apiVersion: 'v18.0', isActive: false },
          { channel: 'telegram', isActive: false },
        ],
      })
      created.webhooks = 4
    }

    // ─── 5. Demo bots with complex flows ───────────────────────────────────
    const existingBots = await db.bot.count()
    if (existingBots === 0) {
      await createDemoBots()
      created.bots = 4
      created.flows = 5
    }

    return NextResponse.json({
      success: true,
      message: created.apiKey
        ? 'Setup completed. Save the returned API key — it will not be shown again.'
        : 'Setup already completed. No new admin key was generated.',
      data: {
        apiKey: created.apiKey,
        seeded: {
          teams: created.teams,
          channels: created.channels,
          webhooks: created.webhooks,
          bots: created.bots,
          flows: created.flows,
        },
      },
    })
  } catch (error) {
    console.error('[Setup] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Setup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/setup — Returns whether setup has been run (without leaking the API key).
 */
export async function GET() {
  const keysCount = await db.apiKey.count()
  const botsCount = await db.bot.count()
  const channelsCount = await db.channel.count()
  const teamsCount = await db.team.count()

  return NextResponse.json({
    success: true,
    data: {
      isSetup: keysCount > 0,
      hasData: {
        apiKeys: keysCount,
        bots: botsCount,
        channels: channelsCount,
        teams: teamsCount,
      },
    },
  })
}

// ─── Demo bot definitions ────────────────────────────────────────────────────

async function createDemoBots() {
  // ─── Bot 1: Asistente de Ventas (e-commerce) ─────────────────────────────
  const bot1 = await db.bot.create({
    data: {
      name: 'Asistente Ventas E-commerce',
      description: 'Bot principal para automatización de ventas, catálogo y soporte de pedidos',
      status: 'active',
      channels: JSON.stringify(['whatsapp', 'messenger', 'telegram']),
    },
  })

  await db.flow.create({
    data: {
      name: 'Flujo de Bienvenida y Ventas',
      botId: bot1.id,
      isActive: true,
      trigger: JSON.stringify({ type: 'first_message' }),
      nodes: JSON.stringify([
        { id: 'n1', type: 'start', position: { x: 80, y: 200 }, data: { label: 'Inicio' } },
        { id: 'n2', type: 'message', position: { x: 320, y: 200 }, data: { label: 'Bienvenida', content: '¡Hola! 👋 Bienvenido a TiendaTech. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' } },
        { id: 'n3', type: 'buttons', position: { x: 580, y: 200 }, data: { label: 'Menú Principal', buttons: [
          { id: 'b1', text: '📦 Ver catálogo' },
          { id: 'b2', text: '🛒 Mi pedido' },
          { id: 'b3', text: '💳 Pagos' },
          { id: 'b4', text: '🗣️ Hablar con agente' },
        ] } },
        { id: 'n4', type: 'message', position: { x: 880, y: 0 }, data: { label: 'Catálogo', content: '📦 Tenemos estas categorías:\n\n💻 Laptops\n📱 Smartphones\n🎧 Audio\n⌨️ Accesorios\n\n¿Cuál te interesa?' } },
        { id: 'n5', type: 'buttons', position: { x: 1180, y: 0 }, data: { label: 'Categorías', buttons: [
          { id: 'c1', text: '💻 Laptops' },
          { id: 'c2', text: '📱 Smartphones' },
          { id: 'c3', text: '🎧 Audio' },
        ] } },
        { id: 'n6', type: 'message', position: { x: 880, y: 130 }, data: { label: 'Info Pedido', content: '🛒 Para revisar tu pedido, indícame el número (ej. #12345).' } },
        { id: 'n7', type: 'ai_response', position: { x: 1180, y: 130 }, data: { label: 'IA busca pedido', aiPrompt: 'Busca el pedido del usuario y devuelve el estado: en preparación, enviado, entregado.' } },
        { id: 'n8', type: 'message', position: { x: 880, y: 260 }, data: { label: 'Info Pagos', content: '💳 Aceptamos:\n• Tarjetas Visa/Mastercard\n• PayPal\n• Transferencia bancaria\n• Yappy / Nequi\n\n¿Necesitas ayuda con algún pago?' } },
        { id: 'n9', type: 'transfer', position: { x: 880, y: 390 }, data: { label: 'Transferir', transferTeam: 'Soporte General', transferMessage: 'Te estoy transfiriendo con un agente humano. Un momento por favor... 🙋' } },
        { id: 'n10', type: 'message', position: { x: 1480, y: 0 }, data: { label: 'Oferta Laptops', content: '💻 Laptops destacadas:\n• MacBook Air M3 — $1,299\n• Dell XPS 13 — $999\n• Lenovo ThinkPad — $849\n\n¿Quieres ver más detalles de alguna?' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'b1', label: '📦 Catálogo' },
        { id: 'e4', source: 'n3', target: 'n6', sourceHandle: 'b2', label: '🛒 Pedido' },
        { id: 'e5', source: 'n3', target: 'n8', sourceHandle: 'b3', label: '💳 Pagos' },
        { id: 'e6', source: 'n3', target: 'n9', sourceHandle: 'b4', label: '🗣️ Agente' },
        { id: 'e7', source: 'n4', target: 'n5' },
        { id: 'e8', source: 'n5', target: 'n10', sourceHandle: 'c1', label: '💻 Laptops' },
        { id: 'e9', source: 'n6', target: 'n7' },
      ]),
    },
  })

  await db.flow.create({
    data: {
      name: 'Flujo Post-Compra',
      botId: bot1.id,
      isActive: false,
      trigger: JSON.stringify({ type: 'post_purchase' }),
      nodes: JSON.stringify([
        { id: 'p1', type: 'start', position: { x: 80, y: 200 }, data: { label: 'Compra confirmada' } },
        { id: 'p2', type: 'message', position: { x: 320, y: 200 }, data: { label: 'Gracias', content: '🎉 ¡Gracias por tu compra! Tu pedido está confirmado y será procesado en las próximas 24h.' } },
        { id: 'p3', type: 'buttons', position: { x: 600, y: 200 }, data: { label: 'Encuesta', buttons: [
          { id: 'r1', text: '⭐⭐⭐⭐⭐ Excelente' },
          { id: 'r2', text: '⭐⭐⭐ Bien' },
          { id: 'r3', text: '⭐ Mejorable' },
        ] } },
        { id: 'p4', type: 'message', position: { x: 900, y: 130 }, data: { label: 'Agradecimiento', content: '🙏 ¡Gracias por tu feedback! Tu opinión nos ayuda a mejorar.' } },
        { id: 'p5', type: 'transfer', position: { x: 900, y: 260 }, data: { label: 'Transferir a Soporte', transferTeam: 'Soporte General', transferMessage: 'Lamento que tu experiencia no haya sido óptima. Te transfiero con un supervisor.' } },
      ]),
      edges: JSON.stringify([
        { id: 'pe1', source: 'p1', target: 'p2' },
        { id: 'pe2', source: 'p2', target: 'p3' },
        { id: 'pe3', source: 'p3', target: 'p4', sourceHandle: 'r1', label: '5⭐' },
        { id: 'pe4', source: 'p3', target: 'p4', sourceHandle: 'r2', label: '3⭐' },
        { id: 'pe5', source: 'p3', target: 'p5', sourceHandle: 'r3', label: '1⭐' },
      ]),
    },
  })

  // ─── Bot 2: Soporte Técnico ──────────────────────────────────────────────
  const bot2 = await db.bot.create({
    data: {
      name: 'Bot Soporte Técnico',
      description: 'Asistente especializado en soporte técnico de aplicaciones y servicios web',
      status: 'active',
      channels: JSON.stringify(['whatsapp', 'telegram']),
    },
  })

  await db.flow.create({
    data: {
      name: 'Triaje de Soporte',
      botId: bot2.id,
      isActive: true,
      trigger: JSON.stringify({ type: 'first_message' }),
      nodes: JSON.stringify([
        { id: 's1', type: 'start', position: { x: 80, y: 200 }, data: { label: 'Inicio' } },
        { id: 's2', type: 'message', position: { x: 320, y: 200 }, data: { label: 'Bienvenida', content: '🔧 Hola, soy el asistente de soporte técnico. Detectaré tu problema y te ayudaré a resolverlo.' } },
        { id: 's3', type: 'buttons', position: { x: 580, y: 200 }, data: { label: 'Tipo Problema', buttons: [
          { id: 'tp1', text: '📱 App no funciona' },
          { id: 'tp2', text: '🌐 Problema web' },
          { id: 'tp3', text: '🔑 No puedo iniciar sesión' },
          { id: 'tp4', text: '🔧 Otro' },
        ] } },
        { id: 's4', type: 'buttons', position: { x: 880, y: 0 }, data: { label: 'App Issue', buttons: [
          { id: 'a1', text: 'App se cierra sola' },
          { id: 'a2', text: 'No carga contenido' },
          { id: 'a3', text: 'Está lenta' },
        ] } },
        { id: 's5', type: 'message', position: { x: 1180, y: 0 }, data: { label: 'Reiniciar', content: '🔄 Intenta estos pasos:\n1. Cierra la app completamente\n2. Reinicia tu teléfono\n3. Abre la app de nuevo\n\n¿Funcionó?' } },
        { id: 's6', type: 'buttons', position: { x: 1480, y: 0 }, data: { label: 'Resultado', buttons: [
          { id: 'rr1', text: '✅ Sí, funcionó' },
          { id: 'rr2', text: '❌ No, sigue igual' },
        ] } },
        { id: 's7', type: 'message', position: { x: 1780, y: 0 }, data: { label: 'Cerrar', content: '¡Excelente! 👍 Si tienes más problemas, aquí estaremos. Que tengas un gran día.' } },
        { id: 's8', type: 'transfer', position: { x: 1780, y: 130 }, data: { label: 'Transferir', transferTeam: 'Soporte Técnico', transferMessage: 'Te transfiero con un especialista técnico. Un momento... 🔧' } },
        { id: 's9', type: 'ai_response', position: { x: 880, y: 260 }, data: { label: 'IA diagnostica web', aiPrompt: 'El usuario reporta un problema web. Pregunta por: navegador usado, versión, URL afectada, mensaje de error, captura de pantalla. Sugiere soluciones según el diagnóstico.' } },
        { id: 's10', type: 'message', position: { x: 880, y: 390 }, data: { label: 'Login Help', content: '🔑 Para recuperar tu acceso:\n1. Ve a "Olvidé mi contraseña"\n2. Ingresa tu email\n3. Revisa tu bandeja de entrada\n4. Sigue el enlace de reseteo\n\n¿Necesitas que te ayude con algo más?' } },
      ]),
      edges: JSON.stringify([
        { id: 'se1', source: 's1', target: 's2' },
        { id: 'se2', source: 's2', target: 's3' },
        { id: 'se3', source: 's3', target: 's4', sourceHandle: 'tp1', label: '📱 App' },
        { id: 'se4', source: 's3', target: 's9', sourceHandle: 'tp2', label: '🌐 Web' },
        { id: 'se5', source: 's3', target: 's10', sourceHandle: 'tp3', label: '🔑 Login' },
        { id: 'se6', source: 's3', target: 's8', sourceHandle: 'tp4', label: '🔧 Otro' },
        { id: 'se7', source: 's4', target: 's5' },
        { id: 'se8', source: 's5', target: 's6' },
        { id: 'se9', source: 's6', target: 's7', sourceHandle: 'rr1', label: '✅' },
        { id: 'se10', source: 's6', target: 's8', sourceHandle: 'rr2', label: '❌' },
      ]),
    },
  })

  // ─── Bot 3: Encuestas y Feedback ─────────────────────────────────────────
  const bot3 = await db.bot.create({
    data: {
      name: 'Bot Encuestas NPS',
      description: 'Recopila feedback de clientes mediante encuestas NPS y CSAT',
      status: 'active',
      channels: JSON.stringify(['whatsapp', 'messenger', 'instagram']),
    },
  })

  await db.flow.create({
    data: {
      name: 'Encuesta NPS Post-Servicio',
      botId: bot3.id,
      isActive: true,
      trigger: JSON.stringify({ type: 'manual_trigger' }),
      nodes: JSON.stringify([
        { id: 'f1', type: 'start', position: { x: 80, y: 200 }, data: { label: 'Inicio encuesta' } },
        { id: 'f2', type: 'message', position: { x: 320, y: 200 }, data: { label: 'Pregunta NPS', content: 'Hola! 😊 Tuvimos el gusto de atenderte recientemente. ¿Qué tan probable es que recomendes nuestro servicio a un amigo o colega? (0 = Nada probable, 10 = Muy probable)' } },
        { id: 'f3', type: 'buttons', position: { x: 620, y: 200 }, data: { label: 'Score NPS', buttons: [
          { id: 'np1', text: '9-10 (Promotor)' },
          { id: 'np2', text: '7-8 (Pasivo)' },
          { id: 'np3', text: '0-6 (Detractor)' },
        ] } },
        { id: 'f4', type: 'message', position: { x: 920, y: 100 }, data: { label: 'Gracias Promotor', content: '🎉 ¡Gracias por tu confianza! Nos encantaría que nos dejes una reseña en Google: https://g.page/r/tu-resena' } },
        { id: 'f5', type: 'message', position: { x: 920, y: 230 }, data: { label: 'Gracias Pasivo', content: '🙏 Gracias por tu feedback. ¿Qué podríamos mejorar para llegar a un 10?' } },
        { id: 'f6', type: 'message', position: { x: 920, y: 360 }, data: { label: 'Pedir Detalle', content: '😔 Lamentamos que tu experiencia no haya sido óptima. Cuéntanos qué pasó, queremos solucionarlo.' } },
        { id: 'f7', type: 'transfer', position: { x: 1220, y: 360 }, data: { label: 'Escalar', transferTeam: 'Soporte General', transferMessage: 'Te transfiero con nuestro equipo de retención para solucionar tu caso. 🙋' } },
      ]),
      edges: JSON.stringify([
        { id: 'fe1', source: 'f1', target: 'f2' },
        { id: 'fe2', source: 'f2', target: 'f3' },
        { id: 'fe3', source: 'f3', target: 'f4', sourceHandle: 'np1', label: '9-10' },
        { id: 'fe4', source: 'f3', target: 'f5', sourceHandle: 'np2', label: '7-8' },
        { id: 'fe5', source: 'f3', target: 'f6', sourceHandle: 'np3', label: '0-6' },
        { id: 'fe6', source: 'f6', target: 'f7' },
      ]),
    },
  })

  // ─── Bot 4: Reservas Restaurant ──────────────────────────────────────────
  const bot4 = await db.bot.create({
    data: {
      name: 'Bot Reservas Restaurante',
      description: 'Sistema de reservas automatizado para restaurante con confirmación y recordatorios',
      status: 'draft',
      channels: JSON.stringify(['whatsapp', 'instagram']),
    },
  })

  await db.flow.create({
    data: {
      name: 'Flujo de Reservas',
      botId: bot4.id,
      isActive: true,
      trigger: JSON.stringify({ type: 'first_message' }),
      nodes: JSON.stringify([
        { id: 'r1', type: 'start', position: { x: 80, y: 200 }, data: { label: 'Inicio' } },
        { id: 'r2', type: 'message', position: { x: 320, y: 200 }, data: { label: 'Bienvenida', content: '🍽️ ¡Bienvenido a La Bella Italia! ¿Te gustaría hacer una reserva?' } },
        { id: 'r3', type: 'buttons', position: { x: 580, y: 200 }, data: { label: 'Acción', buttons: [
          { id: 'ra1', text: '📅 Hacer reserva' },
          { id: 'ra2', text: '❌ Cancelar reserva' },
          { id: 'ra3', text: '📋 Ver menú' },
          { id: 'ra4', text: '📍 Ubicación' },
        ] } },
        { id: 'r4', type: 'message', position: { x: 880, y: 60 }, data: { label: 'Pedir fecha', content: '📅 Perfecto. ¿Para qué fecha deseas reservar? (Formato: DD/MM/AAAA)' } },
        { id: 'r5', type: 'ai_response', position: { x: 1180, y: 60 }, data: { label: 'IA valida fecha', aiPrompt: 'Valida que la fecha sea válida y futura. Confirma disponibilidad y pide el número de personas.' } },
        { id: 'r6', type: 'message', position: { x: 880, y: 200 }, data: { label: 'Cancelar', content: '❌ Para cancelar tu reserva, indícame el número de confirmación (ej. RES-1234).' } },
        { id: 'r7', type: 'message', position: { x: 880, y: 330 }, data: { label: 'Menú', content: '📋 Nuestro menú:\n\n🍕 Pizzas: Margherita $12, Pepperoni $15, Quattro Formaggi $16\n🍝 Pastas: Spaghetti Carbonara $14, Lasagna $16\n🥗 Ensaladas: César $10, Caprese $12\n🍷 Vinos: Casa Rojo $8/cop, Casa Blanco $7/cop\n\n¿Quieres hacer una reserva?' } },
        { id: 'r8', type: 'message', position: { x: 880, y: 460 }, data: { label: 'Ubicación', content: '📍 Estamos en:\nCalle Principal #123, Ciudad\n\n🕒 Horario:\nLun-Vie: 12pm - 11pm\nSáb-Dom: 11am - 12am\n\n📞 Tel: +1234567890' } },
      ]),
      edges: JSON.stringify([
        { id: 're1', source: 'r1', target: 'r2' },
        { id: 're2', source: 'r2', target: 'r3' },
        { id: 're3', source: 'r3', target: 'r4', sourceHandle: 'ra1', label: '📅 Reservar' },
        { id: 're4', source: 'r3', target: 'r6', sourceHandle: 'ra2', label: '❌ Cancelar' },
        { id: 're5', source: 'r3', target: 'r7', sourceHandle: 'ra3', label: '📋 Menú' },
        { id: 're6', source: 'r3', target: 'r8', sourceHandle: 'ra4', label: '📍 Ubicación' },
        { id: 're7', source: 'r4', target: 'r5' },
      ]),
    },
  })
}
