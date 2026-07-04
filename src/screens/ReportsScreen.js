import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getCleanModelText, getCustomerNameOnly } from '../utils/helpers';
import { COLORS } from '../utils/AppStyles';
import { API_BASE } from '../utils/config';

const TEST_STATUS = 'Test Job';

export default function ReportsScreen({ onBack, isDark = false, onCardPress }) {
  const [cards,       setCards]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const C  = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0a0c12' : '#f0fdf4';

  useEffect(() => { fetchAllCards(); }, []);

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/jobcards?page=1&limit=2000`);
      setCards(res.data || []);
    } catch (e) { Alert.alert('Error', 'Could not load report data.'); }
    finally { setLoading(false); }
  };

  const partCostOf = (card) => (card.partCosts || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const profitOf    = (card) => Number(card.invoiceAmount || 0) - partCostOf(card);

  // ── Derived data ────────────────────────────────────────────
  const testJobCards = useMemo(() => cards.filter(c => c.status === TEST_STATUS), [cards]);
  const earningCards = useMemo(() => cards.filter(c => c.status !== TEST_STATUS), [cards]);

  const totals = useMemo(() => {
    const totalInvoice  = earningCards.reduce((s, c) => s + Number(c.invoiceAmount || 0), 0);
    const totalPartCost = earningCards.reduce((s, c) => s + partCostOf(c), 0);
    const totalProfit   = totalInvoice - totalPartCost;
    return { totalInvoice, totalPartCost, totalProfit };
  }, [earningCards]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return earningCards;
    const q = searchQuery.toLowerCase();
    return earningCards.filter(c =>
      (c.plateNumber || '').toLowerCase().includes(q) ||
      getCleanModelText(c.carModel || '').toLowerCase().includes(q) ||
      getCustomerNameOnly(c.carModel || '').toLowerCase().includes(q) ||
      (c.jobCardNo || '').toLowerCase().includes(q)
    );
  }, [earningCards, searchQuery]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => profitOf(b) - profitOf(a)), [filtered]);

  const formatDate = (d) => !d ? '-' : String(d).split('T')[0].split(' ')[0];

  const generatePDF = async () => {
    try {
      setGenerating(true);
      const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const rows = sorted.map((c, i) => {
        const pc = partCostOf(c);
        const profit = profitOf(c);
        const profitColor = profit >= 0 ? '#16a34a' : '#ef4444';
        return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f7ff'}">
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px">${c.plateNumber || '-'}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px">${getCleanModelText(c.carModel) || '-'}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px">${getCustomerNameOnly(c.carModel) || '-'}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;text-align:right">AED ${Number(c.invoiceAmount || 0).toFixed(2)}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;text-align:right">AED ${pc.toFixed(2)}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;text-align:right;font-weight:800;color:${profitColor}">AED ${profit.toFixed(2)}</td>
          <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:10px">${formatDate(c.receiveDate)}</td>
        </tr>`;
      }).join('');

      const html = `<html><body style="font-family:Arial,sans-serif;padding:24px;color:#1a202c">
        <div style="text-align:center;border-bottom:3px solid #16a34a;padding-bottom:14px;margin-bottom:18px">
          <h2 style="margin:0;color:#14532d;font-size:20px">VISCO BODY SHOP</h2>
          <p style="color:#16a34a;margin:4px 0;font-weight:700;font-size:13px">FULL EARNINGS REPORT</p>
          <p style="color:#999;font-size:11px;margin:2px 0">${dateStr}</p>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:18px">
          <div style="flex:1;border-left:3px solid #16a34a;background:#f0fdf4;padding:10px 14px">
            <div style="font-size:9px;color:#16a34a;font-weight:800;text-transform:uppercase">Total Earned (Profit)</div>
            <div style="font-size:18px;font-weight:900;color:#16a34a;margin-top:2px">AED ${totals.totalProfit.toFixed(2)}</div>
          </div>
          <div style="flex:1;border-left:3px solid #16a34a;background:#ecfdf5;padding:10px 14px">
            <div style="font-size:9px;color:#16a34a;font-weight:800;text-transform:uppercase">Total Invoiced</div>
            <div style="font-size:18px;font-weight:900;color:#16a34a;margin-top:2px">AED ${totals.totalInvoice.toFixed(2)}</div>
          </div>
          <div style="flex:1;border-left:3px solid #ef4444;background:#fef2f2;padding:10px 14px">
            <div style="font-size:9px;color:#ef4444;font-weight:800;text-transform:uppercase">Total Part Costs</div>
            <div style="font-size:18px;font-weight:900;color:#ef4444;margin-top:2px">AED ${totals.totalPartCost.toFixed(2)}</div>
          </div>
          <div style="flex:1;border-left:3px solid #f59e0b;background:#fff7ed;padding:10px 14px">
            <div style="font-size:9px;color:#f59e0b;font-weight:800;text-transform:uppercase">Test Jobs</div>
            <div style="font-size:18px;font-weight:900;color:#f59e0b;margin-top:2px">${testJobCards.length}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#16a34a;color:#fff">
            <th style="padding:9px 8px;text-align:left;font-size:10px">Plate</th>
            <th style="padding:9px 8px;text-align:left;font-size:10px">Model</th>
            <th style="padding:9px 8px;text-align:left;font-size:10px">Customer</th>
            <th style="padding:9px 8px;text-align:right;font-size:10px">Invoice</th>
            <th style="padding:9px 8px;text-align:right;font-size:10px">Part Cost</th>
            <th style="padding:9px 8px;text-align:right;font-size:10px">Profit</th>
            <th style="padding:9px 8px;text-align:left;font-size:10px">Date</th>
          </tr>${rows}
        </table>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { Alert.alert('Error', 'Failed to generate PDF.'); }
    finally { setGenerating(false); }
  };

  const renderRow = (c, i) => {
    const pc = partCostOf(c);
    const profit = profitOf(c);
    const profitColor = profit >= 0 ? '#16a34a' : '#ef4444';
    const rowBg = i % 2 === 0 ? (isDark ? '#13161f' : '#ffffff') : (isDark ? '#0f1117' : '#f7fdf9');

    return (
      <TouchableOpacity
        key={c._id}
        style={[styles.tableRow, { backgroundColor: rowBg, borderBottomColor: isDark ? '#1e2433' : '#f0fdf4' }]}
        onPress={() => onCardPress && onCardPress(c)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tdCell, { flex: 1.1, color: C.text, fontWeight: '800' }]} numberOfLines={1}>{c.plateNumber || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1.3, color: C.textSub }]} numberOfLines={1}>{getCleanModelText(c.carModel) || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1.2, color: C.textSub }]} numberOfLines={1}>{getCustomerNameOnly(c.carModel) || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1, color: C.textSub, textAlign: 'right' }]} numberOfLines={1}>{Number(c.invoiceAmount || 0).toFixed(0)}</Text>
        <Text style={[styles.tdCell, { flex: 1, color: '#ef4444', textAlign: 'right' }]} numberOfLines={1}>{pc.toFixed(0)}</Text>
        <Text style={[styles.tdCell, { flex: 1, color: profitColor, fontWeight: '800', textAlign: 'right' }]} numberOfLines={1}>{profit.toFixed(0)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#ffffff', borderBottomColor: '#16a34a' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: '#16a34a', fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Full Earnings Report</Text>
          <Text style={styles.headerSub}>Tap any row to open job card</Text>
        </View>
        <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]} onPress={generatePDF} disabled={generating}>
          {generating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pdfBtnText}>🖨️ PDF</Text>}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: isDark ? '#0f1117' : '#fff', borderBottomColor: isDark ? '#1e2433' : '#f0fdf4' }]}>
        <TextInput
          style={[styles.searchInput, { color: C.text, backgroundColor: isDark ? '#13161f' : '#f7fdf9', borderColor: isDark ? '#1e2433' : '#bbf7d0' }]}
          placeholder="Search plate, model, customer, job card..."
          placeholderTextColor={C.textSub}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={{ color: C.textSub, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={{ flex: 1 }}>

          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { borderLeftColor: '#16a34a', backgroundColor: isDark ? '#0f1117' : '#f0fdf4' }]}>
              <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>TOTAL EARNED</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>AED {totals.totalProfit.toFixed(0)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#16a34a', backgroundColor: isDark ? '#0f1117' : '#ecfdf5' }]}>
              <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>TOTAL INVOICED</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>AED {totals.totalInvoice.toFixed(0)}</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { borderLeftColor: '#ef4444', backgroundColor: isDark ? '#0f1117' : '#fef2f2' }]}>
              <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>PART COSTS</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>AED {totals.totalPartCost.toFixed(0)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#f59e0b', backgroundColor: isDark ? '#0f1117' : '#fff7ed' }]}>
              <Text style={[styles.summaryLabel, { color: '#f59e0b' }]}>TEST JOBS</Text>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{testJobCards.length}</Text>
            </View>
          </View>

          {sorted.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 40 }}>📊</Text>
              <Text style={{ color: C.textSub, marginTop: 12, fontWeight: '700' }}>No results found</Text>
            </View>
          ) : (
            <>
              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: '#16a34a', marginTop: 10 }]}>
                <Text style={[styles.thCell, { flex: 1.1 }]}>PLATE</Text>
                <Text style={[styles.thCell, { flex: 1.3 }]}>MODEL</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>CUSTOMER</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>INVOICE</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>PARTS</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>PROFIT</Text>
              </View>
              {sorted.map((c, i) => renderRow(c, i))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2 },
  backBtn: { paddingRight: 14, paddingVertical: 4 },
  headerTitle: { color: '#14532d', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  headerSub: { color: '#7c6fae', fontSize: 10, fontWeight: '600', marginTop: 1 },
  pdfBtn: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderRadius: 8 },
  clearBtn: { paddingHorizontal: 10 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginHorizontal: 8, marginTop: 8 },
  summaryCard: { flex: 1, padding: 12, borderLeftWidth: 3, borderRadius: 10 },
  summaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 9, marginHorizontal: 8, borderRadius: 8 },
  thCell: { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 1, alignItems: 'center', marginHorizontal: 8 },
  tdCell: { fontSize: 11, fontWeight: '600' },
});
