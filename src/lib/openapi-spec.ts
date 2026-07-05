/**
 * OpenAPI 3.1 specification for the ChatFlow public API.
 *
 * This object is consumed by:
 *   - /api/docs/json   (returns the JSON spec)
 *   - /docs            (renders Scalar API Reference UI)
 *
 * Add new endpoints here as they are implemented. Keep descriptions in Spanish
 * to match the project's primary audience.
 */
import type { OpenAPIV3_1 } from 'openapi-types'

// The openapi-types package does not include `nullable` (removed in 3.1),
// but it's a common extension field still recognized by tooling. We cast to
// a relaxed type to allow both 3.0 nullable and 3.1 type-arrays.
type LooseDoc = OpenAPIV3_1.Document

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'ChatFlow API',
    version: '1.0.0',
    description: `API REST de ChatFlow — plataforma omnicanal de chatbots para WhatsApp, Messenger, Instagram y Telegram.

## Autenticación

Todas las peticiones (excepto webhooks entrantes) requieren una API Key. Puedes crear y revocar claves desde el panel "Seguridad" de la plataforma.

Incluye la clave en cualquier request usando uno de estos headers:

\`\`\`http
Authorization: Bearer cf_xxxxxxxxxxxxxxx
\`\`\`

o

\`\`\`http
x-api-key: cf_xxxxxxxxxxxxxxx
\`\`\`

## Rate Limits

- Plan Free: 60 peticiones / minuto
- Plan Pro: 600 peticiones / minuto
- Plan Business: 6.000 peticiones / minuto

## Errores

Todas las respuestas de error siguen el formato:

\`\`\`json
{ "success": false, "error": "Mensaje corto", "message": "Detalle opcional" }
\`\`\`

Códigos HTTP usados: \`400\` (bad request), \`401\` (no auth), \`403\` (forbidden), \`404\` (no encontrado), \`429\` (rate limit), \`500\` (server error).
`,
    contact: { name: 'ChatFlow Soporte', email: 'soporte@chatflow.pe' },
    license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
  },
  servers: [
    { url: '/', description: 'Relative (mismo dominio)' },
    { url: 'https://mkoo-chat.vercel.app', description: 'Producción' },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticación y API keys' },
    { name: 'Bots', description: 'Gestión de bots' },
    { name: 'Conversations', description: 'Conversaciones y mensajes' },
    { name: 'Contacts', description: 'CRM de contactos' },
    { name: 'Channels', description: 'Canales (WhatsApp, Messenger, etc.)' },
    { name: 'Broadcasts', description: 'Campañas masivas' },
    { name: 'Templates', description: 'Plantillas del marketplace' },
    { name: 'AI', description: 'Endpoints de IA (GLM)' },
    { name: 'Billing', description: 'Facturación y planes' },
    { name: 'Stripe', description: 'Integración Stripe (checkout, portal, webhook)' },
    { name: 'SUNAT', description: 'Comprobantes electrónicos Perú (UBL 2.1)' },
    { name: 'Webhooks', description: 'Webhooks entrantes de canales' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Usa `Authorization: Bearer cf_xxx` o el header `x-api-key: cf_xxx`',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['success', 'error'],
      },
      Bot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'paused'], example: 'active' },
          channels: { type: 'string' },
          language: { type: 'string', example: 'es' },
          category: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          botId: { type: 'string', nullable: true },
          channel: { type: 'string', example: 'whatsapp' },
          contactName: { type: 'string', nullable: true },
          lastMessage: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'closed', 'transferred'] },
          unread: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          conversationId: { type: 'string' },
          sender: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string', example: 'text' },
          isBot: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          externalId: { type: 'string', nullable: true },
          channel: { type: 'string', nullable: true },
          language: { type: 'string' },
          tags: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customerId: { type: 'string' },
          plan: { type: 'string', enum: ['free', 'pro', 'business', 'enterprise'] },
          status: { type: 'string', enum: ['active', 'canceled', 'past_due', 'trialing'] },
          seats: { type: 'integer' },
          conversationsLimit: { type: 'integer' },
          messagesLimit: { type: 'integer' },
          stripeCustomerId: { type: 'string', nullable: true },
          stripeSubscriptionId: { type: 'string', nullable: true },
          currentPeriodStart: { type: 'string', format: 'date-time', nullable: true },
          currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true },
          cancelAtPeriodEnd: { type: 'boolean' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stripeInvoiceId: { type: 'string', nullable: true },
          amount: { type: 'integer', description: 'En centavos' },
          currency: { type: 'string', example: 'usd' },
          status: { type: 'string', enum: ['open', 'paid', 'void', 'uncollectible'] },
          pdfUrl: { type: 'string', nullable: true },
          hostedInvoiceUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CustomerTaxInfo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customerId: { type: 'string' },
          docType: { type: 'string', description: '1=DNI, 6=RUC, 4=Carnet Extranjería, 7=Pasaporte' },
          docNumber: { type: 'string' },
          razonSocial: { type: 'string' },
          address: { type: 'string', nullable: true },
          district: { type: 'string', nullable: true },
          province: { type: 'string', nullable: true },
          department: { type: 'string', nullable: true },
          ubigeo: { type: 'string', nullable: true, description: 'Código INEI 6 dígitos' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
        },
        required: ['customerId', 'docType', 'docNumber', 'razonSocial'],
      },
      SunatDocument: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tipoDocumento: { type: 'string', description: '01=Factura, 03=Boleta, 07=Nota de Crédito, 08=Nota de Débito' },
          serie: { type: 'string', example: 'F001' },
          correlativo: { type: 'integer', example: 1 },
          docNumber: { type: 'string', example: 'F001-00000001' },
          customerDocType: { type: 'string' },
          customerDocNumber: { type: 'string' },
          customerName: { type: 'string' },
          moneda: { type: 'string', example: 'PEN' },
          totalGravada: { type: 'string', description: 'Base imponible (sin IGV), decimal como string' },
          totalIgv: { type: 'string', description: 'IGV 18%' },
          total: { type: 'string', description: 'Total incluyendo IGV' },
          estado: { type: 'string', enum: ['pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado'] },
          sunatTicket: { type: 'string', nullable: true },
          sunatResponseCode: { type: 'string', nullable: true },
          sunatDescription: { type: 'string', nullable: true },
          xmlFileName: { type: 'string', nullable: true },
          pdfUrl: { type: 'string', nullable: true },
          fechaEmision: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SunatItem: {
        type: 'object',
        properties: {
          descripcion: { type: 'string' },
          cantidad: { type: 'number' },
          precioUnitario: { type: 'number', description: 'Precio unitario (incluye IGV por defecto)' },
          igvIncluded: { type: 'boolean', default: true },
          afectoIgv: { type: 'boolean', default: true },
          tipoAfectacion: { type: 'string', default: '10', description: 'Catálogo 7 SUNAT. 10=Gravado-Onerosa' },
        },
        required: ['descripcion', 'cantidad', 'precioUnitario'],
      },
      CheckoutRequest: {
        type: 'object',
        properties: {
          plan: { type: 'string', enum: ['pro', 'business'] },
          annual: { type: 'boolean', default: false },
          customerId: { type: 'string', description: 'Identificador interno (workspace id)' },
          customerEmail: { type: 'string', format: 'email' },
        },
        required: ['plan', 'customerId'],
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    // ─── Health ────────────────────────────────────────────────────────────
    '/api/healthz': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        description: 'Verifica estado del servicio sin autenticación.',
        security: [],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, time: { type: 'string' } } } } } },
        },
      },
    },

    // ─── Bots ──────────────────────────────────────────────────────────────
    '/api/bots': {
      get: {
        tags: ['Bots'],
        summary: 'Listar bots',
        responses: {
          '200': { description: 'Lista de bots', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Bot' } } } } } } },
          '401': { description: 'No autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Bots'],
        summary: 'Crear bot',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, channels: { type: 'string' }, language: { type: 'string' } }, required: ['name'] } } } },
        responses: { '201': { description: 'Bot creado' }, '400': { description: 'Datos inválidos' } },
      },
    },
    '/api/bots/{botId}': {
      get: { tags: ['Bots'], summary: 'Obtener bot', parameters: [{ $ref: '#/components/parameters/BotId' }], responses: { '200': { description: 'Bot' }, '404': { description: 'No encontrado' } } },
      put: { tags: ['Bots'], summary: 'Actualizar bot', parameters: [{ $ref: '#/components/parameters/BotId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Bot actualizado' } } },
      delete: { tags: ['Bots'], summary: 'Eliminar bot', parameters: [{ $ref: '#/components/parameters/BotId' }], responses: { '204': { description: 'Eliminado' } } },
    },
    '/api/bots/{botId}/flows': {
      get: { tags: ['Bots'], summary: 'Listar flujos del bot', parameters: [{ $ref: '#/components/parameters/BotId' }], responses: { '200': { description: 'Lista de flujos' } } },
      post: { tags: ['Bots'], summary: 'Crear flujo', parameters: [{ $ref: '#/components/parameters/BotId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, nodes: { type: 'string' }, edges: { type: 'string' }, trigger: { type: 'string' } } } } } }, responses: { '201': { description: 'Flujo creado' } } },
    },

    // ─── Conversations ────────────────────────────────────────────────────
    '/api/conversations': {
      get: { tags: ['Conversations'], summary: 'Listar conversaciones', parameters: [{ name: 'channel', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'Lista', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } } } } } } },
    },
    '/api/conversations/{convId}': {
      get: { tags: ['Conversations'], summary: 'Obtener conversación', parameters: [{ $ref: '#/components/parameters/ConvId' }], responses: { '200': { description: 'Conversación' }, '404': { description: 'No encontrada' } } },
    },
    '/api/conversations/{convId}/messages': {
      get: { tags: ['Conversations'], summary: 'Listar mensajes', parameters: [{ $ref: '#/components/parameters/ConvId' }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }], responses: { '200': { description: 'Mensajes', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } } } } },
      post: { tags: ['Conversations'], summary: 'Enviar mensaje a la conversación', parameters: [{ $ref: '#/components/parameters/ConvId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, type: { type: 'string', default: 'text' } }, required: ['content'] } } } }, responses: { '201': { description: 'Mensaje enviado' } } },
    },
    '/api/conversations/{convId}/transfer': {
      post: { tags: ['Conversations'], summary: 'Transferir a humano / equipo', parameters: [{ $ref: '#/components/parameters/ConvId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { assignedTo: { type: 'string' }, team: { type: 'string' }, reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Transferido' } } },
    },
    '/api/conversations/{convId}/tags': {
      post: { tags: ['Conversations'], summary: 'Añadir / quitar tags', parameters: [{ $ref: '#/components/parameters/ConvId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string', enum: ['add', 'remove'] }, name: { type: 'string' }, color: { type: 'string' } } } } } }, responses: { '200': { description: 'OK' } } },
    },
    '/api/conversations/{convId}/notes': {
      get: { tags: ['Conversations'], summary: 'Listar notas internas', parameters: [{ $ref: '#/components/parameters/ConvId' }], responses: { '200': { description: 'Notas' } } },
      post: { tags: ['Conversations'], summary: 'Añadir nota interna', parameters: [{ $ref: '#/components/parameters/ConvId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, author: { type: 'string' } }, required: ['content'] } } } }, responses: { '201': { description: 'Nota creada' } } },
    },

    // ─── Contacts ─────────────────────────────────────────────────────────
    '/api/contacts': {
      get: { tags: ['Contacts'], summary: 'Listar contactos', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'channel', in: 'query', schema: { type: 'string' } }, { name: 'tag', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Contactos', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Contact' } } } } } } } } },
      post: { tags: ['Contacts'], summary: 'Crear contacto', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Contact' } } } }, responses: { '201': { description: 'Creado' } } },
    },
    '/api/contacts/{id}': {
      get: { tags: ['Contacts'], summary: 'Obtener contacto', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Contacto' }, '404': { description: 'No encontrado' } } },
      put: { tags: ['Contacts'], summary: 'Actualizar contacto', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Contact' } } } }, responses: { '200': { description: 'Actualizado' } } },
      delete: { tags: ['Contacts'], summary: 'Eliminar contacto', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Eliminado' } } },
    },
    '/api/contacts/import': {
      post: { tags: ['Contacts'], summary: 'Importar contactos vía CSV/JSON', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { '200': { description: 'Importados' } } },
    },
    '/api/contacts/export': {
      get: { tags: ['Contacts'], summary: 'Exportar contactos a CSV', responses: { '200': { description: 'CSV', content: { 'text/csv': { schema: { type: 'string' } } } } } },
    },

    // ─── Channels ─────────────────────────────────────────────────────────
    '/api/channels': {
      get: { tags: ['Channels'], summary: 'Listar canales conectados', responses: { '200': { description: 'Canales' } } },
      post: { tags: ['Channels'], summary: 'Conectar canal', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { type: { type: 'string', enum: ['whatsapp', 'messenger', 'instagram', 'telegram'] }, name: { type: 'string' }, config: { type: 'object' } }, required: ['type', 'name'] } } } }, responses: { '201': { description: 'Canal conectado' } } },
    },

    // ─── Broadcasts ───────────────────────────────────────────────────────
    '/api/broadcasts': {
      get: { tags: ['Broadcasts'], summary: 'Listar campañas', responses: { '200': { description: 'Campañas' } } },
      post: { tags: ['Broadcasts'], summary: 'Crear campaña', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, channel: { type: 'string' }, message: { type: 'string' }, segment: { type: 'string' }, templateName: { type: 'string' }, templateParams: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' } }, required: ['name', 'channel', 'message'] } } } }, responses: { '201': { description: 'Campaña creada' } } },
    },
    '/api/broadcasts/{id}/send': {
      post: { tags: ['Broadcasts'], summary: 'Ejecutar envío inmediato', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '202': { description: 'Envío en proceso' } } },
    },

    // ─── Templates ────────────────────────────────────────────────────────
    '/api/templates': {
      get: { tags: ['Templates'], summary: 'Listar plantillas del marketplace', responses: { '200': { description: 'Plantillas' } } },
    },
    '/api/templates/{id}/install': {
      post: { tags: ['Templates'], summary: 'Instalar plantilla en un bot', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { botId: { type: 'string' } }, required: ['botId'] } } } }, responses: { '201': { description: 'Plantilla instalada' } } },
    },

    // ─── AI ───────────────────────────────────────────────────────────────
    '/api/ai/suggest': {
      post: { tags: ['AI'], summary: 'Sugerir respuesta con IA', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { conversationId: { type: 'string' }, context: { type: 'string' }, language: { type: 'string', default: 'es' } } } } } }, responses: { '200': { description: 'Sugerencia', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { suggestion: { type: 'string' } } } } } } } } } },
    },
    '/api/ai/chat': {
      post: { tags: ['AI'], summary: 'Chat directo con el modelo GLM', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } } } } } } } } }, responses: { '200': { description: 'Respuesta de IA' } } },
    },

    // ─── Billing & Subscriptions ──────────────────────────────────────────
    '/api/subscriptions': {
      get: { tags: ['Billing'], summary: 'Listar suscripciones', responses: { '200': { description: 'Suscripciones', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } } } } } },
      post: { tags: ['Billing'], summary: 'Crear suscripción manual', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } }, responses: { '201': { description: 'Creada' } } },
    },
    '/api/invoices': {
      get: { tags: ['Billing'], summary: 'Listar facturas', responses: { '200': { description: 'Facturas', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } } } } } },
    },
    '/api/billing/me': {
      get: { tags: ['Billing'], summary: 'Obtener suscripción, facturas y comprobantes SUNAT del cliente', parameters: [{ name: 'customerId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Resumen de facturación' } } },
    },

    // ─── Stripe ───────────────────────────────────────────────────────────
    '/api/stripe/plans': {
      get: { tags: ['Stripe'], summary: 'Listar planes disponibles', security: [], responses: { '200': { description: 'Planes' } } },
    },
    '/api/stripe/checkout': {
      post: {
        tags: ['Stripe'],
        summary: 'Crear sesión de Stripe Checkout',
        description: 'Crea una sesión de Stripe Checkout para suscribirse a un plan de pago. Devuelve una URL a la que redirigir al usuario.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } } } },
        responses: { '200': { description: 'URL de checkout', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, sessionId: { type: 'string' } } } } } } },
      },
    },
    '/api/stripe/portal': {
      post: {
        tags: ['Stripe'],
        summary: 'Crear sesión del Stripe Customer Portal',
        description: 'Permite al cliente gestionar su suscripción (cambiar método de pago, cancelar, ver facturas) desde el portal de Stripe.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { customerId: { type: 'string' } }, required: ['customerId'] } } } },
        responses: { '200': { description: 'URL del portal', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' } } } } } } },
      },
    },
    '/api/stripe/webhook': {
      post: {
        tags: ['Stripe'],
        summary: 'Webhook de Stripe',
        description: 'Endpoint público (sin API key) que recibe eventos webhook de Stripe. Verifica la firma con `STRIPE_WEBHOOK_SECRET`.\n\nEventos manejados: `checkout.session.completed`, `customer.subscription.updated/created/deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.\n\nAl recibir `invoice.payment_succeeded` se genera automáticamente el comprobante SUNAT correspondiente (Factura si el cliente tiene RUC, Boleta si tiene DNI).',
        security: [],
        responses: { '200': { description: 'Recibido' }, '400': { description: 'Firma inválida' } },
      },
    },

    // ─── SUNAT ────────────────────────────────────────────────────────────
    '/api/sunat/issuer': {
      get: { tags: ['SUNAT'], summary: 'Obtener datos del emisor', description: 'Devuelve los datos del emisor configurados mediante variables de entorno (RUC, razón social, dirección).', responses: { '200': { description: 'Emisor' } } },
    },
    '/api/sunat/correlativos': {
      get: { tags: ['SUNAT'], summary: 'Listar correlativos por serie', description: 'Devuelve el último correlativo usado por cada (tipoDocumento, serie) y el próximo número disponible.', responses: { '200': { description: 'Correlativos' } } },
    },
    '/api/sunat/customer-info': {
      get: { tags: ['SUNAT'], summary: 'Obtener datos fiscales del cliente', parameters: [{ name: 'customerId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Datos fiscales', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/CustomerTaxInfo' } } } } } } } },
      post: { tags: ['SUNAT'], summary: 'Guardar datos fiscales del cliente (RUC/DNI, razón social, dirección)', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerTaxInfo' } } } }, responses: { '200': { description: 'Guardado' }, '400': { description: 'Datos inválidos (RUC debe tener 11 dígitos, DNI 8)' } } },
    },
    '/api/sunat/documents': {
      get: { tags: ['SUNAT'], summary: 'Listar comprobantes SUNAT', parameters: [{ name: 'customerId', in: 'query', schema: { type: 'string' } }, { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado'] } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'Comprobantes', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/SunatDocument' } } } } } } } } },
      post: {
        tags: ['SUNAT'],
        summary: 'Crear comprobante electrónico',
        description: 'Genera un comprobante UBL 2.1 (Factura o Boleta) y opcionalmente lo envía a SUNAT.\n\n- Si el cliente tiene RUC, se debe usar tipoDocumento `01` (Factura).\n- Si el cliente tiene DNI, se debe usar tipoDocumento `03` (Boleta).\n- El comprobante se almacena en estado `pendiente` a menos que se pase `autoSubmit: true`.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { customerId: { type: 'string' }, tipoDocumento: { type: 'string', enum: ['01', '03'] }, moneda: { type: 'string', default: 'PEN' }, items: { type: 'array', items: { $ref: '#/components/schemas/SunatItem' } }, customer: { type: 'object' }, autoSubmit: { type: 'boolean', default: false } }, required: ['customerId', 'tipoDocumento', 'items'] } } } },
        responses: { '201': { description: 'Comprobante creado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SunatDocument' } } } } } } },
      },
    },
    '/api/sunat/documents/{id}': {
      get: { tags: ['SUNAT'], summary: 'Obtener comprobante', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comprobante' }, '404': { description: 'No encontrado' } } },
      post: { tags: ['SUNAT'], summary: 'Enviar a SUNAT / regenerar XML', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string', enum: ['submit', 'regenerate-xml'] } }, required: ['action'] } } } }, responses: { '200': { description: 'Acción ejecutada' } } },
      delete: { tags: ['SUNAT'], summary: 'Anular comprobante (marca como anulado)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Anulado' } } },
    },
    '/api/sunat/documents/{id}/xml': {
      get: { tags: ['SUNAT'], summary: 'Descargar XML UBL 2.1 firmado', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'XML', content: { 'application/xml': { schema: { type: 'string' } } } }, '404': { description: 'No encontrado' } } },
    },
    '/api/sunat/documents/{id}/pdf': {
      get: { tags: ['SUNAT'], summary: 'Ver comprobante en formato imprimible (HTML para PDF)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'HTML', content: { 'text/html': { schema: { type: 'string' } } } } } },
    },

    // ─── Incoming Webhooks ────────────────────────────────────────────────
    '/api/webhook/{channel}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Verificación de webhook (Meta)',
        description: 'Meta envía una petición GET con `hub.mode=subscribe`, `hub.verify_token` y `hub.challenge` para verificar el webhook. El servidor responde con el challenge si el token coincide.',
        security: [],
        parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['whatsapp', 'messenger', 'instagram'] } }, { name: 'hub.mode', in: 'query', schema: { type: 'string' } }, { name: 'hub.verify_token', in: 'query', schema: { type: 'string' } }, { name: 'hub.challenge', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'Challenge' }, '403': { description: 'Token inválido' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Recepción de mensajes entrantes',
        description: 'Endpoint público (sin API key) que recibe los mensajes entrantes de los canales (WhatsApp, Messenger, Instagram, Telegram). Verifica firma HMAC cuando está disponible.',
        security: [],
        parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['whatsapp', 'messenger', 'instagram', 'telegram'] } }],
        responses: { '200': { description: 'Recibido' } },
      },
    },
    '/api/send/{channel}': {
      post: {
        tags: ['Webhooks'],
        summary: 'Enviar mensaje saliente a un canal',
        description: 'Envía un mensaje saliente (texto, plantilla, media, botones) a un destinatario en el canal especificado.',
        parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['whatsapp', 'messenger', 'instagram', 'telegram'] } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' }, type: { type: 'string', default: 'text' }, templateName: { type: 'string' }, templateParams: { type: 'string' }, buttons: { type: 'string' } }, required: ['to', 'message'] } } } },
        responses: { '200': { description: 'Enviado' } },
      },
    },
  },
  parameters: {
    BotId: { name: 'botId', in: 'path', required: true, schema: { type: 'string' } },
    ConvId: { name: 'convId', in: 'path', required: true, schema: { type: 'string' } },
  },
} as LooseDoc
