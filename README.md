# What's Up

A modern, real-time messaging application built with React Native and Expo, featuring offline-first architecture and WhatsApp-like functionality.

## Features

### Core Messaging
- 📱 **1:1 and Group Chats** - Create direct conversations or group chats with multiple participants
- ⚡ **Real-time Delivery** - Instant message delivery powered by Convex
- 💾 **Offline Support** - Messages persist locally and sync when back online
- ✨ **Optimistic UI** - Instant feedback with smart conflict resolution
- 🔄 **Message Status** - Track pending, sent, delivered, and read status

### Rich Interactions
- 😊 **Reactions** - Add emoji reactions to messages
- 💬 **Replies** - Quote and reply to specific messages
- 🖼️ **Image Sharing** - Send and receive images with tap-to-zoom (in progress)
- ⌨️ **Typing Indicators** - See when others are typing
- 👁️ **Read Receipts** - Know when your messages are read
- 🟢 **Presence** - Online/offline status indicators

### User Experience
- 📅 **Smart Timestamps** - Today/Yesterday separators and message times
- 🎨 **Modern UI** - Clean, intuitive interface
- 🔔 **Push Notifications** - Stay notified of new messages (planned)
- 🔐 **Authentication** - Secure user authentication via Convex

## Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** - Development tooling and native APIs
- **TypeScript** - Type-safe development

### Backend & Database
- **Convex** - Real-time backend and source of truth
- **Expo SQLite** - Local persistence layer
- **Drizzle ORM** - Type-safe SQL queries

### Key Features
- **Outbox Pattern** - Reliable message delivery with retry logic
- **Cursor-based Sync** - Efficient incremental updates
- **Server-side Timestamps** - Clock-skew resistant

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    React Native App                  │
│  ┌────────────────────────────────────────────────┐ │
│  │            UI Components                        │ │
│  │  (ConversationList, ChatScreen, etc.)          │ │
│  └────────────────┬───────────────────────────────┘ │
│                   │                                  │
│  ┌────────────────▼───────────────────────────────┐ │
│  │        Local SQLite (Drizzle ORM)              │ │
│  │  • messages_local   • conversations_local      │ │
│  │  • outbox           • sync_state               │ │
│  │  • read_receipts    • attachments_local        │ │
│  └────────────────┬───────────────────────────────┘ │
│                   │                                  │
│  ┌────────────────▼───────────────────────────────┐ │
│  │            Sync Engine                         │ │
│  │  • Outbox Worker (upstream)                   │ │
│  │  • Pull Loop (downstream)                     │ │
│  │  • Conflict Resolution                        │ │
│  └────────────────┬───────────────────────────────┘ │
└───────────────────┼──────────────────────────────────┘
                    │
                    │ Real-time Sync
                    │
┌───────────────────▼──────────────────────────────────┐
│                 Convex Backend                       │
│  ┌──────────────────────────────────────────────┐   │
│  │   Tables (Source of Truth)                   │   │
│  │   • users            • messages              │   │
│  │   • conversations    • reactions             │   │
│  │   • members          • readReceipts          │   │
│  │   • attachments      • typingStates          │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Sync Strategy

**Downstream (Server → Device)**
- Cursor-based pull for each conversation
- Incremental updates only fetch changes since last sync
- Local cache pruned to last ~200 messages per conversation
- Server timestamps prevent clock skew issues

**Upstream (Device → Server)**
- Outbox pattern for reliable delivery
- Optimistic UI updates immediately
- Background worker flushes with exponential backoff
- ID reconciliation when server assigns permanent IDs

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whats-up
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   # Install Convex CLI globally (if not already installed)
   npm install -g convex

   # Initialize Convex (follow prompts)
   npx convex dev
   ```

4. **Configure environment**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

5. **Start the app**
   ```bash
   # Start Expo development server
   npm start

   # In separate terminals:
   npm run android  # for Android
   npm run ios      # for iOS
   ```

## Authentication (Convex Auth)

This app uses Convex Auth with Google OAuth and Email/Password.

1) Packages (already installed)
   - `@convex-dev/auth` (server + React bindings)
   - `expo-secure-store` (secure token storage on device)

2) Convex backend setup
   - `convex/auth.ts` configures providers:
     - Google (uses `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`)
     - Password (email + password with `flow=signUp|signIn`)
   - `convex/http.ts` registers public routes used by OAuth and JWKS.

3) Environment variables (Convex deployment)
   - Set in Convex env (not just local .env):
     ```bash
     npx convex env set AUTH_GOOGLE_ID <google-client-id>
     npx convex env set AUTH_GOOGLE_SECRET <google-client-secret>
     ```
   - Ensure `EXPO_PUBLIC_CONVEX_URL` is set in your `.env.local` for the app.

4) Client wiring (already done)
   - `App.js` wraps the app with `ConvexAuthProvider` and uses `expo-secure-store` for token storage.
   - Unauthenticated: sign-in screen supports Google and email/password.
   - Authenticated: loads app and calls `api.auth.ensureUser` to upsert profile.

5) Troubleshooting
   - If Google OAuth redirects but doesn’t finalize: ensure `convex/http.ts` exists and your Google OAuth redirect URI is `https://<your-convex>.convex.site/api/auth/callback/google`.
   - If user creation fails on sign-in: schema requires fields. We made app-specific fields optional in `convex/schema.ts` so Convex Auth can create a minimal user.
   - React/renderer mismatch: align `react` and `react-dom` with your RN renderer version, then clear Metro cache.

