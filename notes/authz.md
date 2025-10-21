# Authorization Rules

Server-side checks to enforce data access invariants. All checks happen in Convex actions/mutations/queries.

## Core Invariants

- Only members of a conversation can read conversation details, messages, reactions, receipts, or typing states for that conversation.
- Only the sender can edit or delete their own message. Group admins can moderate any message in their conversation.
- Reactions require membership and are unique per (messageId, userId, emoji).
- Read receipts can only be written for the authenticated user and must reference a message within the target conversation.
- Typing state writes are rate-limited and auto-expire.

## Checks per Operation

### conversations.read(list)
- Input: userId
- Check: membership exists in `conversationMembers` for each returned conversation

### messages.listByConversation(conversationId, cursor)
- Check: requester is a member of conversation
- Result: page of messages ordered by createdAt desc

### messages.create(conversationId, text|attachments, replyToMessageId?)
- Check: requester is member
- If replyToMessageId provided: verify referenced message belongs to same conversation
- Set createdAt = server time

### messages.edit(messageId, text)
- Check: requester == message.senderId OR requester is admin of conversation
- Set editedAt = server time

### messages.softDelete(messageId)
- Check: requester == message.senderId OR requester is admin of conversation
- Set deletedAt = server time (retain row to preserve reply context)

### reactions.toggle(messageId, emoji)
- Check: requester is member of message.conversationId
- If exists (messageId, userId, emoji): delete; else insert

### readReceipts.upsert(conversationId, messageId)
- Check: requester is member; message belongs to conversation
- Upsert latest per (userId, conversationId) with readAt = server time

### typingStates.set(conversationId)
- Check: requester is member
- Insert/replace with expiresAt = now + 10s; periodically clean expired

### notificationTokens.register(token, platform)
- Check: requester is authenticated
- Upsert by (userId, token)

## Rate Limits & Abuse Prevention
- messages.create: limit N per second per user per conversation
- reactions.toggle: limit N per second per user per conversation
- typingStates.set: throttle to once every 2s per user per conversation
- Global: exponential backoff on repeated failures

## Auditing (Optional)
- Log moderation actions (deletes/edits by admins)
- Log bulk membership changes


