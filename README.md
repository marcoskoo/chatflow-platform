# ChatFlow Platform

Plataforma multi-canal de chatbots con constructor visual de flujos para **WhatsApp**, **Facebook Messenger**, **Instagram Direct** y **Telegram**.

![ChatFlow](public/logo.svg)

## Funcionalidades

- 🤖 **Automatización con IA** — Integración GLM (Z.ai) para respuestas inteligentes
- 🎨 **Constructor Visual de Flujos** — Drag-and-drop no-code con tipos de nodo:
  - Inicio, Mensaje, Condición, Respuesta IA, Botones, Transferir, Fin
- 💬 **Multi-Canal** — WhatsApp Cloud API, Messenger Platform, Instagram Messaging API, Telegram Bot API
- 🔘 **Botones Clicables** — Mensajes interactivos con botones para todas las plataformas
- 🏷️ **Notas y Etiquetas** — Organiza conversaciones con tags y notas internas
- 👥 **Transferencia a Equipos** — Escala conversaciones a operadores humanos
- 🔑 **Autenticación por API Key** — Endpoints seguros con claves SHA-256 y permisos
- 🔗 **Webhooks Reales** — Verificación de webhooks y validación de firma HMAC-SHA1/SHA256
- 📊 **Dashboard** — Analíticas con estadísticas, métricas por canal y gráficos de actividad

## Stack Técnico

- **Framework:** Next.js 16 (App Router) + React 19
- **Estilos:** Tailwind CSS 4 + shadcn/ui
- **Base de datos:** PostgreSQL + Prisma ORM
- **Estado:** Zustand
- **Drag & Drop:** @dnd-kit
- **Gráficos:** Recharts

## Requisitos previos

- Node.js 18+ o Bun
- Base de datos PostgreSQL (local o cloud — Vercel Postgres, Neon, Supabase)
- Credenciales de plataformas (WhatsApp, Messenger, Instagram, Telegram) — opcionales para arranque

## Puesta en marcha local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu cadena PostgreSQL y API key de GLM (opcional)

# Generar cliente Prisma y aplicar esquema a la base de datos
npx prisma generate
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Variables de entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (pooled) | Sí |
| `DIRECT_URL` | Cadena directa PostgreSQL (para migraciones) | Sí |
| `GLM_API_KEY` | API key de GLM para respuestas IA | No |
| `GLM_API_URL` | Endpoint GLM (default: `https://open.bigmodel.cn/api/paas/v4/chat/completions`) | No |

## Autenticación API

Todos los endpoints requieren autenticación mediante API keys. Crea tu primera clave admin:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INITIAL_ADMIN_KEY" \
  -d '{"name": "Admin Key", "permissions": ["admin"]}'
```

Incluye la API key en las peticiones mediante:
- Cabecera `Authorization: Bearer <key>`
- Cabecera `x-api-key: <key>`

### Niveles de permiso

| Permiso | Acceso |
|---------|--------|
| `read` | Endpoints GET |
| `write` | Endpoints POST/PATCH/DELETE |
| `admin` | Todos los endpoints + gestión de keys |
| `webhooks` | Endpoints de webhook |

## Configuración de Webhooks

Configura webhooks para cada canal vía `/api/webhook-config`:

```bash
# WhatsApp
curl -X POST http://localhost:3000/api/webhook-config \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","verifyToken":"your-token","accessToken":"your-token","phoneNumberId":"your-id","appSecret":"your-secret"}'

# Telegram
curl -X POST http://localhost:3000/api/webhook-config \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"channel":"telegram","botToken":"your-bot-token"}'
```

### URLs de Webhook por plataforma

| Plataforma | URL |
|----------|-------------|
| WhatsApp | `https://your-domain.com/api/webhook/whatsapp` |
| Messenger | `https://your-domain.com/api/webhook/messenger` |
| Instagram | `https://your-domain.com/api/webhook/instagram` |
| Telegram | `https://your-domain.com/api/webhook/telegram` |

## Despliegue en Vercel

### 1. Preparar repositorio

```bash
git init
git add .
git commit -m "ChatFlow platform ready for Vercel"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/chatflow-platform.git
git push -u origin main
```

### 2. Provisionar base de datos PostgreSQL

Elige una de estas opciones (todas tienen tier gratuito):

