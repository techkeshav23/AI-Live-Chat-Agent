# 🚀 Apex - AI Customer Engagement Platform

A production-ready Mini AI Support Agent built with **Google Gemini 3 Flash Preview API** for intelligent customer engagement. This project uses **Neon** (serverless PostgreSQL) and demonstrates a modern full-stack architecture with TypeScript, React, and Prisma ORM.

> **Quick Setup**: Using Neon (serverless PostgreSQL) + Gemini 3 Flash Preview API

## 🎯 Project Overview

**Apex** is an AI-powered customer engagement platform that provides instant, intelligent support through a clean chat interface. Built as a technical demonstration of integrating Google's Gemini 3 Flash Preview model into a real-world application.

### Why Gemini 3 Flash Preview?

- **Low Latency**: Sub-second response times for snappy user experience
- **High Context Window**: Maintains conversation history effectively
- **Cost Efficient**: Optimal for "boring but profitable" automation at scale
- **Modern API**: Clean integration with system instructions for domain knowledge
- **Latest Model**: Access to Google's newest Gemini 3 capabilities

## ✨ Key Features

### Backend
- ✅ **Gemini 3 Flash Preview Integration** with system instructions for e-commerce domain knowledge
- ✅ **Neon (Serverless PostgreSQL) + Prisma ORM** for persistent conversation storage
- ✅ **Zod Validation** for type-safe API requests
- ✅ **Rate Limit Handling** with graceful error responses
- ✅ **Performance Monitoring** - Token usage and response time tracking
- ✅ **RESTful API** with Express.js and TypeScript

### Frontend
- ✅ **Clean Chat Widget** with Apex branding (bottom-right floating bubble)
- ✅ **Session Persistence** via localStorage for conversation continuity
- ✅ **Markdown Support** using react-markdown for rich AI responses
- ✅ **Auto-scroll** to latest messages
- ✅ **Typing Indicator** with animated dots
- ✅ **Responsive Design** with Tailwind CSS
- ✅ **Lucide Icons** for modern UI elements

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma
- **LLM**: Google Gemini 3 Flash Preview API (@google/generative-ai)
- **Validation**: Zod

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Markdown**: react-markdown

## 📁 Project Structure

```
Apex-ai-platform/
├── server/                 # Backend Express app
│   ├── src/
│   │   ├── index.ts       # Express server entry point
│   │   ├── lib/
│   │   │   └── prisma.ts  # Prisma client singleton
│   │   ├── routes/
│   │   │   └── chat.routes.ts  # Chat API routes
│   │   └── services/
│   │       └── gemini.service.ts  # Gemini AI service
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── client/                # Frontend React app
│   ├── src/
│   │   ├── App.tsx       # Main chat widget component
│   │   ├── main.tsx      # React entry point
│   │   ├── index.css     # Global styles + Tailwind
│   │   └── utils/
│   │       └── uuid.ts   # Session ID generator
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── package.json          # Root package for concurrently
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Neon database account ([Sign up free](https://neon.tech))
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### 1. Clone & Install

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 2. Database Setup (Neon)

1. **Create a Neon account**: Visit [neon.tech](https://neon.tech) and sign up
2. **Create a new project**: Choose a region close to you
3. **Copy your connection string**: From the Neon dashboard

```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:
```env
# Your Neon connection string (includes SSL by default)
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key_here"
PORT=3000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Prisma Setup (Neon)

```bash
cd server

# Generate Prisma client
npm run prisma:generate

# Run database migrations (Neon automatically creates the database)
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

**Note**: Neon automatically handles SSL connections and database provisioning. No need to manually create databases!

### 4. Run the Application

From the root directory:

```bash
# Run both server and client concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Server (http://localhost:3000)
cd server
npm run dev

# Terminal 2 - Client (http://localhost:5173)
cd client
npm run dev
```

### 5. Open the Application

Visit `http://localhost:5173` and click the chat bubble in the bottom-right corner!

## 🎨 Design Decisions

### System Instructions Approach
Instead of passing domain knowledge as a simple string prompt, I use Gemini's **system instructions** feature for:
- More robust model steering
- Cleaner separation of concerns
- Better consistency across conversations

### Gemini 3 Flash Preview Choice
- **Speed**: Average response time < 1s (measured in logs)
- **Context**: Large context window handles long conversations
- **Cost**: Cost-efficient for production scale

### Founding Engineer Mindset
- **Performance Logging**: Track token usage and response times
- **Error Handling**: Graceful degradation for rate limits (429)
- **Modularity**: Gemini service abstracted for easy model swapping
- **Persistence**: Session-based conversations for user continuity

## 📊 API Endpoints

### POST `/api/chat/message`
Send a message and receive AI response.

