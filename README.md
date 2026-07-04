# ChatFlow Platform

Multi-channel chatbot platform with visual flow builder for **WhatsApp**, **Facebook Messenger**, **Instagram Direct**, and **Telegram**.

![ChatFlow](public/logo.svg)

## Features

- 🤖 **AI Automation** — GLM API integration for AI-powered responses
- 🎨 **Visual Flow Builder** — Drag-and-drop no-code flow builder with node types:
  - Start, Message, Condition, AI Response, Button, Transfer, End
- 💬 **Multi-Channel** — WhatsApp Cloud API, Messenger Platform, Instagram Messaging API, Telegram Bot API
- 🔘 **Clickable Buttons** — Interactive button messages for all supported platforms
- 🏷️ **Notes & Tags** — Organize conversations with tags and internal notes
- 👥 **Team Transfer** — Escalate conversations to human operators/teams
- 🔑 **API Key Auth** — Secure endpoints with SHA-256 hashed API keys and permission-based access
- 🔗 **Real Webhooks** — Platform webhook verification and signature validation (HMAC-SHA1/SHA256)
- 📊 **Dashboard** — Analytics with conversation stats, channel metrics, and activity charts

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL + Prisma ORM
- **State:** Zustand
- **Drag & Drop:** @dnd-kit
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (local or cloud)
- Platform credentials (WhatsApp, Messenger, Instagram, Telegram)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/chatflow-platform.git
cd chatflow-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and API keys

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DIRECT_URL` | Direct PostgreSQL URL (for migrations) | Yes |
| `GLM_API_KEY` | GLM API key for AI responses | No |
| `GLM_API_URL` | GLM API endpoint | No |

## API Authentication

All API endpoints require authentication via API keys. Create your first admin key:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INITIAL_ADMIN_KEY" \
  -d '{"name": "Admin Key", "permissions": ["admin"]}'
```

Include the API key in requests via:
- `Authorization: Bearer <key>` header
- `x-api-key: <key>` header

### Permission Levels

| Permission | Access |
|-----------|--------|
| `read` | GET endpoints |
| `write` | POST/PATCH/DELETE endpoints |
| `admin` | All endpoints + key management |
| `webhooks` | Webhook endpoints |

## Webhook Setup

Configure webhooks for each channel via the `/api/webhook-config` endpoint:

```bash
# WhatsApp
curl -X POST http://localhost:3000/api/webhook-config \
  -H "x-api-key: YOUR_KEY" \
  -d '{"channel":"whatsapp","verifyToken":"your-token","accessToken":"your-token","phoneNumberId":"your-id","appSecret":"your-secret"}'

# Telegram
curl -X POST http://localhost:3000/api/webhook-config \
  -H "x-api-key: YOUR_KEY" \
  -d '{"channel":"telegram","botToken":"your-bot-token"}'
```

### Webhook URLs

| Platform | Webhook URL |
|----------|-------------|
| WhatsApp | `https://your-domain.com/api/webhook/whatsapp` |
| Messenger | `https://your-domain.com/api/webhook/messenger` |
| Instagram | `https://your-domain.com/api/webhook/instagram` |
| Telegram | `https://your-domain.com/api/webhook/telegram` |

## Deploy on Vercel

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` — PostgreSQL connection string
   - `DIRECT_URL` — Direct PostgreSQL URL
   - `GLM_API_KEY` — (optional) GLM API key
4. Deploy

> **Note:** Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com) for the PostgreSQL database.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/           # GLM AI integration
│   │   ├── bots/         # Bot CRUD + flows
│   │   ├── channels/     # Channel listing
│   │   ├── conversations/# Conversations + messages + tags + notes + transfer
│   │   ├── keys/         # API key management
│   │   ├── send/         # Outbound messages per channel
│   │   ├── teams/        # Team management
│   │   ├── webhook/      # Incoming webhooks per platform
│   │   └── webhook-config/ # Webhook credential config
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chatbot/          # Core application components
│   │   ├── FlowBuilder.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── BotList.tsx
│   │   ├── ConversationPanel.tsx
│   │   ├── ChannelManager.tsx
│   │   ├── ApiKeyManager.tsx
│   │   ├── TeamManager.tsx
│   │   └── ApiDocs.tsx
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── auth.ts           # API key auth + webhook signature verification
│   ├── db.ts             # Prisma client singleton
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Utility functions
└── hooks/
prisma/
└── schema.prisma          # Database schema
```

## License

MIT