- **Neon** (recomendado): [neon.tech](https://neon.tech) — crea un proyecto y copia las dos connection strings (pooled y direct)
- **Vercel Postgres**: en el dashboard de Vercel → Storage → Create → Postgres
- **Supabase**: [supabase.com](https://supabase.com) — crea un proyecto y copia la connection string

Necesitas **dos** URLs:
- `DATABASE_URL` — pooled (con `?pgbouncer=true&sslmode=require` si usas Neon)
- `DIRECT_URL` — directa, sin pooler (la usa Prisma para migraciones)

### 3. Importar en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio de GitHub
3. Vercel detecta automáticamente Next.js — no cambies el framework
4. El `vercel.json` ya está configurado con:
   - `buildCommand`: `prisma generate && next build`
   - `installCommand`: `npm install`
   - `regions`: `["iad1"]`

### 4. Configurar variables de entorno

En Vercel → Project Settings → Environment Variables, añade:

| Variable | Entornos | Valor |
|----------|----------|-------|
| `DATABASE_URL` | Production, Preview, Development | `postgresql://...` (pooled, con `?sslmode=require&pgbouncer=true`) |
| `DIRECT_URL` | Production, Preview, Development | `postgresql://...` (direct, sin pooler) |
| `GLM_API_KEY` | Production, Preview | Tu API key GLM (opcional) |
| `GLM_API_URL` | Production | `https://open.bigmodel.cn/api/paas/v4/chat/completions` (opcional) |

### 5. Desplegar

Pulsa **Deploy**. El build ejecutará automáticamente:
1. `npm install` (que dispara `postinstall: prisma generate`)
2. `prisma generate && next build`

### 6. Inicializar la base de datos

Después del primer deploy, aplica el esquema Prisma a la base de datos PostgreSQL desde tu máquina local:

```bash
# Asegúrate de tener DIRECT_URL configurado en .env (local)
npx prisma db push
```

O usa `prisma migrate deploy` si prefieres migraciones versionadas:

```bash
npx prisma migrate deploy
```

### 7. Verificar el despliegue

```bash
# Health check
curl https://your-app.vercel.app/api/healthz

# Lista de endpoints disponibles
curl https://your-app.vercel.app/api
```

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── ai/           # Integración GLM IA (chat + suggest)
│   │   ├── bots/         # CRUD bots + flujos
│   │   ├── channels/     # Listado de canales
│   │   ├── conversations/# Conversaciones + mensajes + tags + notes + transfer
│   │   ├── healthz/      # Health check para Vercel/uptime monitors
│   │   ├── keys/         # Gestión de API keys
│   │   ├── send/         # Envío saliente por canal
│   │   ├── teams/        # Gestión de equipos
│   │   ├── webhook/      # Webhooks entrantes por plataforma
│   │   └── webhook-config/ # Configuración de credenciales webhook
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chatbot/          # Componentes núcleo de la app
│   │   ├── FlowBuilder.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── BotList.tsx
│   │   ├── ConversationPanel.tsx
│   │   ├── ChannelManager.tsx
│   │   ├── ApiKeyManager.tsx
│   │   ├── TeamManager.tsx
│   │   └── ApiDocs.tsx
│   └── ui/               # Componentes shadcn/ui
├── lib/
│   ├── auth.ts           # API key auth + verificación de firma webhook
│   ├── db.ts             # Singleton Prisma client
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Utilidades
└── hooks/
prisma/
└── schema.prisma          # Esquema de base de datos
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Servidor de producción (después de build) |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica el esquema a la base de datos |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:migrate` | Crea y aplica una migración |
| `npm run db:migrate:deploy` | Aplica migraciones pendientes en producción |
| `npm run test:e2e` | Ejecuta todas las pruebas E2E con Playwright |
| `npm run test:e2e:ui` | Abre Playwright en modo interactivo (UI mode) |
| `npm run test:e2e:report` | Abre el reporte HTML de la última ejecución |
| `npm run stripe:listen` | Reenvía eventos webhook de Stripe locales a `/api/stripe/webhook` |

## Documentación de la API (OpenAPI)

La especificación OpenAPI 3.1 está disponible en:

- **HTML interactivo (Scalar):** `/docs` — explorador con try-it-now
- **JSON spec:** `/api/docs/json` — para importar a Postman, Insomnia, etc.

La spec describe todos los endpoints (Bots, Conversaciones, Contactos, Stripe, SUNAT, Webhooks) con esquemas, ejemplos y códigos de error. Para añadir o actualizar endpoints edita `src/lib/openapi-spec.ts`.

## Manual de configuración (PDF)

En [`download/Manual-Configuracion-ChatFlow.pdf`](download/Manual-Configuracion-ChatFlow.pdf) encontrarás un manual técnico de 24 páginas con la configuración paso a paso de las tres piezas clave:

1. **Pruebas E2E con Playwright** — instalación, estructura, ejemplos y patrones
2. **Documentación API con OpenAPI/Swagger** — spec 3.1, Scalar UI, integración
3. **Facturación Stripe real** — modelos, webhook, portal, setup script
4. **Verificación y operación** — smoke tests, CI, debug de webhooks
5. **Apéndices** — variables de entorno completas + solución de problemas

Pensado para replicarse en otro proyecto sin partir de cero.

## Facturación Stripe + SUNAT

### Estado actual

- **Stripe:** Operativo. Checkout, webhook, portal, invoices y planes funcionan end-to-end sin requerir SUNAT.
- **SUNAT:** Deshabilitado por defecto (`SUNAT_ENABLED=0`). Para activarlo, ver la sección "Configuración SUNAT" más abajo.

### Flujo de cobro (Stripe)

1. Usuario selecciona plan en panel "Facturación" → `POST /api/stripe/checkout`
2. Stripe redirige al Checkout → al pagar, Stripe envía `invoice.payment_succeeded` a `POST /api/stripe/webhook`
3. El webhook crea la `Subscription` + `Invoice` local.
4. Si `SUNAT_ENABLED=1` y hay datos fiscales del cliente, genera automáticamente el comprobante SUNAT (Factura para RUC, Boleta para DNI). Si no, se omite la generación SUNAT y Stripe emite su propia factura.
5. El cliente gestiona su suscripción desde el Customer Portal (`POST /api/stripe/portal`).

### Configuración Stripe (paso a paso)

La forma más rápida es usar el script asistido que crea los productos y precios automáticamente:

```bash
# 1. Instala tsx si no lo tienes
npm i -g tsx

# 2. Ejecuta el script con tu STRIPE_SECRET_KEY
STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/setup-stripe.ts --write

# El script crea (o reutiliza) 2 productos y 4 precios (pro/business × mensual/anual)
# y escribe los price_xxx directamente en tu .env
```

Alternativa manual: crea los productos en [Stripe Dashboard](https://dashboard.stripe.com/products) y copia los `price_xxx` al `.env`:

```bash
# .env
STRIPE_SECRET_KEY=sk_test_xxxxx          # sk_live_ para producción
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # del stripe listen (dev) o Dashboard→Webhooks (prod)
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_ANNUAL=price_xxx
NEXT_PUBLIC_APP_URL=https://tu-dominio.com  # para redirects de Stripe
```

Para desarrollo local, escuchar webhooks:

```bash
npm run stripe:listen
# pega el whsec_xxx que aparece en la consola como STRIPE_WEBHOOK_SECRET
```

> **Importante:** el webhook debe leer el body como `await req.text()` (texto plano), NUNCA como `await req.json()`. La firma HMAC de Stripe se calcula sobre el raw payload.

### Configuración SUNAT (opcional, Perú)

SUNAT está deshabilitado por defecto. Stripe funciona perfectamente sin él: las facturas que emite Stripe son suficientes para la mayoría de negocios. Para activar facturación electrónica Perú:

```bash
# .env — activar SUNAT
SUNAT_ENABLED=1

# Datos del emisor (tu empresa)
SUNAT_ISSUER_RUC=20123456789
SUNAT_ISSUER_RAZON_SOCIAL="Mi Empresa SAC"
SUNAT_ISSUER_DIRECCION="Av. Javier Prado 1234"
SUNAT_ISSUER_DEPARTAMENTO=LIMA
SUNAT_ISSUER_PROVINCIA=LIMA
SUNAT_ISSUER_DISTRITO="San Isidro"
SUNAT_ISSUER_UBIGEO=150131

# Servicio externo que firma XML con certificado digital y envía a SUNAT
# Puede ser Nubefact, Greenter, o un microservicio propio.
# Si no se configura, los comprobantes se generan en modo simulación.
SUNAT_SENDER_URL=https://your-sender-endpoint/api/send
SUNAT_SENDER_TOKEN=bearer-token
```

### Pruebas E2E

Las pruebas están en `tests/e2e/`:

- `public.spec.ts` — endpoints públicos (health, docs, plans) + aplicación de auth
- `api-core.spec.ts` — Bots, Conversations, Contacts (requiere API key)
- `stripe.spec.ts` — Integración Stripe (checkout, portal, webhook)
- `sunat.spec.ts` — Ciclo completo de comprobantes SUNAT
- `ui-smoke.spec.ts` — Smoke test de la UI

```bash
# Requiere servidor corriendo en localhost:3000
npm run dev

# En otra terminal:
ADMIN_API_KEY=cf_xxx npm run test:e2e

# Modo interactivo:
npm run test:e2e:ui
```

## Licencia

MIT
