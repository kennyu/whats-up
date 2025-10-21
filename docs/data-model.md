# Data Model

This document describes the core data model spanning Convex (source of truth) and the Expo SQLite local cache (via Drizzle ORM).

## Entities (Convex)

- users: basic profile and presence fields
- conversations: 1:1 or group metadata and sorting fields
- conversationMembers: membership with roles and preferences
- messages: text/image/system messages with simple replies via replyToMessageId
- attachments: metadata for stored files linked to messages
- reactions: emoji reactions keyed by (messageId, userId, emoji)
- readReceipts: latest read cursor per (user, conversation)
- typingStates: ephemeral presence per conversation
- notificationTokens: push tokens per user and platform

## Relationships

- conversations 1..* messages (via messages.conversationId)
- conversations 1..* conversationMembers (membership)
- messages 0..* reactions (by messageId)
- messages 0..* attachments (by messageId)
- messages 0..1 replyToMessageId (simple inline reply)
- users 1..* readReceipts (latest per conversation)

## Indexing (Convex)

- messages: by (conversationId, createdAt) for pagination
- messages: by replyToMessageId for fetching replies
- conversations: by updatedAt for inbox sorting
- members: by userId for "my conversations" joins
- reactions: by messageId and by (messageId, userId, emoji) for toggles
- receipts: by (userId, conversationId) for latest cursor

## Local Cache (Expo SQLite via Drizzle)

- mirrors a subset for fast list rendering and offline UX
- includes an outbox table for optimistic writes while offline
- includes sync_state to track per-conversation cursors

## Message Lifecycle

1. Compose → insert into messages_local with status "pending" and clientId
2. Outbox worker sends Convex mutation
3. On success: replace local id with server id, set status "sent" and update conversations_local
4. On delivery/read updates from server: update local status accordingly
5. On delete/edit: server sends updated fields; local reconciles and preserves reply context

## Read Receipts

- Store latest per (user, conversation) both server-side and locally
- Compute unread count as messages after latest read cursor

## Reactions

- Toggle semantics: if same (messageId, userId, emoji) exists → delete; else insert
- Count is derived (reactions_count) for quick UI

## Media

- Capture image → save attachments_local with file:// uri
- Upload via Convex storage; update attachment.url when uploaded
- Link attachment metadata to message; show placeholders while uploading

## Groups

- conversations.kind = "group"; title/avatar optional
- membership operations restricted to admins
- system messages for join/leave/rename (type "system")

## Notes

- No E2E in v1; trust server; device at rest encryption recommended
- Server timestamps preferred to mitigate clock skew; client time only for optimistic UI


