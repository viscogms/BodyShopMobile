import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ScrollView, StyleSheet } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';

const STATUSES = ['Present', 'Absent', 'Late', 'Half Day'];
const STATUS_BG = { Present:'#dcfce7', Absent:'#fee2e2', Late:'#fef9c3', 'Half Day':'#dbeafe' };
const STATUS_FG = { Present:'#15803d', Absent:'#dc2626', Late:'#854d0e', 'Half Day':'#1d4ed8' };

function todayStr() {
    const d = new Date(); const z = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

export default function AttendanceReminderModal({ staffList, BRAND = '#7c3aed', apiKey }) {
    const [visible,   setVisible]   = useState(false);
    const [queue,     setQueue]     = useState([]);
    const [step,      setStep]      = useState(0);
    const [form,      setForm]      = useState(blankForm());
    const [saving,    setSaving]    = useState(false);
    const [checked,   setChecked]   = useState(false);

    const headers = { 'x-api-key': apiKey };
    const today   = todayStr();

    function blankForm() {
        return { status: 'Present', timeIn: '', timeOut: '', overtime: '0', notes: '' };
    }

    useEffect(() => {
        if (!staffList.length || checked) return;
        checkAndPrompt();
    }, [staffList]);

    const checkAndPrompt = async () => {
        setChecked(true);
        try {
            const res = await axios.get(`${API_BASE}/attendance?date=${today}`, { headers });
            const existing = Array.isArray(res.data) ? res.data : [];
            const unmarked = staffList.filter(s =>
                !existing.find(r => r.staffId === s._id || r.staffName === s.name)
            );
            if (!unmarked.length) return;
            Alert.alert(
                '📅 Attendance Reminder',
                `${unmarked.length} staff member${unmarked.length > 1 ? 's have' : ' has'} not been marked for today.\n\nDo you want to mark attendance now?`,
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Mark Now', onPress: () => openQueue(unmarked) },
                ]
            );
        } catch (_) {}
    };

    const openQueue = (list) => {
        setQueue(list);
        setStep(0);
        setForm(blankForm());
        setVisible(true);
    };

    const saveAndNext = async () => {
        const staff = queue[step];
        if (!staff) return;
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/attendance`, {
                staffId:   staff._id,
                staffName: staff.name,
                date:      today,
                status:    form.status,
                timeIn:    form.status === 'Absent' ? '' : form.timeIn,
                timeOut:   form.status === 'Absent' ? '' : form.timeOut,
                overtime:  Number(form.overtime) || 0,
                notes:     form.notes,
            }, { headers });
        } catch (_) {}
        setSaving(false);
        advance();
    };

    const advance = () => {
        if (step + 1 >= queue.length) {
            setVisible(false);
        } else {
            setStep(s => s + 1);
            setForm(blankForm());
        }
    };

    const staff = queue[step];
    if (!staff || !visible) return null;

    const pct = Math.round(((step + 1) / queue.length) * 100);
    const isLast = step + 1 === queue.length;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
            <View style={S.overlay}>
                <View style={S.sheet}>
                    {/* Header */}
                    <View style={[S.header, { backgroundColor: BRAND }]}>
                        <View>
                            <Text style={S.headerTitle}>📅 Mark Attendance</Text>
                            <Text style={S.headerSub}>Today · {today}</Text>
                        </View>
                        <View style={[S.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={S.badgeText}>{step + 1} / {queue.length}</Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={S.progressTrack}>
                        <View style={[S.progressFill, { width: `${pct}%`, backgroundColor: BRAND }]} />
                    </View>

                    <ScrollView style={S.body} keyboardShouldPersistTaps="handled">
                        {/* Staff card */}
                        <View style={[S.staffCard, { borderColor: BRAND + '33' }]}>
                            <View style={[S.avatar, { backgroundColor: BRAND + '18' }]}>
                                <Text style={[S.avatarTxt, { color: BRAND }]}>{staff.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={S.staffName}>{staff.name}</Text>
                                <Text style={S.staffRole}>{staff.category}</Text>
                            </View>
                        </View>

                        {/* Status */}
                        <Text style={[S.sectionLabel, { color: BRAND }]}>STATUS</Text>
                        <View style={S.chipRow}>
                            {STATUSES.map(s => (
                                <TouchableOpacity key={s} onPress={() => setForm(f => ({ ...f, status: s }))}
                                    style={[S.chip,
                                        form.status === s
                                            ? { backgroundColor: STATUS_BG[s], borderColor: STATUS_FG[s] }
                                            : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }
                                    ]}>
                                    <Text style={[S.chipTxt, { color: form.status === s ? STATUS_FG[s] : '#64748b' }]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Time fields */}
                        {form.status !== 'Absent' ? (
                            <View>
                                <Text style={[S.sectionLabel, { color: BRAND }]}>TIMES</Text>
                                <View style={S.timeRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={S.fieldLabel}>Clock In</Text>
                                        <TextInput style={S.input} placeholder="08:00"
                                            value={form.timeIn} onChangeText={v => setForm(f => ({ ...f, timeIn: v }))} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={S.fieldLabel}>Clock Out</Text>
                                        <TextInput style={S.input} placeholder="17:00"
                                            value={form.timeOut} onChangeText={v => setForm(f => ({ ...f, timeOut: v }))} />
                                    </View>
                                    <View style={{ flex: 0.7 }}>
                                        <Text style={S.fieldLabel}>OT Hrs</Text>
                                        <TextInput style={S.input} placeholder="0" keyboardType="numeric"
                                            value={form.overtime} onChangeText={v => setForm(f => ({ ...f, overtime: v }))} />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[S.sectionLabel, { color: BRAND }]}>REASON</Text>
                                <TextInput style={[S.input, { marginTop: 4 }]} placeholder="Reason for absence (optional)"
                                    value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />
                            </View>
                        )}
                    </ScrollView>

                    {/* Action buttons */}
                    <View style={S.btnRow}>
                        <TouchableOpacity style={S.skipBtn} onPress={advance}>
                            <Text style={S.skipTxt}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[S.saveBtn, { backgroundColor: BRAND, opacity: saving ? 0.6 : 1 }]}
                            onPress={saveAndNext} disabled={saving}>
                            <Text style={S.saveTxt}>{saving ? 'Saving...' : isLast ? '✓ Finish' : 'Save & Next →'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const S = StyleSheet.create({
    overlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' },
    sheet:        { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'88%' },
    header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderTopLeftRadius:24, borderTopRightRadius:24 },
    headerTitle:  { color:'#fff', fontSize:17, fontWeight:'900' },
    headerSub:    { color:'rgba(255,255,255,0.75)', fontSize:12, marginTop:2 },
    badge:        { paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
    badgeText:    { color:'#fff', fontWeight:'800', fontSize:13 },
    progressTrack:{ height:4, backgroundColor:'#f1f5f9' },
    progressFill: { height:4, borderRadius:0 },
    body:         { padding:20 },
    staffCard:    { flexDirection:'row', alignItems:'center', gap:14, padding:14, backgroundColor:'#f8fafc', borderRadius:14, borderWidth:1.5, marginBottom:20 },
    avatar:       { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center' },
    avatarTxt:    { fontSize:22, fontWeight:'900' },
    staffName:    { fontSize:17, fontWeight:'800', color:'#0f172a' },
    staffRole:    { fontSize:12, color:'#64748b', marginTop:2 },
    sectionLabel: { fontSize:10, fontWeight:'800', letterSpacing:1.2, marginBottom:8, marginTop:16 },
    chipRow:      { flexDirection:'row', flexWrap:'wrap', gap:8 },
    chip:         { paddingHorizontal:16, paddingVertical:9, borderRadius:10, borderWidth:1.5 },
    chipTxt:      { fontSize:13, fontWeight:'700' },
    timeRow:      { flexDirection:'row', gap:8, marginTop:4 },
    fieldLabel:   { fontSize:11, color:'#94a3b8', fontWeight:'600', marginBottom:4 },
    input:        { borderWidth:1.5, borderColor:'#e2e8f0', borderRadius:10, padding:11, fontSize:14, backgroundColor:'#f8fafc', color:'#0f172a' },
    btnRow:       { flexDirection:'row', gap:12, padding:20, paddingTop:12 },
    skipBtn:      { flex:1, padding:15, borderRadius:12, borderWidth:1.5, borderColor:'#e2e8f0', alignItems:'center', justifyContent:'center' },
    skipTxt:      { fontSize:14, fontWeight:'700', color:'#64748b' },
    saveBtn:      { flex:2, padding:15, borderRadius:12, alignItems:'center', justifyContent:'center' },
    saveTxt:      { fontSize:15, fontWeight:'800', color:'#fff' },
});
