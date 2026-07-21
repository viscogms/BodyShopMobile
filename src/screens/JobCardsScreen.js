import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { COLORS, CARD_WIDTH, GRID_PADDING, GRID_GAP } from '../utils/AppStyles';
import { API_BASE } from '../utils/config';
import JobCardItem from '../components/JobCardItem';

export default function JobCardsScreen({ onBack, isDark = false, onCardPress, cardChangeEvent }) {
  const [cards,       setCards]       = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const C  = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0a0c12' : '#dcfce7';

  useEffect(() => { fetchCards(1, ''); }, []);

  // This screen fetches its own independent card list, so it doesn't automatically see
  // changes made via the detail modal (status/finance/parts/availability/full edit) —
  // patch or remove locally whenever App.js reports one, instead of requiring a manual refresh.
  useEffect(() => {
    if (!cardChangeEvent) return;
    if (cardChangeEvent.type === 'delete') {
      setCards(prev => prev.filter(c => c._id !== cardChangeEvent.id));
    } else if (cardChangeEvent.type === 'update') {
      setCards(prev => prev.map(c => c._id === cardChangeEvent.id ? { ...c, ...cardChangeEvent.patch } : c));
    }
  }, [cardChangeEvent]);

  const fetchCards = async (pageNum, query) => {
    try {
      if (pageNum === 1) setLoading(true);
      // sort=created — newest first by creation date, unlike Dashboard's receiveDate-based sort
      const res = await axios.get(`${API_BASE}/jobcards?page=${pageNum}&limit=15&search=${query}&sort=created`);
      if (pageNum === 1) setCards(res.data || []);
      else setCards(prev => { const ids = new Set(prev.map(c => c._id)); return [...prev, ...(res.data || []).filter(c => !ids.has(c._id))]; });
      setHasMore((res.data || []).length === 15);
    } catch (e) { Alert.alert('Error', 'Could not load job cards.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSearch = (text) => { setSearchQuery(text); setPage(1); fetchCards(1, text); };
  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchCards(1, searchQuery); };
  const handleLoadMore = () => { if (hasMore && !loading && !refreshing) { const next = page + 1; setPage(next); fetchCards(next, searchQuery); } };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['left', 'right']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#ffffff', borderBottomColor: '#16a34a' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: '#16a34a', fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Job Cards</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: isDark ? '#0f1117' : '#fff', borderBottomColor: isDark ? '#1e2433' : '#dcfce7' }]}>
        <TextInput
          style={[styles.searchInput, { color: C.text, backgroundColor: isDark ? '#13161f' : '#f7fdf9', borderColor: isDark ? '#1e2433' : '#86efac' }]}
          placeholder="Search plate, model, customer, status..."
          placeholderTextColor={C.textSub}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
            <Text style={{ color: C.textSub, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && cards.length === 0 ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : cards.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 40 }}>📇</Text>
          <Text style={{ color: C.textSub, marginTop: 12, fontWeight: '700' }}>No job cards found.</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={cards}
          keyExtractor={(item) => String(item._id)}
          numColumns={3}
          columnWrapperStyle={styles.rowWrapper}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <View style={{ width: CARD_WIDTH }}>
              <JobCardItem item={item} onPress={(card) => onCardPress && onCardPress(card)} isDark={isDark} />
            </View>
          )}
          contentContainerStyle={styles.flatListPadding}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2 },
  backBtn: { paddingRight: 14, paddingVertical: 4 },
  headerTitle: { color: '#14532d', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  headerSub: { color: '#4d7c5f', fontSize: 10, fontWeight: '600', marginTop: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderRadius: 8 },
  clearBtn: { paddingHorizontal: 10 },
  rowWrapper: { gap: GRID_GAP, marginBottom: GRID_GAP },
  flatListPadding: { paddingHorizontal: GRID_PADDING, paddingTop: 8, paddingBottom: 40 },
});