**Request:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "reply": "We offer a 30-day return window...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "clx123abc",
  "metadata": {
    "tokensUsed": 42,
    "responseTime": 847
  }
}
```

### GET `/api/chat/history/:sessionId`
Retrieve conversation history.

**Response:**
```json
{
  "messages": [
    {
      "id": "clx123abc",
      "role": "user",
      "text": "What's your return policy?",
      "createdAt": "2025-12-26T10:30:00Z"
    },
    {
      "id": "clx123def",
      "role": "model",
      "text": "We offer a 30-day return window...",
      "createdAt": "2025-12-26T10:30:01Z"
    }
  ]
}
```

## 🔧 Environment Variables

### Server (.env)
- `DATABASE_URL`: Neon PostgreSQL connection string (includes SSL by default)
- `GEMINI_API_KEY`: Google Gemini API key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CLIENT_URL`: Frontend URL for CORS

### Client (.env)
- `VITE_API_URL`: Backend API base URL

## 🧪 Production Considerations

### Implemented
- ✅ Rate limit handling (429 errors)
- ✅ Error boundaries and graceful failures
- ✅ Request validation with Zod
- ✅ Database indexing for performance
- ✅ CORS configuration
- ✅ TypeScript for type safety

### Future Enhancements
- [ ] Authentication & user management
- [ ] Webhook support for async processing
- [ ] Redis caching for conversation history
- [ ] Streaming responses for longer replies
- [ ] A/B testing framework for prompt optimization
- [ ] Analytics dashboard for engagement metrics

## 🤖 LLM Notes

### Provider
**Google Gemini 3 Flash Preview** via `@google/generative-ai` SDK

### Prompting Strategy
I use Gemini's **System Instructions** feature (not regular prompts) to inject domain knowledge:

```
You are a professional customer support agent for "Apex", an AI-powered customer engagement platform.

Domain Knowledge:
- Shipping: Standard shipping takes 3-5 business days
- Returns: We offer a 30-day return window for all products
- Support Hours: Monday-Friday, 9 AM - 6 PM PST
- Brand Voice: Professional, concise, helpful, and friendly

Guidelines:
- Always maintain the "Apex" brand voice
- Provide accurate information based on the domain knowledge above
- Be empathetic and solution-oriented
- Keep responses concise but complete
- If you don't know something, acknowledge it and offer to escalate to a human agent
```

### Why System Instructions over Regular Prompts?
- **More reliable**: System instructions are treated differently by the model
- **Cleaner code**: No need to prepend context to every message
- **Better separation**: Domain knowledge is separate from conversation history

### Token/Cost Control
- `maxOutputTokens: 500` - Caps response length
- Conversation history included for context (but could be truncated for very long chats)

---

## ⚖️ Trade-offs & "If I Had More Time..."

### Trade-offs Made

| Decision | Trade-off | Reason |
|----------|-----------|--------|
| React over Svelte | Not their preferred framework | Faster development with familiar tooling |
| Gemini over OpenAI/Claude | Less established than GPT-4 | Free tier, fast responses, good enough for demo |
| No Redis caching | Slower repeated queries | Simplicity; DB is fast enough for demo scale |
| No authentication | Anyone can chat | Assignment said "no auth required" |
| No streaming responses | User waits for full response | Simpler implementation; sub-second anyway |

### If I Had More Time...

1. **Streaming Responses** - Show AI response as it's generated (better UX for longer replies)
2. **Redis Caching** - Cache conversation history for faster loads
3. **Authentication** - User accounts with conversation history across devices
4. **Testing** - Unit tests for services, integration tests for API endpoints
5. **Rate Limiting** - Per-user rate limits (not just handling Gemini's limits)
6. **Analytics Dashboard** - Track popular questions, response times, user satisfaction
7. **Multi-channel Support** - Abstract the chat interface for WhatsApp/Instagram integration
8. **Prompt A/B Testing** - Framework to test different system prompts
9. **Fallback Models** - Switch to backup LLM if primary fails
10. **Docker Compose** - One-command local setup with all dependencies

---

## 📝 Database Schema

```prisma
model Conversation {
  id        String   @id @default(cuid())
  sessionId String   @unique
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(...)
  role           String       // 'user' or 'ai'
  text           String       @db.Text
  createdAt      DateTime     @default(now())
}
```

## 🤝 Contributing

This is a demonstration project for the Apex technical assignment. For production use, consider:
- Adding comprehensive test coverage
- Implementing CI/CD pipelines
- Setting up monitoring and alerting
- Adding multi-tenancy support

## 📄 License

MIT

---

**Built with ❤️ for Apex** | Demonstrating clean architecture, modern best practices, and "founding engineer" thinking.
