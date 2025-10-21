import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';

type Item = {
  id: string;
  title?: string;
  lastMessage?: string;
  unread?: number;
};

export function ConversationList({ data, onOpen }: { data: Item[]; onOpen: (id: string) => void }) {
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 12 }}
      keyboardShouldPersistTaps="handled"
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpen(item.id)}
          style={{ paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#eee' }}
       >
          <Text style={{ fontWeight: '600' }}>{item.title ?? 'Direct chat'}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ color: '#555', flex: 1 }}>
              {item.lastMessage ?? ''}
            </Text>
            {item.unread ? <Text style={{ marginLeft: 8, color: '#007AFF' }}>{item.unread}</Text> : null}
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>No conversations yet</Text>
        </View>
      }
    />
  );
}


