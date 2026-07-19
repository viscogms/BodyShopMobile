import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { getCleanModelText } from '../utils/helpers';
import { getStyles, COLORS } from '../utils/AppStyles';

const API_URL = 'https://visco-api.onrender.com/api/jobcards';

export default function TodoScreen({ todoCards, standaloneTodos = [], onBack, isDark = false, onCardPress, onCreateTodo, onOpenReminder, onDeleteTodo }) {
  const S = getStyles(isDark);
  const C = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0a0c12' : '#f0f4f8';

  const [showCreate,   setShowCreate]   = useState(false);
  const [newText,      setNewText]      = useState('');
  const [newPriority,  setNewPriority]  = useState('Normal');

  const submitCreate = () => {
    if (!newText.trim()) return Alert.alert('Required', 'Enter what needs to be done.');
    onCreateTodo(newText.trim(), newPriority);
    setNewText(''); setNewPriority('Normal'); setShowCreate(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#0a0c12', borderBottomColor: '#16a34a' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: '#16a34a', fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pending To-Do's</Text>
          <Text style={styles.headerSub}>{todoCards.length + standaloneTodos.length} pending tasks</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {standaloneTodos.length > 0 && (
          <View style={{ marginHorizontal: 8, marginTop: 8 }}>
            <Text style={[styles.sectionLabel, { color: C.textSub }]}>GENERAL TO-DO'S</Text>
            {standaloneTodos.map((todo) => (
              <TouchableOpacity
                key={todo._id}
                style={[styles.standaloneRow, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => onOpenReminder(todo)}
                onLongPress={() => Alert.alert('Delete To-Do', `Delete "${todo.text}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDeleteTodo(todo._id) }])}
                activeOpacity={0.8}
              >
                <View style={[styles.priorityBadge, todo.priority === 'High' && styles.priorityBadgeHigh]}>
                  <Text style={styles.priorityBadgeText}>{todo.priority === 'High' ? '⚠️ HIGH' : 'NORMAL'}</Text>
                </View>
                <Text style={[styles.standaloneText, { color: C.text }]}>{todo.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {todoCards.length === 0 && standaloneTodos.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={{ color: C.textSub, marginTop: 12, fontWeight: '700' }}>No pending to-do's!</Text>
          </View>
        ) : (
          todoCards.map((card) => {
            const pending = (card.todos || []).filter(t => !t.completed);
            if (pending.length === 0) return null;
            return (
              <TouchableOpacity
                key={card._id}
                style={[styles.cardBlock, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => onCardPress(card)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.plate, { color: C.text }]}>{card.plateNumber}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countTxt}>{pending.length} pending</Text>
                  </View>
                </View>
                <Text style={[styles.model, { color: C.textSub }]}>{getCleanModelText(card.carModel)}</Text>
                {pending.map((todo, i) => (
                  <View key={i} style={[styles.todoRow, { borderBottomColor: isDark ? '#13161f' : '#f1f5f9' }]}>
                    <View style={styles.todoDot} />
                    <Text style={[styles.todoText, { color: C.text }]}>{todo.text}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.createOverlay}>
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>🆕 New To-Do</Text>
            <TextInput
              style={styles.createInput}
              placeholder="What needs to be done?"
              placeholderTextColor="#94a3b8"
              value={newText}
              onChangeText={setNewText}
              multiline
              autoFocus
            />
            <View style={styles.priorityRow}>
              {['Normal', 'High'].map(p => (
                <TouchableOpacity key={p} style={[styles.priorityChip, newPriority === p && styles.priorityChipActive]} onPress={() => setNewPriority(p)}>
                  <Text style={[styles.priorityChipText, newPriority === p && styles.priorityChipTextActive]}>{p === 'High' ? '⚠️ High' : 'Normal'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.createCancelBtn} onPress={() => { setShowCreate(false); setNewText(''); setNewPriority('Normal'); }}>
                <Text style={styles.createCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createSaveBtn} onPress={submitCreate}>
                <Text style={styles.createSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { paddingRight: 14, paddingVertical: 4 },
  headerTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 10, fontWeight: '600', marginTop: 1 },
  newBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  standaloneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  priorityBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityBadgeHigh: { backgroundColor: '#fee2e2' },
  priorityBadgeText: { fontSize: 9, fontWeight: '900', color: '#16a34a' },
  standaloneText: { flex: 1, fontSize: 13, fontWeight: '600' },
  cardBlock: { marginHorizontal: 8, marginTop: 8, padding: 14, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  plate: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  model: { fontSize: 11, fontWeight: '600', marginBottom: 10 },
  countBadge: { backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  countTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  todoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1 },
  todoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 10 },
  todoText: { fontSize: 13, fontWeight: '500', flex: 1 },
  createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  createCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  createTitle: { fontSize: 16, fontWeight: '900', color: '#14532d', marginBottom: 14 },
  createInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 14, color: '#14532d', minHeight: 70, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  priorityChip: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  priorityChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  priorityChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  priorityChipTextActive: { color: '#fff' },
  createCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  createCancelText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  createSaveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  createSaveText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});