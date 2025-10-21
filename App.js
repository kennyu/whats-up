import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StatusBar, ActivityIndicator } from 'react-native';
import { ConversationList } from './app/screens/ConversationList';
import { ChatScreen } from './app/screens/ChatScreen';
import { conversationsLocal, messagesLocal } from './localdb/schema';
import { desc, eq } from 'drizzle-orm';
import { sendTextLocal } from './app/actions/chat';
import { flushOutbox } from './app/sync/outboxWorker';
import { pullConversation } from './app/sync/pullLoop';
import { ConvexReactClient } from 'convex/react';
import { api } from './convex/_generated/api';
import { db, dbReady } from './localdb/db';

export default function App() {
  const [route, setRoute] = useState({ name: 'list', params: {} });
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const selectedConversationId = route.name === 'chat' ? route.params.conversationId : null;
  const convex = useMemo(() => new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await dbReady; // ensure tables exist before any queries
        // Ensure backend user exists
        try { await convex.mutation(api.auth.ensureUser, {}); } catch {}
        let rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
        // First-run bootstrap: if no local conversations, create one on the server and store its real id locally
        if (rows.length === 0) {
          try {
            const seeded = await convex.mutation(api.dev.seedCreateGroup, { title: 'Demo Chat' });
            const nowTs = Date.now();
            await db.insert(conversationsLocal).values({
              id: seeded.conversationId,
              kind: 'group',
              title: 'Demo Chat',
              createdBy: 'seed-user',
              createdAt: nowTs,
              updatedAt: nowTs,
              muted: 0,
              archived: 0,
            });
            rows = await db.select().from(conversationsLocal).orderBy(desc(conversationsLocal.updatedAt));
          } catch {}
        }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : route.name === 'list' ? (
        <ConversationList data={conversations} onOpen={handleOpenConversation} />
      ) : (
        <ChatScreen messages={messages} onSend={handleSend} onPickImage={handlePickImage} onBack={() => setRoute({ name: 'list', params: {} })} />
      )}
    </SafeAreaView>
  );
}


