import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';

export function NewConversationModal({
  visible,
  onClose,
  onCreateDirect,
  onCreateGroup,
}: {
  visible: boolean;
  onClose: () => void;
  onCreateDirect: (handlesCsv: string) => void;
  onCreateGroup: (title: string, handlesCsv: string) => void;
}) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [handles, setHandles] = useState('');
  const [title, setTitle] = useState('');

  const reset = () => {
    setHandles('');
    setTitle('');
    setTab('direct');
  };

  const submit = () => {
    if (tab === 'direct') {
      onCreateDirect(handles.trim());
    } else {
      onCreateGroup(title.trim(), handles.trim());
    }
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Pressable onPress={() => setTab('direct')} style={{ marginRight: 16 }}>
              <Text style={{ fontWeight: tab === 'direct' ? '700' : '400' }}>New Chat</Text>
            </Pressable>
            <Pressable onPress={() => setTab('group')}>
              <Text style={{ fontWeight: tab === 'group' ? '700' : '400' }}>New Group</Text>
            </Pressable>
          </View>

          {tab === 'group' && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ marginBottom: 4 }}>Title</Text>
              <TextInput
                placeholder="Group title"
                value={title}
                onChangeText={setTitle}
                style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 8 }}
              />
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            <Text style={{ marginBottom: 4 }}>Participants (handles, comma-separated)</Text>
            <TextInput
              placeholder="alice,bob"
              value={handles}
              onChangeText={setHandles}
              autoCapitalize="none"
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 8 }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => { reset(); onClose(); }} style={{ padding: 12, marginRight: 8 }}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={{ padding: 12 }}>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>Create</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


