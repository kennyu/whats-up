import React, { useRef, useMemo, useRef as useRefAlias } from 'react';
import { View, Text, FlatList, TextInput, Pressable, Image, PanResponder, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = {
  id: string;
  text?: string;
  type: 'text' | 'image' | 'system';
  senderId: string;
  createdAt: number;
  replyToMessageId?: string;
  imageUrl?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
};

export function ChatScreen({
  messages,
  onSend,
  onPickImage,
  onBack,
}: {
  messages: Message[];
  onSend: (text: string) => void;
  onPickImage: () => void;
  onBack?: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const data = useMemo(() => [...messages].sort((a, b) => b.createdAt - a.createdAt), [messages]);
  const panResponder = useMemo(() => {
    const screen = Dimensions.get('window');
    const edgeWidth = 24;
    const threshold = 60;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        const startFromEdge = gesture.moveX <= edgeWidth;
        const horizontalSwipe = Math.abs(gesture.dx) > 20 && Math.abs(gesture.dy) < 10;
        return !!onBack && startFromEdge && horizontalSwipe && gesture.dx > 0;
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (onBack && gesture.dx > threshold && Math.abs(gesture.dy) < 30) {
          onBack();
        }
      },
    });
  }, [onBack]);

  return (
    <View style={{ flex: 1 }} {...(panResponder ? panResponder.panHandlers : {})}>
      {onBack ? (
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingHorizontal: 8 }}>
          <Pressable onPress={onBack} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
            <Text style={{ color: '#007AFF', fontSize: 16 }}>‹ Back</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        inverted
        data={data}
        keyExtractor={(m) => m.id}
        maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        renderItem={({ item }) => (
          <View style={{ padding: 8 }}>
            {item.type === 'image' && item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} />
            ) : (
              <View style={{ backgroundColor: '#f1f1f1', borderRadius: 12, padding: 8, maxWidth: '80%' }}>
                <Text>{item.text}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                  {item.status ? ` · ${item.status}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#eee' }}>
        <Pressable onPress={onPickImage} style={{ paddingHorizontal: 12, justifyContent: 'center' }}>
          <Text style={{ color: '#007AFF' }}>＋</Text>
        </Pressable>
        <TextInput ref={inputRef} placeholder="Message" style={{ flex: 1, padding: 12 }}
          onSubmitEditing={(e) => {
            const text = e.nativeEvent.text.trim();
            if (text) onSend(text);
            inputRef.current?.clear();
          }} />
        <Pressable onPress={() => { inputRef.current?.focus(); }} style={{ paddingHorizontal: 12, justifyContent: 'center' }}>
          <Text style={{ color: '#007AFF' }}>Send</Text>
        </Pressable>
      </View>
      {/* Bottom safe area spacer for home indicator / gesture bar */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}


