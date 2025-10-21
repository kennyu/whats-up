<!-- 4dfc576e-0080-4b6a-99dc-e89ff49b3b3e 6bd167da-9b6f-4bd0-adb6-cd57990efeec -->
# MVP Implementation Plan (Foundation → Features)

## Goal

Ship the 24-hour MVP from MessageAI.md: 1:1 + groups, real-time delivery, persistence, optimistic UI, presence, timestamps, auth, read receipts, push notifications.

## 1) Foundation

- Initialize Expo app, TypeScript, Babel/Metro config (done).
- Install Convex/Drizzle/expo-sqlite (done) and wire basic project scripts.
- Create `.env` handling and platform config placeholders (FCM/APNs keys later).

## 2) Data & Backend

- Convex schema (done). Add queries/mutations/actions for conversations, messages, reactions, receipts, typing, notifications.
- Expo SQLite schema (done). Implement outbox + sync engine (downstream+upstream) with pruning.
- Auth: use Convex auth (or Clerk/Auth0 later if needed). Minimal email/anonymous for MVP.

## 3) App State & Sync

- Session bootstrap: login → preload user + conversations list cursors.
- Sync loop: pull per-conversation since cursor; reconcile; update unread.
- Outbox worker: retries, backoff, id reconciliation.

## 4) Messaging UI (Custom Components)

- Conversation list: shows title/avatar, last message preview, unread count, online badge.
- Chat screen: build with FlatList (inverted), MessageBubble, DateSeparator, Composer, AttachmentButton.
- Features: send, replyTo (inline quote), reactions bar, image send/render with tap-to-zoom.
- Optimistic UI: pending → sent → delivered → read (status badges/icons).
- Timestamps: in bubbles and list items; show "Today/Yesterday" separators.
- Performance: windowed list, keyExtractor=id, maintainVisibleContentPosition, getItemLayout.
- Accessibility: roles/labels for bubbles and composer; large text support.

## 5) Presence & Read State

- Typing indicators: set/expire typingStates; render in chat header.
- Online/offline presence: lastSeenAt + recent activity heuristic for MVP.
- Read receipts: per-user per-conversation latest cursor; double-tick style indicator.

## 6) Groups

- Create group: select members, set title, role=admin/member.
- Membership changes (admin only), system messages for join/leave/rename.

## 7) Media (Images)

- Pick image, create attachment row (local URI), upload via Convex action, replace with URL.
- Render image bubble with tap-to-zoom.

## 8) Notifications

- Register device token; store in Convex.
- On new message, server action fans out via Expo Notifications/FCM.
- Foreground handler for in-app banners; background opens chat.

## 9) Deployment

- Convex: `convex deploy` to prod.
- Expo: run on real devices (Dev Client), ensure push works on both platforms.
- Smoke tests per MessageAI MVP scenarios.

## Acceptance Checklist (MVP)

- 1:1 and group chat send/receive in real-time (two devices).
- Messages persist locally and sync after reconnect.
- Optimistic send state transitions; crash/relaunch persistence holds.
- Online/offline indicators and typing.
- Timestamps visible.
- Auth exists; user profiles render.
- Read receipts shown.
- Push notifications received (fg at least).

### To-dos

- [ ] Implement minimal Convex auth and user bootstrap
- [ ] Add Convex queries/mutations for conversations/messages
- [ ] Add reactions toggle and list APIs
- [ ] Add readReceipts upsert and typing state APIs
- [ ] Implement SQLite outbox + downstream sync + pruning
- [ ] Build conversation list with last message and unread count
- [ ] Build chat screen with send, replyTo, timestamps, optimistic
- [ ] Add emoji reactions UI and counts
- [ ] Add image pick/upload/render bubble flow
- [ ] Show typing and online/offline indicators
- [ ] Create/join/leave groups and admin operations
- [ ] Register tokens and fan-out notifications
- [ ] Run MessageAI MVP scenarios on two devices