import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { getCleanModelText } from '../utils/helpers';
import { getStyles, COLORS } from '../utils/AppStyles';

const API_URL = 'https://bodyshop-backend.onrender.com/api/jobcards';

export default function TodoScreen({ todoCards, onBack, isDark = false, onCardPress }) {
  const S = getStyles(isDark);
  const C = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0a0c12' : '#f0f4f8';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#0a0c12', borderBottomColor: '#16a34a' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: '#16a34a', fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pending To-Do's</Text>
          <Text style={styles.headerSub}>{todoCards.length} vehicles with pending tasks</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {todoCards.length === 0 ? (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { paddingRight: 14, paddingVertical: 4 },
  headerTitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 10, fontWeight: '600', marginTop: 1 },
  cardBlock: { marginHorizontal: 8, marginTop: 8, padding: 14, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  plate: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  model: { fontSize: 11, fontWeight: '600', marginBottom: 10 },
  countBadge: { backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  countTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  todoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1 },
  todoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 10 },
  todoText: { fontSize: 13, fontWeight: '500', flex: 1 },
});