## Project Structure

```
whats-up/
├── app/
│   ├── actions/          # Business logic (send messages, etc.)
│   ├── screens/          # UI screens
│   │   ├── ChatScreen.tsx
│   │   ├── ConversationList.tsx
│   │   └── NewConversationModal.tsx
│   ├── sync/             # Sync engine
│   │   ├── outboxWorker.ts    # Upstream sync
│   │   └── pullLoop.ts        # Downstream sync
│   └── utils/            # Shared utilities
│
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── conversations.ts  # Conversation queries/mutations
│   ├── messages.ts       # Message queries/mutations
│   ├── auth.ts          # Authentication
│   └── ...
│
├── localdb/              # Local SQLite setup
│   ├── db.ts            # Database initialization
│   ├── schema.ts        # Drizzle schema
│   └── sync.ts          # Sync utilities
│
├── docs/                 # Documentation
│   ├── data-model.md    # Data model details
│   └── sync.md          # Sync architecture
│
└── App.js               # Main application entry
```

## Development

### Available Scripts

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Start Convex backend in dev mode
npm run convex:dev

# Type checking
npm run typecheck
```

### Debug Tools

The app includes built-in debug tools in the conversation list:
- **Dump** - Log entire local database state to console
- **Clear Outbox** - Remove all pending outbox items
- **DESTROY localdb** - Clear all local data (for testing)

### Key Development Concepts

**Optimistic UI**
Messages appear instantly in the UI with "pending" status, then update to "sent" when confirmed by the server.

**ID Reconciliation**
Local messages use temporary client IDs (`temp-{timestamp}`) until the server assigns permanent IDs.

**Sync Loop**
Runs every 2 seconds to:
1. Flush outbox (send pending messages)
2. Pull conversation list updates
3. Pull messages for active conversation
4. Update UI with new data

## Data Model

### Core Entities

- **users** - User profiles and presence
- **conversations** - Chat metadata (1:1 or group)
- **conversationMembers** - Membership and roles
- **messages** - Text/image/system messages
- **reactions** - Emoji reactions on messages
- **readReceipts** - Read status per user/conversation
- **typingStates** - Ephemeral typing indicators
- **attachments** - File metadata for messages

See [docs/data-model.md](docs/data-model.md) for detailed schema.

## Roadmap

### Current Status (MVP)
- ✅ Real-time 1:1 and group messaging
- ✅ Offline support with sync
- ✅ Optimistic UI
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Message reactions
- ✅ Basic authentication

### In Progress
- 🔨 Image attachments with upload
- 🔨 Push notifications
- 🔨 Enhanced presence system

### Planned
- 📋 Message editing and deletion
- 📋 Voice messages
- 📋 Video messages
- 📋 Message search
- 📋 Group admin features
- 📋 User profiles and settings
- 📋 End-to-end encryption

See [plans/master-plan.md](plans/master-plan.md) for detailed roadmap.

## Contributing

This is currently a personal project. Contributions, issues, and feature requests are welcome!

## Architecture Decisions

### Why Convex?
- Real-time subscriptions out of the box
- Serverless functions co-located with database
- TypeScript-first with automatic type generation
- Simple deployment and scaling

### Why SQLite + Drizzle?
- Offline-first architecture requires local persistence
- Drizzle provides type-safe ORM with minimal overhead
- SQLite is battle-tested and available on all platforms via Expo

### Why Outbox Pattern?
- Guarantees at-least-once delivery
- Survives app crashes and network issues
- Allows true optimistic UI
- Simple to reason about and debug

## License

[Add your license here]

## Acknowledgments

Built with inspiration from modern messaging apps and best practices in offline-first mobile development.

