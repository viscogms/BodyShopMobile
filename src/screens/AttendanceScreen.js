import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_BASE, API_KEY } from '../utils/config';

const BRAND_COLOR = '#16a34a';

const STATUSES_ATT = ['Present','Absent','Late','Half Day','Holiday'];
const STATUS_BG = { Present:'#dcfce7', Absent:'#fee2e2', Late:'#fef9c3', 'Half Day':'#dbeafe', Holiday:'#ede9fe' };
const STATUS_FG = { Present:'#15803d', Absent:'#dc2626', Late:'#854d0e', 'Half Day':'#1d4ed8', Holiday:'#6d28d9' };

function todayStr() {
    const d = new Date(); const z = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}
function thisMonth() { return todayStr().slice(0,7); }
function isSunday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 0;
}

function AttendanceSection({ staffList: allStaff, BRAND: B, API_KEY }) {
    const BRAND = B;
    const staffList = useMemo(() => allStaff.filter(s => s.attendanceRequired !== false), [allStaff]);
    const [view,       setView]       = useState('daily');
    const [date,       setDate]       = useState(todayStr());
    const [month,      setMonth]      = useState(thisMonth());
    const [rows,       setRows]       = useState([]);
    const [records,    setRecords]    = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [generating, setGenerating] = useState(false);
    const [dateInput,  setDateInput]  = useState(todayStr());
    const [monthInput, setMonthInput] = useState(thisMonth());
    const [expanded,   setExpanded]   = useState(null);

    const [showTp,   setShowTp]   = useState(false);
    const [tpTarget, setTpTarget] = useState('timeIn');
    const [tpIdx,    setTpIdx]    = useState(0);
    const [tpDate,   setTpDate]   = useState(new Date());

    const headers = { 'x-api-key': API_KEY };

    const fetchDaily = async (d) => {
        if (!staffList.length) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/attendance?date=${d}`, { headers });
            const existing = Array.isArray(res.data) ? res.data : [];
            setRows(staffList.map(s => {
                const rec = existing.find(r => r.staffId===s._id || r.staffName===s.name);
                return {
                    staffId: s._id, staffName: s.name, category: s.category,
                    status:   rec?.status   || 'Present',
                    timeIn:   rec?.timeIn   || '',
                    timeOut:  rec?.timeOut  || '',
                    overtime: rec?.overtime != null ? String(rec.overtime) : '0',
                    notes:    rec?.notes    || '',
                    saved:    !!rec,
                };
            }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchMonthly = async (m) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/attendance?month=${m}`, { headers });
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (view === 'daily')   fetchDaily(date);
        if (view === 'monthly') fetchMonthly(month);
    }, [view, date, month, staffList]);

    const updateRow = (idx, field, val) => setRows(prev => prev.map((r,i) => i===idx ? {...r,[field]:val} : r));

    const openTimePicker = (idx, target) => {
        const row = rows[idx];
        const cur = row[target];
        const d = new Date();
        if (cur) { const [h,m] = cur.split(':').map(Number); d.setHours(h,m,0,0); }
        setTpIdx(idx); setTpTarget(target); setTpDate(d); setShowTp(true);
    };
    const onTpChange = (e, sel) => {
        setShowTp(Platform.OS === 'ios');
        if (sel) {
            const z = n => String(n).padStart(2,'0');
            updateRow(tpIdx, tpTarget, `${z(sel.getHours())}:${z(sel.getMinutes())}`);
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            await Promise.all(rows.map(row => axios.post(`${API_BASE}/attendance`, {
                staffId: row.staffId, staffName: row.staffName, date,
                status: row.status,
                timeIn:  row.status==='Absent' ? '' : row.timeIn,
                timeOut: row.status==='Absent' ? '' : row.timeOut,
                overtime: Number(row.overtime)||0, notes: row.notes,
            }, { headers })));
            fetchDaily(date);
            Alert.alert('Saved', 'Attendance saved successfully.');
        } catch (e) { Alert.alert('Error', 'Failed to save attendance.'); }
        finally { setSaving(false); }
    };

    const markAllHoliday = () => {
        Alert.alert('Mark all as Holiday?', `Every staff member will be marked Holiday for ${date}. You can still re-mark anyone who worked afterward.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark All', onPress: async () => {
                setSaving(true);
                try {
                    await Promise.all(staffList.map(s => axios.post(`${API_BASE}/attendance`, {
                        staffId: s._id, staffName: s.name, date, status: 'Holiday', timeIn: '', timeOut: '', overtime: 0, notes: '',
                    }, { headers })));
                    fetchDaily(date);
                    Alert.alert('Saved', 'All staff marked Holiday.');
                } catch (e) { Alert.alert('Error', 'Failed to mark holiday.'); }
                finally { setSaving(false); }
            }},
        ]);
    };

    const monthlyData = useMemo(() => {
        const [y,m] = month.split('-').map(Number);
        const days = new Date(y,m,0).getDate();
        return staffList.map(s => {
            const sRecs = records.filter(r => r.staffId===s._id || r.staffName===s.name);
            const summary = { Present:0, Absent:0, Late:0, 'Half Day':0, Holiday:0, overtime:0 };
            const dayMap = {};
            sRecs.forEach(r => {
                const day = parseInt(r.date.split('-')[2]);
                dayMap[day] = r;
                summary[r.status] = (summary[r.status]||0)+1;
                summary.overtime += r.overtime||0;
            });
            return { ...s, dayMap, summary, days };
        });
    }, [records, staffList, month]);

    const generateMonthlyPDF = async () => {
        try {
            setGenerating(true);
            const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            const totals = monthlyData.reduce((acc, s) => {
                acc.Present += s.summary.Present||0; acc.Absent += s.summary.Absent||0;
                acc.Late += s.summary.Late||0; acc['Half Day'] += s.summary['Half Day']||0;
                acc.Holiday += s.summary.Holiday||0; acc.overtime += s.summary.overtime||0;
                return acc;
            }, { Present:0, Absent:0, Late:0, 'Half Day':0, Holiday:0, overtime:0 });

            const rows = monthlyData.map(s => `<tr>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;font-weight:700">${s.name}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;color:#666">${s.category}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;color:#15803d;font-weight:700">${s.summary.Present||0}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;color:#dc2626;font-weight:700">${s.summary.Absent||0}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;color:#854d0e;font-weight:700">${s.summary.Late||0}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;color:#1d4ed8;font-weight:700">${s.summary['Half Day']||0}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;color:#6d28d9;font-weight:700">${s.summary.Holiday||0}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #dcfce7;font-size:11px;text-align:center;font-weight:700">${s.summary.overtime||0}h</td>
            </tr>`).join('');

            const html = `<html><body style="font-family:Arial,sans-serif;padding:24px;color:#1a202c">
                <div style="text-align:center;border-bottom:3px solid #16a34a;padding-bottom:14px;margin-bottom:18px">
                    <h2 style="margin:0;color:#14532d;font-size:20px">VISCO BODY SHOP</h2>
                    <p style="color:#16a34a;margin:4px 0;font-weight:700;font-size:13px">MONTHLY ATTENDANCE REPORT — ${month}</p>
                    <p style="color:#999;font-size:11px;margin:2px 0">Generated: ${now}</p>
                </div>
                <div style="display:flex;gap:10px;margin-bottom:18px">
                    <div style="flex:1;border-left:3px solid #16a34a;background:#f0fdf4;padding:10px 12px">
                        <div style="font-size:9px;color:#16a34a;font-weight:800;text-transform:uppercase">Present</div>
                        <div style="font-size:16px;font-weight:900;color:#16a34a;margin-top:2px">${totals.Present}</div>
                    </div>
                    <div style="flex:1;border-left:3px solid #ef4444;background:#fef2f2;padding:10px 12px">
                        <div style="font-size:9px;color:#ef4444;font-weight:800;text-transform:uppercase">Absent</div>
                        <div style="font-size:16px;font-weight:900;color:#ef4444;margin-top:2px">${totals.Absent}</div>
                    </div>
                    <div style="flex:1;border-left:3px solid #f59e0b;background:#fff7ed;padding:10px 12px">
                        <div style="font-size:9px;color:#f59e0b;font-weight:800;text-transform:uppercase">Late</div>
                        <div style="font-size:16px;font-weight:900;color:#f59e0b;margin-top:2px">${totals.Late}</div>
                    </div>
                    <div style="flex:1;border-left:3px solid #7c3aed;background:#f5f3ff;padding:10px 12px">
                        <div style="font-size:9px;color:#7c3aed;font-weight:800;text-transform:uppercase">Holiday</div>
                        <div style="font-size:16px;font-weight:900;color:#7c3aed;margin-top:2px">${totals.Holiday}</div>
                    </div>
                </div>
                <table style="width:100%;border-collapse:collapse">
                    <tr style="background:#16a34a;color:#fff">
                        <th style="padding:9px 8px;text-align:left;font-size:10px">Staff</th>
                        <th style="padding:9px 8px;text-align:left;font-size:10px">Category</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">Present</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">Absent</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">Late</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">Half Day</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">Holiday</th>
                        <th style="padding:9px 8px;text-align:center;font-size:10px">OT</th>
                    </tr>${rows}
                </table>
            </body></html>`;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (e) { Alert.alert('Error', 'Failed to generate PDF.'); }
        finally { setGenerating(false); }
    };

    return (
        <View>
            <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                {[['daily','📅 Daily'],['monthly','📊 Monthly']].map(([v,label]) => (
                    <TouchableOpacity key={v} onPress={() => setView(v)}
                        style={{ flex:1, padding:10, alignItems:'center', borderRadius:8,
                            backgroundColor: view===v ? B : '#e2e8f0' }}>
                        <Text style={{ fontWeight:'bold', fontSize:12, color: view===v ? '#fff' : '#64748b' }}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 }}>
                <Text style={{ fontSize:12, color:'#64748b', fontWeight:'bold' }}>{view==='daily' ? 'Date:' : 'Month:'}</Text>
                <TextInput
                    style={{ flex:1, borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, padding:8, fontSize:13, backgroundColor:'#fff', color:'#1e293b' }}
                    value={view==='daily' ? dateInput : monthInput}
                    placeholder={view==='daily' ? 'YYYY-MM-DD' : 'YYYY-MM'}
                    onChangeText={v => { if(view==='daily') setDateInput(v); else setMonthInput(v); }}
                    onEndEditing={() => { if(view==='daily' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) setDate(dateInput); if(view==='monthly' && /^\d{4}-\d{2}$/.test(monthInput)) setMonth(monthInput); }}
                />
                <TouchableOpacity onPress={() => { if(view==='daily') { setDate(dateInput); fetchDaily(dateInput); } else { setMonth(monthInput); fetchMonthly(monthInput); } }}
                    style={{ backgroundColor:B, paddingHorizontal:14, paddingVertical:9, borderRadius:8 }}>
                    <Text style={{ color:'#fff', fontWeight:'bold', fontSize:12 }}>Go</Text>
                </TouchableOpacity>
            </View>

            {view==='daily' && isSunday(date) && (
                <TouchableOpacity onPress={markAllHoliday} disabled={saving}
                    style={{ backgroundColor:'#ede9fe', borderWidth:1, borderColor:'#c4b5fd', borderRadius:9, padding:11, alignItems:'center', marginBottom:12, opacity:saving?0.6:1 }}>
                    <Text style={{ color:'#6d28d9', fontWeight:'800', fontSize:13 }}>🎉 Mark All as Holiday (Sunday)</Text>
                </TouchableOpacity>
            )}

            {loading && <ActivityIndicator color={B} style={{ marginVertical:20 }} />}

            {view==='daily' && !loading && (
                <View>
                    {rows.length===0 && <Text style={{textAlign:'center',color:'#94a3b8',marginVertical:20}}>No staff found.</Text>}
                    {rows.map((row, idx) => {
                        const isOpen = expanded === row.staffId;
                        return (
                        <View key={row.staffId} style={{ backgroundColor:'#fff', borderRadius:10, marginBottom:8, borderLeftWidth:4, borderLeftColor: row.saved ? '#22c55e' : '#e2e8f0', elevation:1, overflow:'hidden' }}>
                            <TouchableOpacity onPress={() => setExpanded(isOpen ? null : row.staffId)}
                                style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12 }}>
                                <Text style={{ fontWeight:'800', fontSize:14, color:'#1e293b', flex:1 }}>{row.staffName}</Text>
                                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                                    <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:6, backgroundColor: STATUS_BG[row.status] }}>
                                        <Text style={{ fontSize:10, fontWeight:'800', color: STATUS_FG[row.status] }}>{row.status}</Text>
                                    </View>
                                    {row.timeIn  && <Text style={{ fontSize:10, color:'#94a3b8' }}>▶{row.timeIn}</Text>}
                                    {row.timeOut && <Text style={{ fontSize:10, color:'#94a3b8' }}>■{row.timeOut}</Text>}
                                    <Text style={{ color:'#94a3b8', fontSize:12 }}>{isOpen ? '▲' : '▼'}</Text>
                                </View>
                            </TouchableOpacity>
                            {isOpen && (
                                <View style={{ paddingHorizontal:12, paddingBottom:12, borderTopWidth:1, borderTopColor:'#f1f5f9' }}>
                                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:10, marginBottom:10 }}>
                                        {STATUSES_ATT.map(s => (
                                            <TouchableOpacity key={s} onPress={() => updateRow(idx,'status',s)}
                                                style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8,
                                                    backgroundColor: row.status===s ? STATUS_BG[s] : '#f1f5f9' }}>
                                                <Text style={{ fontSize:12, fontWeight:'800', color: row.status===s ? STATUS_FG[s] : '#64748b' }}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {row.status!=='Absent' ? (
                                        <View>
                                            <View style={{ flexDirection:'row', gap:10 }}>
                                                <View style={{ flex:1 }}>
                                                    <Text style={{ fontSize:10, color:'#94a3b8', fontWeight:'700', marginBottom:4 }}>CLOCK IN</Text>
                                                    <TouchableOpacity onPress={() => openTimePicker(idx,'timeIn')}
                                                        style={{ borderWidth:1.5, borderColor: row.timeIn ? BRAND : '#e2e8f0', borderRadius:8, padding:10, alignItems:'center', backgroundColor:'#f8fafc' }}>
                                                        <Text style={{ fontSize:15, fontWeight:'800', color: row.timeIn ? '#0f172a' : '#94a3b8' }}>{row.timeIn || 'Tap'}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => updateRow(idx,'timeIn','08:30')}
                                                        style={{ marginTop:6, borderRadius:7, padding:7, alignItems:'center', backgroundColor: BRAND+'18', borderWidth:1, borderColor: BRAND+'44' }}>
                                                        <Text style={{ fontSize:11, fontWeight:'800', color: BRAND }}>⚡ 8:30 AM</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{ flex:1 }}>
                                                    <Text style={{ fontSize:10, color:'#94a3b8', fontWeight:'700', marginBottom:4 }}>CLOCK OUT</Text>
                                                    <TouchableOpacity onPress={() => openTimePicker(idx,'timeOut')}
                                                        style={{ borderWidth:1.5, borderColor: row.timeOut ? BRAND : '#e2e8f0', borderRadius:8, padding:10, alignItems:'center', backgroundColor:'#f8fafc' }}>
                                                        <Text style={{ fontSize:15, fontWeight:'800', color: row.timeOut ? '#0f172a' : '#94a3b8' }}>{row.timeOut || 'Tap'}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => updateRow(idx,'timeOut','18:30')}
                                                        style={{ marginTop:6, borderRadius:7, padding:7, alignItems:'center', backgroundColor: BRAND+'18', borderWidth:1, borderColor: BRAND+'44' }}>
                                                        <Text style={{ fontSize:11, fontWeight:'800', color: BRAND }}>⚡ 6:30 PM</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={{ marginTop:10 }}>
                                                <Text style={{ fontSize:10, color:'#94a3b8', fontWeight:'700', marginBottom:4 }}>OT HOURS</Text>
                                                <TextInput style={{ borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, padding:9, fontSize:13, backgroundColor:'#f8fafc', color:'#1e293b' }}
                                                    value={row.overtime} placeholder="0" keyboardType="numeric" onChangeText={v => updateRow(idx,'overtime',v)} />
                                            </View>
                                        </View>
                                    ) : (
                                        <TextInput style={{ borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, padding:9, fontSize:13, backgroundColor:'#f8fafc', color:'#1e293b' }}
                                            value={row.notes} placeholder="Reason for absence (optional)" onChangeText={v => updateRow(idx,'notes',v)} />
                                    )}
                                    <TouchableOpacity onPress={saveAll} disabled={saving}
                                        style={{ marginTop:12, backgroundColor:BRAND, padding:11, borderRadius:9, alignItems:'center', opacity:saving?0.6:1 }}>
                                        <Text style={{ color:'#fff', fontWeight:'800', fontSize:13 }}>{saving ? 'Saving...' : '💾 Save'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        );
                    })}
                </View>
            )}
            {showTp && (
                <DateTimePicker value={tpDate} mode="time" is24Hour display={Platform.OS==='ios'?'spinner':'clock'} onChange={onTpChange} />
            )}

            {view==='monthly' && !loading && (
                <View>
                    <TouchableOpacity onPress={generateMonthlyPDF} disabled={generating}
                        style={{ backgroundColor:B, borderRadius:9, padding:11, alignItems:'center', marginBottom:12, opacity:generating?0.6:1 }}>
                        {generating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:13 }}>🖨️ Print Monthly Report</Text>}
                    </TouchableOpacity>

                    <View style={{ flexDirection:'row', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                        {['Present','Absent','Late','Half Day','Holiday'].map(s => (
                            <View key={s} style={{ flex:1, minWidth:70, backgroundColor:STATUS_BG[s], borderRadius:10, padding:10, alignItems:'center' }}>
                                <Text style={{ fontSize:20, fontWeight:'900', color:STATUS_FG[s] }}>{records.filter(r=>r.status===s).length}</Text>
                                <Text style={{ fontSize:10, fontWeight:'bold', color:STATUS_FG[s] }}>{s}</Text>
                            </View>
                        ))}
                    </View>
                    {monthlyData.map(s => (
                        <View key={s._id} style={{ backgroundColor:'#fff', borderRadius:10, padding:12, marginBottom:10, elevation:1 }}>
                            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                <View>
                                    <Text style={{ fontWeight:'bold', fontSize:14, color:'#1e293b' }}>{s.name}</Text>
                                    <Text style={{ fontSize:11, color:'#94a3b8' }}>{s.category}</Text>
                                </View>
                                <View style={{ flexDirection:'row', gap:6 }}>
                                    <Text style={{ fontSize:11, fontWeight:'bold', color:'#15803d' }}>P:{s.summary.Present||0}</Text>
                                    <Text style={{ fontSize:11, fontWeight:'bold', color:'#dc2626' }}>A:{s.summary.Absent||0}</Text>
                                    <Text style={{ fontSize:11, fontWeight:'bold', color:'#854d0e' }}>L:{s.summary.Late||0}</Text>
                                    {s.summary.Holiday>0 && <Text style={{ fontSize:11, fontWeight:'bold', color:'#6d28d9' }}>H:{s.summary.Holiday}</Text>}
                                    {s.summary.overtime>0 && <Text style={{ fontSize:11, fontWeight:'bold', color:B }}>OT:{s.summary.overtime}h</Text>}
                                </View>
                            </View>
                            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4 }}>
                                {Array.from({length:s.days},(_,i)=>i+1).map(day => {
                                    const rec = s.dayMap[day];
                                    return (
                                        <View key={day} style={{ width:28, height:28, borderRadius:4, alignItems:'center', justifyContent:'center',
                                            backgroundColor: rec ? STATUS_BG[rec.status] : '#f1f5f9' }}>
                                            <Text style={{ fontSize:9, fontWeight:'bold', color: rec ? STATUS_FG[rec.status] : '#94a3b8' }}>{day}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                    {monthlyData.length===0 && <Text style={{textAlign:'center',color:'#94a3b8',marginVertical:20}}>No records this month.</Text>}
                </View>
            )}
        </View>
    );
}

export default function AttendanceScreen({ onBack, isDark = false }) {
    const [staffList, setStaffList] = useState([]);
    useEffect(() => {
        axios.get(`${API_BASE}/staff`, { headers: { 'x-api-key': API_KEY } })
            .then(r => setStaffList(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
    }, []);
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0c12' : '#f4f7f8' }} edges={['left', 'right']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, backgroundColor: '#ffffff', borderBottomColor: BRAND_COLOR }}>
                <TouchableOpacity onPress={onBack} style={{ paddingRight: 14, paddingVertical: 4 }}>
                    <Text style={{ color: BRAND_COLOR, fontSize: 22 }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ color: '#14532d', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 }}>📅 Attendance</Text>
            </View>
            <ScrollView style={{ flex: 1, padding: 15 }} keyboardShouldPersistTaps="handled">
                <AttendanceSection staffList={staffList} BRAND={BRAND_COLOR} API_KEY={API_KEY} />
            </ScrollView>
        </SafeAreaView>
    );
}
