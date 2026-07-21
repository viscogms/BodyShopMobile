import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getCleanModelText, getCustomerNameOnly } from '../utils/helpers';
import { getStyles, COLORS } from '../utils/AppStyles';
import { API_BASE } from '../utils/config';

export default function FinanceScreen({ onBack, isDark = false, onCardPress }) {
  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [summary,     setSummary]     = useState({ total: 0, count: 0 });
  const [generating,  setGenerating]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded,    setExpanded]    = useState(null); // phone number expanded

  const S = getStyles(isDark);
  const C = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0a0c12' : '#f0f4f8';

  useEffect(() => { fetchUnpaidVehicles(); }, []);

  const fetchUnpaidVehicles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/jobcards/unpaid`);
      setVehicles(res.data);
      const total = res.data.reduce((sum, v) => sum + (Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0)), 0);
      setSummary({ total, count: res.data.length });
    } catch (e) { Alert.alert('Error', 'Could not load finance data.'); }
    finally { setLoading(false); }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return String(d).split('T')[0].split(' ')[0];
  };

  const getPaymentStatusColor = (v) => {
    const balance = Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0);
    if (balance <= 0) return '#16a34a';
    if (Number(v.paidAmount) > 0) return '#f59e0b';
    return '#ef4444';
  };

  const getPaymentLabel = (v) => {
    const balance = Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0);
    if (balance <= 0) return 'PAID';
    if (Number(v.paidAmount) > 0) return 'PARTIAL';
    return 'UNPAID';
  };

  // ── Filter + phone grouping ───────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(v =>
      (v.plateNumber || '').toLowerCase().includes(q) ||
      getCleanModelText(v.carModel || '').toLowerCase().includes(q) ||
      getCustomerNameOnly(v.carModel || '').toLowerCase().includes(q) ||
      (v.jobCardNo || '').toLowerCase().includes(q) ||
      (v.customerContact || '').includes(q) ||
      (v.customerContacts || []).some(c => c.includes(q))
    );
  }, [vehicles, searchQuery]);

  // Group by primary phone number (skip entries with no valid phone)
  const phoneGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(v => {
      const phone = (v.customerContacts?.[0] || v.customerContact || '').trim();
      if (!phone) return;
      if (!groups[phone]) groups[phone] = [];
      groups[phone].push(v);
    });
    // Only return groups with 2+ cards
    return Object.entries(groups).filter(([, cards]) => cards.length >= 2);
  }, [filtered]);

  const phoneGroupKeys = new Set(phoneGroups.flatMap(([, cards]) => cards.map(c => c._id)));

  const generatePDF = async () => {
    try {
      setGenerating(true);
      const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const rows = vehicles.map((v, i) => {
        const balance = (Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0)).toFixed(2);
        const label   = getPaymentLabel(v);
        const color   = label === 'UNPAID' ? '#ef4444' : label === 'PARTIAL' ? '#f59e0b' : '#16a34a';
        const rowBg   = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        return `<tr style="background:${rowBg}">
          <td>${v.plateNumber || '-'}</td>
          <td>${getCleanModelText(v.carModel) || '-'}</td>
          <td>${getCustomerNameOnly(v.carModel) || '-'}</td>
          <td>${v.jobCardNo || '-'}</td>
          <td>${formatDate(v.receiveDate)}</td>
          <td style="text-align:right">AED ${Number(v.invoiceAmount || 0).toFixed(2)}</td>
          <td style="text-align:right">AED ${Number(v.paidAmount || 0).toFixed(2)}</td>
          <td style="text-align:right;font-weight:800;color:${color}">AED ${balance}</td>
          <td style="text-align:center"><span style="background:${color};color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:800">${label}</span></td>
        </tr>`;
      }).join('');

      const html = `<html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:30px;color:#1a202c}
        .header{border-bottom:3px solid #16a34a;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
        .header h1{font-size:20px;font-weight:900;color:#0B0E14;letter-spacing:1px}.header p{font-size:11px;color:#64748b;margin-top:4px}
        .summary{display:flex;gap:16px;margin-bottom:24px}
        .summary-card{flex:1;padding:14px 18px;border-left:3px solid #16a34a;background:#f8fafc}
        .summary-card .label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
        .summary-card .value{font-size:22px;font-weight:900;color:#ef4444;margin-top:4px}
        .summary-card .sub{font-size:11px;color:#94a3b8;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#0B0E14;color:#fff;padding:10px 8px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase}
        td{padding:9px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
      </style></head><body>
        <div class="header"><div><h1>VISCO BODY SHOP</h1><p>Outstanding Balance Report</p></div><div style="font-size:11px;color:#64748b;text-align:right">${dateStr}</div></div>
        <div class="summary">
          <div class="summary-card"><div class="label">Total Outstanding</div><div class="value">AED ${summary.total.toFixed(2)}</div><div class="sub">${summary.count} unpaid vehicles</div></div>
          <div class="summary-card" style="border-left-color:#ef4444"><div class="label">Generated</div><div class="value" style="font-size:14px;color:#1a202c;margin-top:6px">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div><div class="sub">${new Date().toLocaleDateString('en-GB')}</div></div>
        </div>
        <table><thead><tr><th>Plate</th><th>Model</th><th>Customer</th><th>JC No</th><th>Date</th><th style="text-align:right">Invoice</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer"><span>Visco Body Shop GMS — Confidential</span><span>Total: ${summary.count} vehicles | AED ${summary.total.toFixed(2)}</span></div>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { Alert.alert('Error', 'Failed to generate PDF.'); }
    finally { setGenerating(false); }
  };

  const renderRow = (v, i) => {
    const balance = (Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0)).toFixed(2);
    const label   = getPaymentLabel(v);
    const color   = getPaymentStatusColor(v);
    const rowBg   = i % 2 === 0 ? (isDark ? '#13161f' : '#ffffff') : (isDark ? '#0f1117' : '#f8fafc');

    return (
      <TouchableOpacity
        key={v._id}
        style={[styles.tableRow, { backgroundColor: rowBg, borderBottomColor: isDark ? '#1e2433' : '#e2e8f0' }]}
        onPress={() => onCardPress && onCardPress(v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tdCell, { flex: 1.2, color: C.text, fontWeight: '800' }]} numberOfLines={1}>{v.plateNumber || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1.5, color: C.textSub }]} numberOfLines={1}>{getCleanModelText(v.carModel) || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1.5, color: C.textSub }]} numberOfLines={1}>{getCustomerNameOnly(v.carModel) || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 0.8, color: C.textSub }]} numberOfLines={1}>{v.jobCardNo || '-'}</Text>
        <Text style={[styles.tdCell, { flex: 1, color: '#ef4444', fontWeight: '800', textAlign: 'right' }]} numberOfLines={1}>{balance}</Text>
        <View style={{ flex: 0.9, alignItems: 'center' }}>
          <View style={[styles.statusTag, { backgroundColor: color }]}>
            <Text style={styles.statusTagText}>{label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['left', 'right']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#0a0c12', borderBottomColor: '#16a34a' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: '#16a34a', fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Outstanding Balance</Text>
          <Text style={styles.headerSub}>Tap any row to open job card</Text>
        </View>
        <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]} onPress={generatePDF} disabled={generating}>
          {generating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pdfBtnText}>🖨️ PDF</Text>}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: isDark ? '#0f1117' : '#fff', borderBottomColor: isDark ? '#1e2433' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.searchInput, { color: C.text, backgroundColor: isDark ? '#13161f' : '#f8fafc', borderColor: isDark ? '#1e2433' : '#e2e8f0' }]}
          placeholder="Search plate, customer, phone, job card..."
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

      {/* Summary Banner */}
      <View style={[styles.summaryBanner, { backgroundColor: isDark ? '#0f1117' : '#fff', borderColor: isDark ? '#1e2433' : '#e2e8f0' }]}>
        <View>
          <Text style={[styles.summaryLabel, { color: C.textSub }]}>TOTAL OUTSTANDING</Text>
          <Text style={styles.summaryAmount}>AED {summary.total.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={[styles.summaryCount, { color: C.text }]}>{summary.count}</Text>
          <Text style={[styles.summaryCountLabel, { color: C.textSub }]}>Vehicles</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={{ color: C.textSub, marginTop: 12, fontWeight: '700' }}>No results found</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>

          {/* Phone groups — same number, multiple cards */}
          {phoneGroups.length > 0 && !searchQuery && (
            <View style={{ marginHorizontal: 8, marginTop: 8 }}>
              <Text style={[styles.sectionLabel, { color: C.textSub }]}>SAME CUSTOMER — MULTIPLE VEHICLES</Text>
              {phoneGroups.map(([phone, cards]) => {
                const groupTotal = cards.reduce((sum, v) => sum + (Number(v.invoiceAmount || 0) - Number(v.paidAmount || 0)), 0);
                const isOpen = expanded === phone;
                return (
                  <View key={phone} style={[styles.groupBlock, { backgroundColor: isDark ? '#13161f' : '#fff', borderColor: isDark ? '#1e2433' : '#e2e8f0' }]}>
                    <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(isOpen ? null : phone)} activeOpacity={0.8}>
                      <View>
                        <Text style={[styles.groupPhone, { color: C.text }]}>📞 {phone}</Text>
                        <Text style={[styles.groupSub, { color: C.textSub }]}>{cards.length} vehicles</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.groupTotal}>AED {groupTotal.toFixed(2)}</Text>
                        <Text style={{ color: C.textSub, fontSize: 10 }}>{isOpen ? '▲ collapse' : '▼ expand'}</Text>
                      </View>
                    </TouchableOpacity>
                    {isOpen && cards.map((v, i) => renderRow(v, i))}
                  </View>
                );
              })}
            </View>
          )}

          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: '#0B0E14', marginTop: 8 }]}>
            <Text style={[styles.thCell, { flex: 1.2 }]}>PLATE</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>MODEL</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>CUSTOMER</Text>
            <Text style={[styles.thCell, { flex: 0.8 }]}>JC</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>BALANCE</Text>
            <Text style={[styles.thCell, { flex: 0.9, textAlign: 'center' }]}>STATUS</Text>
          </View>

          {filtered.map((v, i) => renderRow(v, i))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { paddingRight: 14, paddingVertical: 4 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 10, fontWeight: '600', marginTop: 1 },
  pdfBtn: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1 },
  clearBtn: { paddingHorizontal: 10 },
  summaryBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 8, marginVertical: 6, paddingHorizontal: 16, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#16a34a', borderWidth: 1 },
  summaryLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  summaryAmount: { fontSize: 22, fontWeight: '900', color: '#ef4444', marginTop: 2 },
  summaryRight: { alignItems: 'center' },
  summaryCount: { fontSize: 26, fontWeight: '900' },
  summaryCountLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  sectionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  groupBlock: { borderWidth: 1, borderLeftWidth: 3, borderLeftColor: '#ef4444', marginBottom: 8 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  groupPhone: { fontSize: 13, fontWeight: '800' },
  groupSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  groupTotal: { fontSize: 16, fontWeight: '900', color: '#ef4444' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 9 },
  thCell: { fontSize: 9, color: '#94a3b8', fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 1, alignItems: 'center' },
  tdCell: { fontSize: 11, fontWeight: '600' },
  statusTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  statusTagText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
});