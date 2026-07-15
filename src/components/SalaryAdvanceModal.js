import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';

function todayStr() {
    const d = new Date(); const z = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

export default function SalaryAdvanceModal({ staff, apiKey, BRAND = '#7c3aed', onClose }) {
    const [advances, setAdvances] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [form,     setForm]     = useState({ amount: '', date: todayStr(), notes: '' });

    const headers = { 'x-api-key': apiKey };

    useEffect(() => { fetchAdvances(); }, []);

    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/salary-advances?staffId=${staff._id}`, { headers });
            setAdvances(Array.isArray(res.data) ? res.data : []);
        } catch (_) {}
        finally { setLoading(false); }
    };

    const addAdvance = async () => {
        const amt = Number(form.amount);
        if (!amt || amt <= 0) { Alert.alert('Required', 'Enter a valid amount'); return; }
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/salary-advances`, {
                staffId: staff._id, staffName: staff.name,
                amount: amt, date: form.date, notes: form.notes, status: 'Pending',
            }, { headers });
            setForm({ amount: '', date: todayStr(), notes: '' });
            await fetchAdvances();
        } catch (_) { Alert.alert('Error', 'Failed to save'); }
        finally { setSaving(false); }
    };

    const markPaid = async (id) => {
        Alert.alert('Mark as Paid', 'Mark this advance as paid?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark Paid', onPress: async () => {
                try {
                    await axios.put(`${API_BASE}/salary-advances/${id}`, { status: 'Paid' }, { headers });
                    setAdvances(prev => prev.map(a => a._id === id ? { ...a, status: 'Paid' } : a));
                } catch (_) {}
            }},
        ]);
    };

    const deleteAdvance = (id) => {
        Alert.alert('Delete', 'Delete this record?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await axios.delete(`${API_BASE}/salary-advances/${id}`, { headers });
                    setAdvances(prev => prev.filter(a => a._id !== id));
                } catch (_) {}
            }},
        ]);
    };

    const totalPending = advances.filter(a => a.status === 'Pending').reduce((s, a) => s + a.amount, 0);
    const totalPaid    = advances.filter(a => a.status === 'Paid').reduce((s, a) => s + a.amount, 0);

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={S.overlay}>
                <View style={S.sheet}>
                    {/* Header */}
                    <View style={[S.header, { backgroundColor: BRAND }]}>
                        <View>
                            <Text style={S.headerTitle}>💰 Salary Advances</Text>
                            <Text style={S.headerSub}>{staff.name} · {staff.category}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
                            <Text style={S.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary */}
                    <View style={S.summaryRow}>
                        <View style={S.summaryCell}>
                            <Text style={[S.summaryAmt, { color: '#f97316' }]}>AED {totalPending.toLocaleString()}</Text>
                            <Text style={S.summaryLabel}>PENDING</Text>
                        </View>
                        <View style={S.summaryDivider} />
                        <View style={S.summaryCell}>
                            <Text style={[S.summaryAmt, { color: '#16a34a' }]}>AED {totalPaid.toLocaleString()}</Text>
                            <Text style={S.summaryLabel}>PAID</Text>
                        </View>
                    </View>

                    <ScrollView style={S.body} keyboardShouldPersistTaps="handled">
                        {/* Add form */}
                        <View style={[S.addCard, { borderColor: BRAND + '44' }]}>
                            <Text style={[S.sectionLabel, { color: BRAND }]}>+ NEW ADVANCE</Text>
                            <View style={S.formRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.fieldLabel}>Amount (AED) *</Text>
                                    <TextInput style={S.input} placeholder="500" keyboardType="numeric"
                                        value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.fieldLabel}>Date</Text>
                                    <TextInput style={S.input} placeholder="YYYY-MM-DD"
                                        value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} />
                                </View>
                            </View>
                            <Text style={S.fieldLabel}>Notes (optional)</Text>
                            <TextInput style={S.input} placeholder="Reason or reference"
                                value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />
                            <TouchableOpacity onPress={addAdvance} disabled={saving}
                                style={[S.saveBtn, { backgroundColor: BRAND, opacity: saving ? 0.6 : 1 }]}>
                                <Text style={S.saveBtnTxt}>{saving ? 'Saving...' : '💾 Record Advance'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* History */}
                        {loading && <ActivityIndicator color={BRAND} style={{ marginVertical: 20 }} />}
                        {!loading && advances.length === 0 && (
                            <Text style={S.empty}>No advances recorded yet.</Text>
                        )}
                        {!loading && advances.map(a => (
                            <View key={a._id} style={[S.advanceCard, { borderLeftColor: a.status === 'Paid' ? '#22c55e' : '#f97316' }]}>
                                <View style={S.advanceRow}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={S.advanceAmt}>AED {a.amount.toLocaleString()}</Text>
                                            <View style={[S.statusBadge, { backgroundColor: a.status === 'Paid' ? '#dcfce7' : '#ffedd5' }]}>
                                                <Text style={[S.statusTxt, { color: a.status === 'Paid' ? '#15803d' : '#c2410c' }]}>{a.status}</Text>
                                            </View>
                                        </View>
                                        <Text style={S.advanceMeta}>{a.date}{a.notes ? ` · ${a.notes}` : ''}</Text>
                                    </View>
                                    <View style={{ gap: 6 }}>
                                        {a.status === 'Pending' && (
                                            <TouchableOpacity onPress={() => markPaid(a._id)} style={S.paidBtn}>
                                                <Text style={S.paidBtnTxt}>✓ Paid</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity onPress={() => deleteAdvance(a._id)} style={S.delBtn}>
                                            <Text style={S.delBtnTxt}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const S = StyleSheet.create({
    overlay:       { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
    sheet:         { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'88%' },
    header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderTopLeftRadius:24, borderTopRightRadius:24 },
    headerTitle:   { color:'#fff', fontSize:17, fontWeight:'900' },
    headerSub:     { color:'rgba(255,255,255,0.75)', fontSize:12, marginTop:2 },
    closeBtn:      { width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
    closeTxt:      { color:'#fff', fontWeight:'900', fontSize:16 },
    summaryRow:    { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#f1f5f9' },
    summaryCell:   { flex:1, paddingVertical:14, alignItems:'center' },
    summaryDivider:{ width:1, backgroundColor:'#f1f5f9', marginVertical:10 },
    summaryAmt:    { fontSize:18, fontWeight:'900' },
    summaryLabel:  { fontSize:9, fontWeight:'800', color:'#94a3b8', letterSpacing:1, marginTop:2 },
    body:          { padding:16 },
    addCard:       { borderWidth:1.5, borderRadius:14, padding:14, marginBottom:16, backgroundColor:'#fafafa' },
    sectionLabel:  { fontSize:10, fontWeight:'900', letterSpacing:1.2, marginBottom:12 },
    formRow:       { flexDirection:'row', gap:10, marginBottom:0 },
    fieldLabel:    { fontSize:11, color:'#94a3b8', fontWeight:'600', marginBottom:4, marginTop:10 },
    input:         { borderWidth:1.5, borderColor:'#e2e8f0', borderRadius:10, padding:10, fontSize:14, backgroundColor:'#fff', color:'#0f172a' },
    saveBtn:       { marginTop:14, borderRadius:10, padding:13, alignItems:'center' },
    saveBtnTxt:    { color:'#fff', fontWeight:'800', fontSize:14 },
    empty:         { textAlign:'center', color:'#94a3b8', marginVertical:24, fontSize:13 },
    advanceCard:   { backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:10, borderLeftWidth:4, elevation:1 },
    advanceRow:    { flexDirection:'row', alignItems:'flex-start', gap:10 },
    advanceAmt:    { fontSize:16, fontWeight:'900', color:'#0f172a' },
    statusBadge:   { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
    statusTxt:     { fontSize:10, fontWeight:'800' },
    advanceMeta:   { fontSize:11, color:'#94a3b8', marginTop:3 },
    paidBtn:       { backgroundColor:'#dcfce7', borderRadius:7, paddingHorizontal:10, paddingVertical:6 },
    paidBtnTxt:    { fontSize:11, fontWeight:'800', color:'#15803d' },
    delBtn:        { alignItems:'center', paddingHorizontal:8, paddingVertical:6 },
    delBtnTxt:     { fontSize:13 },
});
