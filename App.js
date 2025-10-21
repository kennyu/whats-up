import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StatusBar, ActivityIndicator } from 'react-native';
import { ConversationList } from './app/screens/ConversationList';
import { ChatScreen } from './app/screens/ChatScreen';
import { NewConversationModal } from './app/screens/NewConversationModal';
import { conversationsLocal, messagesLocal, outbox, readReceiptsLocal, syncState, attachmentsLocal, reactionsLocal, conversationMembersLocal } from './localdb/schema';
import { desc, eq } from 'drizzle-orm';
import { sendTextLocal } from './app/actions/chat';
import { flushOutbox } from './app/sync/outboxWorker';
import { pullConversation, pullConversations } from './app/sync/pullLoop';
import { ConvexReactClient } from 'convex/react';
import { api } from './convex/_generated/api';
import { db, dbReady } from './localdb/db';

export default function App() {
  const [route, setRoute] = useState({ name: 'list', params: {} });
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const selectedConversationId = route.name === 'chat' ? route.params.conversationId : null;
  const [showNew, setShowNew] = useState(false);
  const convex = useMemo(() => new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await dbReady; // ensure tables exist before any queries
        // Ensure backend user exists
        try { await convex.mutation(api.auth.ensureUser, {}); } catch {}
        // Pull latest conversations from server into localdb
        try { await pullConversations(convex); } catch {}
        let rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
        // Optional: if you want automatic bootstrap, place it behind a feature flag.
        if (!mounted) return;
        setConversations(rows.map((r) => ({ id: r.id, title: r.title ?? 'Direct chat', lastMessage: '', unread: 0 })));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!selectedConversationId) return;
    (async () => {
      const rows = await db
        .select()
        .from(messagesLocal)
        .where(eq(messagesLocal.conversationId, selectedConversationId))
        .orderBy(desc(messagesLocal.createdAt));
      if (!mounted) return;
      setMessages(
        rows.map((m) => ({
          id: m.id,
          text: m.text ?? '',
          type: m.type,
          senderId: m.senderId,
          createdAt: m.createdAt,
          replyToMessageId: m.replyToMessageId ?? undefined,
          status: m.status,
        }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, [selectedConversationId]);

  // Background flush + pull
  useEffect(() => {
    let timer;
    const tick = async () => {
      try {
        await flushOutbox(db, convex);
        // Periodically pull conversation list updates
        await pullConversations(convex);
        // refresh conversation list after pull
        const convRows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
        setConversations(convRows.map((r) => ({ id: r.id, title: r.title ?? 'Direct chat', lastMessage: '', unread: 0 })));
        if (selectedConversationId) {
          await pullConversation(convex, selectedConversationId);
          // refresh local view after pull
          const rows = await db
            .select()
            .from(messagesLocal)
            .where(eq(messagesLocal.conversationId, selectedConversationId))
            .orderBy(desc(messagesLocal.createdAt));
          setMessages(rows.map((m) => ({
            id: m.id,
            text: m.text ?? '',
            type: m.type,
            senderId: m.senderId,
            createdAt: m.createdAt,
            replyToMessageId: m.replyToMessageId ?? undefined,
            status: m.status,
          })));
        }
      } catch {}
      timer = setTimeout(tick, 2000);
    };
    tick();
    return () => { if (timer) clearTimeout(timer); };
  }, [convex, selectedConversationId]);

  const handleOpenConversation = (id) => setRoute({ name: 'chat', params: { conversationId: id } });

  const handleSend = async (text) => {
    if (!selectedConversationId) return;
    // NOTE: replace 'local-user' with authenticated user id once auth is wired
    await sendTextLocal(selectedConversationId, text, 'local-user');
    // Optimistically refresh
    const rows = await db
      .select()
      .from(messagesLocal)
      .where(eq(messagesLocal.conversationId, selectedConversationId))
      .orderBy(desc(messagesLocal.createdAt));
    setMessages(
      rows.map((m) => ({
        id: m.id,
        text: m.text ?? '',
        type: m.type,
        senderId: m.senderId,
        createdAt: m.createdAt,
        replyToMessageId: m.replyToMessageId ?? undefined,
        status: m.status,
      }))
    );
  };

  const handlePickImage = () => {
    // TODO: integrate expo-image-picker and enqueue image send
  };

  const handleDumpDb = async () => {
    try {
      const [convs, msgs, ob, receipts, cursors] = await Promise.all([
        db.select().from(conversationsLocal),
        db.select().from(messagesLocal),
        db.select().from(outbox),
        db.select().from(readReceiptsLocal),
        db.select().from(syncState),
      ]);
      const dump = { conversations: convs, messages: msgs, outbox: ob, readReceipts: receipts, syncState: cursors };
      console.log('LOCALDB DUMP\n' + JSON.stringify(dump, null, 2));
    } catch (e) {
      console.warn('Dump DB failed:', e);
    }
  };

  const handleClearOutbox = async () => {
    try {
      await db.delete(outbox);
      console.log('Outbox cleared');
    } catch (e) {
      console.warn('Clear outbox failed:', e);
    }
  };

  const handleClearDb = async () => {
    try {
      await db.delete(messagesLocal);
      await db.delete(attachmentsLocal);
      await db.delete(reactionsLocal);
      await db.delete(readReceiptsLocal);
      await db.delete(conversationMembersLocal);
      await db.delete(conversationsLocal);
      await db.delete(outbox);
      await db.delete(syncState);
      console.log('Local DB cleared');
      // Refresh UI state
      const rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
      setConversations(rows.map((r) => ({ id: r.id, title: r.title ?? 'Direct chat', lastMessage: '', unread: 0 })));
      if (route.name === 'chat') setRoute({ name: 'list', params: {} });
    } catch (e) {
      console.warn('Clear DB failed:', e);
    }
  };

  const handleCreateDirect = async (handlesCsv) => {
    try {
      const handles = handlesCsv.split(',').map((h) => h.trim()).filter(Boolean);
      if (handles.length !== 1) { setShowNew(false); return; }
      const nowTs = Date.now();
      const clientId = `temp-${nowTs}`;
      // optimistic local insert
      await db.insert(conversationsLocal).values({
        id: clientId,
        kind: 'direct',
        title: handles[0],
        createdBy: 'me',
        createdAt: nowTs,
        updatedAt: nowTs,
        muted: 0,
        archived: 0,
      });
      // enqueue creation
      await db.insert(outbox).values({
        clientId,
        kind: 'conversation',
        payload: JSON.stringify({ type: 'direct', handles, clientId }),
        createdAt: nowTs,
      });
      const rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
      setConversations(rows.map((r) => ({ id: r.id, title: r.title ?? 'Direct chat', lastMessage: '', unread: 0 })));
      setRoute({ name: 'chat', params: { conversationId: clientId } });
    } catch (e) {
      console.warn('createDirect failed:', e);
    } finally {
      setShowNew(false);
    }
  };

  const handleCreateGroup = async (title, handlesCsv) => {
    try {
      const handles = handlesCsv.split(',').map((h) => h.trim()).filter(Boolean);
      if (!title) { setShowNew(false); return; }
      const nowTs = Date.now();
      const clientId = `temp-${nowTs}`;
      await db.insert(conversationsLocal).values({
        id: clientId,
        kind: 'group',
        title,
        createdBy: 'me',
        createdAt: nowTs,
        updatedAt: nowTs,
        muted: 0,
        archived: 0,
      });
      await db.insert(outbox).values({
        clientId,
        kind: 'conversation',
        payload: JSON.stringify({ type: 'group', title, handles, clientId }),
        createdAt: nowTs,
      });
      const rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
      setConversations(rows.map((r) => ({ id: r.id, title: r.title ?? 'Group', lastMessage: '', unread: 0 })));
      setRoute({ name: 'chat', params: { conversationId: clientId } });
    } catch (e) {
      console.warn('createGroup failed:', e);
    } finally {
      setShowNew(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : route.name === 'list' ? (
        <View style={{ flex: 1 }}>
          <ConversationList data={conversations} onOpen={handleOpenConversation} />
          <View style={{ position: 'absolute', right: 16, bottom: 24, alignItems: 'flex-end' }}>
            <Text onPress={handleDumpDb} style={{ backgroundColor: '#eee', color: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 8 }}>Dump</Text>
            <Text onPress={handleClearOutbox} style={{ backgroundColor: '#eee', color: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 8 }}>Clear Outbox</Text>
            <Text onPress={handleClearDb} style={{ backgroundColor: '#eee', color: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 8 }}>DESTROY localdb</Text>
            <Text onPress={() => setShowNew(true)} style={{ backgroundColor: '#007AFF', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 }}>＋</Text>
          </View>
          <NewConversationModal
            visible={showNew}
            onClose={() => setShowNew(false)}
            onCreateDirect={handleCreateDirect}
            onCreateGroup={handleCreateGroup}
          />
        </View>
      ) : (
        <ChatScreen messages={messages} onSend={handleSend} onPickImage={handlePickImage} onBack={() => setRoute({ name: 'list', params: {} })} />
      )}
    </SafeAreaView>
  );
}


