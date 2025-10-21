<!-- 4dfc576e-0080-4b6a-99dc-e89ff49b3b3e f8ff3f47-432e-4b09-8666-2540b0dae181 -->
# New Conversation Flow (1:1 & Group)

## Goal

Enable users to start new 1:1 or group chats from the app, creating conversations on Convex and updating the local SQLite cache so they appear instantly in the list and can be opened.

## Scope

- New entry point (button) from the conversation list to open a “New Conversation” flow
- 1:1: pick a user (basic mock selector now, real directory later) → createDirect
- Group: set title, pick multiple users → createGroup
- On success: insert/update local `conversations_local` and route to the chat
- Optimistic UI with fallback on error

## UI/UX

- Add a “+” floating action button on the conversation list
- Modal sheet: tabs for “New Chat” and “New Group”
- Minimal participant selector (temporary mock: text input of user handles, comma-separated)
- Validation: at least 1 participant for 1:1, 2+ for group; title required for group

## Data Flow

- Call Convex mutations: `conversations.createDirect`, `conversations.createGroup`
- Receive real `conversationId`
- Insert into SQLite: `conversations_local` with returned id, title/kind, timestamps set to now
- Navigate to `ChatScreen` with the new `conversationId`

## Error Handling

- Show inline error if Convex call fails
- Disable submit while pending; allow retry

## Out of Scope (later)

- Real user directory/search
- Avatars/upload
- Role management UI

## Acceptance

- From list, user can create a 1:1 or group
- New conversation appears at top of list and opens to chat
- App restart preserves the new conversation

### To-dos

- [ ] Add '+' FAB on conversation list to open new conversation modal
- [ ] Build modal with tabs: New Chat and New Group
- [ ] Wire createDirect mutation and insert conversation locally
- [ ] Wire createGroup mutation and insert conversation locally
- [ ] Route to ChatScreen on success with new conversationId
- [ ] Show pending state, surface errors