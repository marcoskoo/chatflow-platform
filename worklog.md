---
Task ID: 1
Agent: Main Agent
Task: Add API Key authentication and real webhook integrations to ChatFlow platform

Work Log:
- Updated prisma/schema.prisma with ApiKey and WebhookConfig models
- Created src/lib/auth.ts with API key validation, hashing (SHA-256), HMAC signature verification for Meta and Telegram
- Created src/app/api/keys/route.ts - CRUD for API keys (list, create)
- Created src/app/api/keys/[keyId]/route.ts - API key management (update, revoke)
- Created src/app/api/webhook-config/route.ts - Webhook configuration CRUD with upsert
- Created src/app/api/webhook/[channel]/route.ts - Enhanced webhook handler with real platform payload parsing (WhatsApp Cloud API, Messenger, Instagram, Telegram Bot API)
- Created src/app/api/send/[channel]/route.ts - Send messages via real platform APIs (WhatsApp Cloud API with interactive buttons, Messenger with button templates, Instagram API, Telegram Bot API with inline keyboards)
- Protected all existing API endpoints with requireAuth middleware (bots, conversations, messages, tags, notes, transfer, channels, teams, ai/chat, ai/suggest)
- Updated src/app/api/route.ts with v2.0.0 reflecting authentication and all new endpoints
- Created src/components/chatbot/ApiKeyManager.tsx - Full UI for API key management and webhook configuration with tabs
- Updated src/lib/store.ts with 'security' view type
- Updated src/components/chatbot/Sidebar.tsx with new Seguridad nav item
- Updated src/app/page.tsx with ApiKeyManager component rendering
- Ran prisma db push to sync schema
- Build passes cleanly with 22 API routes

Stage Summary:
- All endpoints now require API key authentication (Bearer token or x-api-key header)
- Webhooks remain open but verify HMAC signatures from platforms
- WhatsApp Cloud API: full payload parsing, interactive button messages, list messages
- Facebook Messenger: postback buttons, quick replies, text messages
- Instagram Direct: text and attachment messages
- Telegram Bot API: inline keyboards, callback queries, various message types
- Send API supports all 4 platforms with proper message format adaptation
- UI includes Security & API panel with key management and webhook config tabs
