# Sync Model

This document outlines upstream (outbox) and downstream (pull) synchronization between the device (Expo SQLite via Drizzle) and Convex.

## Downstream (Server → Device)

- For each conversation, track `sync_state.lastCursor`.
- Pull messages changed since cursor via a Convex query; include created/edited/deleted and reactions/receipts.
- Upsert into local tables. Prefer server timestamps.
- Prune to last N (e.g., 200) messages per conversation to control cache size.
- Recompute conversation row: `updatedAt`, `lastMessageId`, unread counts.

## Upstream (Device → Server)

- All local writes go to `outbox` with a `clientId` and JSON payload.
- Background worker flushes oldest-first (by createdAt) with exponential backoff on failure.
- On success, reconcile:
  - If server created a new message id, replace local `messages_local.id` with server id and clear `clientId`.
  - Update status to `sent` (later `delivered`/`read` from server).
  - Remove outbox row.
- On failure (retryable), increment `attemptCount`, set `lastAttemptAt`, backoff.
- On fatal errors (e.g., authorization), mark error and surface to UI.

## Conflicts

- Server wins. Local edits reconcile to server truth.
- Soft deletes (`deletedAt`) ensure replies remain resolvable.
- Use server timestamps to avoid clock skew issues.

## Typing & Presence

- Typing is ephemeral; optionally call a Convex action and ignore if expired server-side.
- Do not persist typing states locally beyond short-lived UI state.

## Media Uploads

- Save `attachments_local` with `uri` immediately.
- Upload file via Convex storage action; update remote URL and set uploadStatus to `uploaded`.
- If upload fails, keep `uploadStatus = failed` and allow retry.

## Read Receipts

- Locally upsert latest per (user, conversation).
- Outbox flush writes to server. Ignore older receipts if a newer one exists.

## Background Execution

- Use app task/background fetch where available to flush outbox and pull updates.
- Always guard against battery/network constraints; allow manual refresh.


