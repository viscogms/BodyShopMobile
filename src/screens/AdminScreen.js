import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API_BASE, API_KEY } from '../utils/config';
import SalaryAdvanceModal from '../components/SalaryAdvanceModal';

const STAFF_CATEGORIES = ['Foreman','Technician','Helper','Supervisor','Accounts Clerk','Driver','Denter','Painter'];
const ROLES = ['Admin','Owner','Technician','User'];

const BLANK = () => ({
    name:'', category:'Technician', birthday:'', country:'', passportNo:'',
    eid:'', eidExpiry:'', salary:'', mobiles:[''], email:'',
    username:'', password:'', role:'User', isActive:true,
});

const BRAND = '#16a34a';

const STATUSES_ATT = ['Present','Absent','Late','Half Day'];
const STATUS_BG = { Present:'#dcfce7', Absent:'#fee2e2', Late:'#fef9c3', 'Half Day':'#dbeafe' };
const STATUS_FG = { Present:'#15803d', Absent:'#dc2626', Late:'#854d0e', 'Half Day':'#1d4ed8' };

function todayStr() {
    const d = new Date(); const z = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}
function thisMonth() { return todayStr().slice(0,7); }

function AttendanceSection({ staffList, BRAND: B, API_KEY }) {
    const BRAND = B;
    const [view,       setView]       = useState('daily');
    const [date,       setDate]       = useState(todayStr());
    const [month,      setMonth]      = useState(thisMonth());
    const [rows,       setRows]       = useState([]);
    const [records,    setRecords]    = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
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

    const monthlyData = useMemo(() => {
        const [y,m] = month.split('-').map(Number);
        const days = new Date(y,m,0).getDate();
        return staffList.map(s => {
            const sRecs = records.filter(r => r.staffId===s._id || r.staffName===s.name);
            const summary = { Present:0, Absent:0, Late:0, 'Half Day':0, overtime:0 };
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
                    <View style={{ flexDirection:'row', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                        {['Present','Absent','Late','Half Day'].map(s => (
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

export default function AdminScreen({
    adminPartTab, setAdminPartTab,
    dbPartsCatalog, newGroupName, setNewGroupName, handleAddGroup,
    selectedAdminGroupId, setSelectedAdminGroupId, newItemName, setNewItemName, handleAddItem, handleDeleteGroup,
    handleDeleteItem, onUsersChanged,
}) {
    const [users,       setUsers]       = useState([]);
    const [staffList,   setStaffList]   = useState([]);
    const [loading,     setLoading]     = useState(true);

    const [search,      setSearch]      = useState('');
    const [catFilter,   setCatFilter]   = useState('all');

    const [showModal,       setShowModal]       = useState(false);
    const [editingUserId,   setEditingUserId]   = useState(null);
    const [editingStaffId,  setEditingStaffId]  = useState(null);
    const [form,            setForm]            = useState(BLANK());
    const [saving,          setSaving]          = useState(false);
    const [expandedStaff,   setExpandedStaff]   = useState(null);
    const [advanceStaff,    setAdvanceStaff]    = useState(null);

    useEffect(() => {
        if (adminPartTab === 'staff') fetchAll();
    }, [adminPartTab]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [uRes, sRes] = await Promise.all([
                axios.get(`${API_BASE}/users`),
                axios.get(`${API_BASE}/staff`),
            ]);
            setUsers(Array.isArray(uRes.data) ? uRes.data : []);
            setStaffList(Array.isArray(sRes.data) ? sRes.data : []);
        } catch (e) { Alert.alert('Error', 'Failed to load staff'); }
        finally { setLoading(false); }
    };

    const merged = useMemo(() => {
        const map = new Map();
        staffList.forEach(s => map.set(s.name.toLowerCase().trim(), { staff: s, user: null }));
        users.forEach(u => {
            if (u.username === 'admin') return;
            const key = u.name.toLowerCase().trim();
            if (map.has(key)) map.get(key).user = u;
            else map.set(key, { staff: null, user: u });
        });
        return [...map.values()].sort((a, b) =>
            (a.staff?.name || a.user?.name || '').localeCompare(b.staff?.name || b.user?.name || '')
        );
    }, [users, staffList]);

    const filtered = useMemo(() => merged.filter(({ staff: s, user: u }) => {
        const q = search.toLowerCase();
        const name = (s?.name || u?.name || '').toLowerCase();
        const matchSearch = !search || name.includes(q) ||
            (s?.eid||'').toLowerCase().includes(q) ||
            (s?.passportNo||'').toLowerCase().includes(q) ||
            (u?.username||'').toLowerCase().includes(q);
        const matchCat = catFilter === 'all' || s?.category === catFilter;
        return matchSearch && matchCat;
    }), [merged, search, catFilter]);

    const openNew = () => {
        setEditingUserId(null); setEditingStaffId(null); setForm(BLANK()); setShowModal(true);
    };

    const openEdit = ({ staff: s, user: u }) => {
        setEditingStaffId(s?._id || null);
        setEditingUserId(u?._id || null);
        setForm({
            name:       s?.name       || u?.name       || '',
            category:   s?.category   || 'Technician',
            birthday:   s?.birthday   || '',
            country:    s?.country    || '',
            passportNo: s?.passportNo || '',
            eid:        s?.eid        || '',
            eidExpiry:  s?.eidExpiry  || '',
            salary:     String(s?.salary || ''),
            email:      s?.email      || '',
            mobiles:    s?.mobiles?.length ? [...s.mobiles, ''] : [''],
            username:   u?.username   || '',
            password:   '',
            role:       u?.role       || 'User',
            isActive:   u?.isActive   !== false,
        });
        setShowModal(true);
    };

    const setMobile = (idx, val) => {
        const list = [...form.mobiles]; list[idx] = val;
        if (idx === list.length - 1 && val.trim()) list.push('');
        setForm(f => ({ ...f, mobiles: list }));
    };
    const removeMobile = (idx) => {
        const list = form.mobiles.filter((_, i) => i !== idx);
        setForm(f => ({ ...f, mobiles: list.length ? list : [''] }));
    };

    const save = async () => {
        if (!form.name.trim()) return Alert.alert('Required', 'Name is required');
        setSaving(true);
        try {
            const hrPayload = {
                name: form.name.trim(), category: form.category, birthday: form.birthday,
                country: form.country, passportNo: form.passportNo, eid: form.eid,
                eidExpiry: form.eidExpiry, salary: Number(form.salary)||0,
                email: form.email, mobiles: form.mobiles.filter(m => m.trim()),
            };
            if (editingStaffId) {
                const r = await axios.put(`${API_BASE}/staff/${editingStaffId}`, hrPayload);
                setStaffList(prev => prev.map(s => s._id === editingStaffId ? r.data : s));
            } else {
                const r = await axios.post(`${API_BASE}/staff`, hrPayload);
                setStaffList(prev => [r.data, ...prev]);
            }
            if (form.username.trim()) {
                const acctPayload = { name: form.name.trim(), username: form.username.trim(), role: form.role, isActive: form.isActive };
                if (form.password) acctPayload.password = form.password;
                if (editingUserId) {
                    const r = await axios.put(`${API_BASE}/users/${editingUserId}`, acctPayload);
                    const updated = prev => prev.map(u => u._id === editingUserId ? r.data : u);
                    setUsers(updated);
                    onUsersChanged && onUsersChanged(updated(users));
                } else {
                    if (!form.password) { Alert.alert('Required', 'Password required for new account'); setSaving(false); return; }
                    const r = await axios.post(`${API_BASE}/users`, { ...acctPayload, password: form.password });
                    const next = [...users, r.data];
                    setUsers(next);
                    onUsersChanged && onUsersChanged(next);
                }
            }
            setShowModal(false);
        } catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const deletePerson = ({ staff: s, user: u }) => {
        const name = s?.name || u?.name;
        Alert.alert('Delete Staff Member', `Delete "${name}"? This removes the HR record and system account.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    if (s) { await axios.delete(`${API_BASE}/staff/${s._id}`); setStaffList(prev => prev.filter(x => x._id !== s._id)); }
                    if (u) {
                        await axios.delete(`${API_BASE}/users/${u._id}`);
                        const next = users.filter(x => x._id !== u._id);
                        setUsers(next);
                        onUsersChanged && onUsersChanged(next);
                    }
                    setShowModal(false);
                } catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to delete'); }
            }}
        ]);
    };

    return (
        <ScrollView style={{ flex:1, backgroundColor:'#f4f7f8', padding:15 }} keyboardShouldPersistTaps="handled">
            <View style={S.tabRow}>
                <TouchableOpacity style={[S.tabBtn, adminPartTab==='staff' && S.tabBtnActive]} onPress={() => setAdminPartTab('staff')}>
                    <Text style={[S.tabTxt, adminPartTab==='staff' && {color:BRAND}]}>👥 Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.tabBtn, adminPartTab==='attendance' && S.tabBtnActive]} onPress={() => setAdminPartTab('attendance')}>
                    <Text style={[S.tabTxt, adminPartTab==='attendance' && {color:BRAND}]}>📅 Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.tabBtn, adminPartTab==='parts' && S.tabBtnActive]} onPress={() => setAdminPartTab('parts')}>
                    <Text style={[S.tabTxt, adminPartTab==='parts' && {color:BRAND}]}>⚙️ Parts</Text>
                </TouchableOpacity>
            </View>

            {adminPartTab === 'staff' && (
                <View>
                    <View style={{flexDirection:'row', gap:8, marginBottom:12}}>
                        <TextInput
                            style={[S.input, {flex:1, marginBottom:0}]}
                            placeholder="Search name, EID, username..."
                            placeholderTextColor="#aaa"
                            value={search}
                            onChangeText={setSearch}
                        />
                        <TouchableOpacity style={[S.addBtn, {backgroundColor:BRAND}]} onPress={openNew}>
                            <Text style={{color:'#fff', fontWeight:'800', fontSize:13}}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                        {['all', ...STAFF_CATEGORIES].map(cat => (
                            <TouchableOpacity key={cat} onPress={() => setCatFilter(cat)}
                                style={[S.chip, catFilter===cat && {backgroundColor:BRAND}]}>
                                <Text style={{fontSize:11, fontWeight:'700', color: catFilter===cat ? '#fff' : '#555'}}>
                                    {cat === 'all' ? 'All' : cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {loading && <ActivityIndicator color={BRAND} style={{marginTop:30}} />}

                    {!loading && filtered.map(({ staff: s, user: u }) => {
                        const name = s?.name || u?.name;
                        const isOpen = expandedStaff === name;
                        return (
                            <View key={name} style={[S.card, { padding:0, overflow:'hidden', borderLeftColor:BRAND }]}>
                                <TouchableOpacity onPress={() => setExpandedStaff(isOpen ? null : name)}
                                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12 }}>
                                    <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                                        <View style={{ width:38, height:38, borderRadius:19, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center' }}>
                                            <Text style={{ fontSize:16, fontWeight:'900', color: BRAND }}>{name?.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <Text style={{ fontWeight:'800', fontSize:15, color:'#14532d' }}>{name}</Text>
                                    </View>
                                    <Text style={{ color:'#94a3b8', fontSize:12 }}>{isOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>
                                {isOpen && (
                                    <View style={{ paddingHorizontal:12, paddingBottom:12, borderTopWidth:1, borderTopColor:'#f1f5f9' }}>
                                        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:10, marginBottom:8 }}>
                                            {s && <View style={[S.badge, {backgroundColor:'#dcfce7'}]}><Text style={{color:BRAND, fontSize:10, fontWeight:'800'}}>{s.category}</Text></View>}
                                            {u && <View style={[S.badge, {backgroundColor: u.isActive ? '#dcfce7' : '#fee2e2'}]}>
                                                <Text style={{color: u.isActive ? '#15803d' : '#dc2626', fontSize:10, fontWeight:'800'}}>{u.role} {u.isActive ? '✓' : '✗'}</Text>
                                            </View>}
                                        </View>
                                        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginBottom:12 }}>
                                            {u            && <Text style={S.chip2}>🔑 {u.username}</Text>}
                                            {s?.country    && <Text style={S.chip2}>🌍 {s.country}</Text>}
                                            {s?.salary>0   && <Text style={S.chip2}>💰 AED {s.salary}</Text>}
                                            {s?.eid        && <Text style={S.chip2}>🪪 {s.eid}</Text>}
                                            {s?.eidExpiry  && <Text style={S.chip2}>📅 {s.eidExpiry}</Text>}
                                            {s?.passportNo && <Text style={S.chip2}>📘 {s.passportNo}</Text>}
                                            {s?.birthday   && <Text style={S.chip2}>🎂 {s.birthday}</Text>}
                                            {(s?.mobiles||[]).filter(Boolean).map((m,i) => <Text key={i} style={S.chip2}>📞 {m}</Text>)}
                                            {s?.email      && <Text style={[S.chip2, {flexShrink:1}]}>✉️ {s.email}</Text>}
                                        </View>
                                        <View style={{ flexDirection:'row', gap:8 }}>
                                            <TouchableOpacity onPress={() => openEdit({ staff: s, user: u })}
                                                style={{ flex:1, backgroundColor: BRAND, borderRadius:8, padding:10, alignItems:'center' }}>
                                                <Text style={{ color:'#fff', fontWeight:'800', fontSize:12 }}>✏️ Edit</Text>
                                            </TouchableOpacity>
                                            {s && (
                                                <TouchableOpacity onPress={() => setAdvanceStaff(s)}
                                                    style={{ flex:1, backgroundColor:'#ffedd5', borderRadius:8, padding:10, alignItems:'center' }}>
                                                    <Text style={{ color:'#c2410c', fontWeight:'800', fontSize:12 }}>💰 Advance</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity onPress={() => deletePerson({ staff: s, user: u })}
                                                style={{ flex:1, borderWidth:1, borderColor:'#fca5a5', borderRadius:8, padding:10, alignItems:'center' }}>
                                                <Text style={{ color:'#ef4444', fontWeight:'800', fontSize:12 }}>🗑️ Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                    {!loading && filtered.length === 0 && (
                        <Text style={{textAlign:'center', color:'#aaa', marginTop:30}}>No staff found.</Text>
                    )}

                    {advanceStaff && (
                        <SalaryAdvanceModal
                            staff={advanceStaff}
                            apiKey={API_KEY}
                            BRAND="#16a34a"
                            onClose={() => setAdvanceStaff(null)}
                        />
                    )}

                    <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
                        <ScrollView style={{flex:1, backgroundColor:'#f4f7f8'}} keyboardShouldPersistTaps="handled">
                            <View style={S.modalHeader}>
                                <Text style={{fontWeight:'900', fontSize:17, color:'#14532d'}}>
                                    {editingStaffId || editingUserId ? '✏️ Edit Staff Member' : '🆕 Add Staff Member'}
                                </Text>
                                <TouchableOpacity onPress={() => setShowModal(false)}>
                                    <Text style={{fontSize:22, color:'#94a3b8'}}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={S.modalBody}>
                                <Text style={[S.sectionLabel, {color:BRAND}]}>BASIC INFO</Text>

                                <Text style={[S.fieldLabel, {color:'#15803d'}]}>Full Name *</Text>
                                <TextInput style={S.input} placeholder="Full Name" placeholderTextColor="#aaa" value={form.name} onChangeText={v => setForm(f=>({...f,name:v}))} />

                                <Text style={[S.fieldLabel, {color:'#15803d'}]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                                    {STAFF_CATEGORIES.map(cat => (
                                        <TouchableOpacity key={cat} onPress={() => setForm(f=>({...f,category:cat}))}
                                            style={[S.chip, form.category===cat && {backgroundColor:BRAND}]}>
                                            <Text style={{fontSize:12, fontWeight:'700', color: form.category===cat ? '#fff' : '#555'}}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={{flexDirection:'row', gap:10}}>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>Birthday</Text>
                                        <TextInput style={S.input} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" value={form.birthday} onChangeText={v => setForm(f=>({...f,birthday:v}))} />
                                    </View>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>Country</Text>
                                        <TextInput style={S.input} placeholder="e.g. Sri Lanka" placeholderTextColor="#aaa" value={form.country} onChangeText={v => setForm(f=>({...f,country:v}))} />
                                    </View>
                                </View>
                                <View style={{flexDirection:'row', gap:10}}>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>Passport No.</Text>
                                        <TextInput style={S.input} placeholder="N12345678" placeholderTextColor="#aaa" autoCapitalize="characters" value={form.passportNo} onChangeText={v => setForm(f=>({...f,passportNo:v.toUpperCase()}))} />
                                    </View>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>Salary (AED)</Text>
                                        <TextInput style={S.input} placeholder="0" placeholderTextColor="#aaa" keyboardType="number-pad" value={form.salary} onChangeText={v => setForm(f=>({...f,salary:v}))} />
                                    </View>
                                </View>
                                <View style={{flexDirection:'row', gap:10}}>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>EID</Text>
                                        <TextInput style={S.input} placeholder="784-xxxx-xxxxxxx-x" placeholderTextColor="#aaa" value={form.eid} onChangeText={v => setForm(f=>({...f,eid:v}))} />
                                    </View>
                                    <View style={{flex:1}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>EID Expiry</Text>
                                        <TextInput style={S.input} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" value={form.eidExpiry} onChangeText={v => setForm(f=>({...f,eidExpiry:v}))} />
                                    </View>
                                </View>
                                <Text style={[S.fieldLabel, {color:'#15803d'}]}>Email</Text>
                                <TextInput style={S.input} placeholder="name@example.com" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={v => setForm(f=>({...f,email:v}))} />

                                <Text style={[S.fieldLabel, {color:'#15803d'}]}>Mobile Numbers</Text>
                                {form.mobiles.map((m, i) => (
                                    <View key={i} style={{flexDirection:'row', alignItems:'center', gap:8, marginBottom:6}}>
                                        <TextInput style={[S.input, {flex:1, marginBottom:0}]} placeholder={`Mobile ${i+1}`} placeholderTextColor="#aaa" keyboardType="phone-pad" value={m} onChangeText={v => setMobile(i, v)} />
                                        {(form.mobiles.length > 1 || m.trim()) && (
                                            <TouchableOpacity onPress={() => removeMobile(i)} style={{padding:8}}>
                                                <Text style={{color:'#ef4444', fontWeight:'800', fontSize:16}}>✕</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                                <View style={{borderTopWidth:1, borderColor:'#e2e8f0', marginTop:16, paddingTop:16}}>
                                    <Text style={[S.sectionLabel, {color:BRAND}]}>SYSTEM ACCOUNT</Text>
                                    <Text style={{fontSize:11, color:'#94a3b8', marginBottom:10}}>Leave username blank to skip creating an account.</Text>

                                    <Text style={[S.fieldLabel, {color:'#15803d'}]}>Username</Text>
                                    <TextInput style={S.input} placeholder="login username" placeholderTextColor="#aaa" autoCapitalize="none" value={form.username} onChangeText={v => setForm(f=>({...f,username:v}))} />

                                    <Text style={[S.fieldLabel, {color:'#15803d'}]}>{editingUserId ? 'New Password (blank = keep current)' : 'Password'}</Text>
                                    <TextInput style={S.input} placeholder={editingUserId ? 'leave blank to keep' : 'required'} placeholderTextColor="#aaa" secureTextEntry value={form.password} onChangeText={v => setForm(f=>({...f,password:v}))} />

                                    <Text style={[S.fieldLabel, {color:'#15803d'}]}>Role</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                                        {ROLES.map(r => (
                                            <TouchableOpacity key={r} onPress={() => setForm(f=>({...f,role:r}))}
                                                style={[S.chip, form.role===r && {backgroundColor:BRAND}]}>
                                                <Text style={{fontSize:12, fontWeight:'700', color: form.role===r ? '#fff' : '#555'}}>{r}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
                                        <Text style={[S.fieldLabel, {color:'#15803d'}]}>Account Active</Text>
                                        <Switch value={form.isActive} onValueChange={v => setForm(f=>({...f,isActive:v}))} trackColor={{true:BRAND}} />
                                    </View>
                                </View>

                                <View style={{flexDirection:'row', gap:10, marginTop:8}}>
                                    <TouchableOpacity style={[S.saveBtn, {flex:1, backgroundColor:BRAND}]} onPress={save} disabled={saving}>
                                        <Text style={{color:'#fff', fontWeight:'900', fontSize:15}}>
                                            {saving ? 'SAVING...' : (editingStaffId || editingUserId) ? 'SAVE CHANGES' : 'CREATE STAFF MEMBER'}
                                        </Text>
                                    </TouchableOpacity>
                                    {(editingStaffId || editingUserId) && (
                                        <TouchableOpacity style={S.deleteBtn}
                                            onPress={() => deletePerson({
                                                staff: staffList.find(s => s._id === editingStaffId) || null,
                                                user:  users.find(u => u._id === editingUserId) || null,
                                            })}>
                                            <Text style={{color:'#fff', fontWeight:'900', fontSize:15}}>🗑️</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={{height:60}} />
                            </View>
                        </ScrollView>
                    </Modal>
                </View>
            )}

            {adminPartTab === 'attendance' && (
                <AttendanceSection staffList={staffList} BRAND={BRAND} API_KEY="BodyShopApp_SuperSecretKey_2026" />
            )}

            {adminPartTab === 'parts' && (
                <View style={S.settingCard}>
                    <Text style={S.settingCardTitle}>1. Create New Group (e.g. Brake Parts)</Text>
                    <TextInput style={S.input} placeholder="Type Group Name..." placeholderTextColor="#aaa" value={newGroupName} onChangeText={setNewGroupName} />
                    <TouchableOpacity style={[S.saveBtn, {backgroundColor:BRAND, marginBottom:20}]} onPress={handleAddGroup}>
                        <Text style={{color:'#fff', fontWeight:'bold'}}>SAVE NEW GROUP</Text>
                    </TouchableOpacity>

                    <Text style={S.settingCardTitle}>2. Select a Group</Text>
                    <ScrollView horizontal style={{flexDirection:'row', marginBottom:16}} showsHorizontalScrollIndicator={false}>
                        {dbPartsCatalog.map(g => (
                            <TouchableOpacity key={g._id}
                                style={[S.groupChip, selectedAdminGroupId===g._id && {backgroundColor:BRAND}]}
                                onPress={() => setSelectedAdminGroupId(prev => prev===g._id ? '' : g._id)}>
                                <Text style={{color: selectedAdminGroupId===g._id ? '#fff' : '#000', fontSize:11, fontWeight:'bold'}}>{g.groupName}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {selectedAdminGroupId && (
                        <View style={{marginBottom:10}}>
                            <Text style={S.settingCardTitle}>
                                3. Add Item to "{dbPartsCatalog.find(g => g._id===selectedAdminGroupId)?.groupName}"
                            </Text>
                            <TextInput style={S.input} placeholder="e.g. Front Brake Pads" placeholderTextColor="#aaa" value={newItemName} onChangeText={setNewItemName} />
                            <TouchableOpacity style={[S.saveBtn, {backgroundColor:BRAND}]} onPress={handleAddItem}>
                                <Text style={{color:'#fff', fontWeight:'bold'}}>+ ADD ITEM TO GROUP</Text>
                            </TouchableOpacity>
                            {(dbPartsCatalog.find(g => g._id===selectedAdminGroupId)?.items||[]).length > 0 && (
                                <View style={{marginTop:16}}>
                                    <Text style={{fontSize:12, fontWeight:'800', color:'#64748b', marginBottom:8, textTransform:'uppercase'}}>Items in this group</Text>
                                    {(dbPartsCatalog.find(g => g._id===selectedAdminGroupId)?.items||[]).map((item, idx) => (
                                        <View key={idx} style={S.itemRow}>
                                            <Text style={{flex:1, fontSize:13, color:'#1a202c'}}>{item}</Text>
                                            <TouchableOpacity style={S.itemDeleteBtn} onPress={() => handleDeleteItem(selectedAdminGroupId, idx)}>
                                                <Text style={{color:'#fff', fontWeight:'800', fontSize:11}}>✕ Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    <Text style={[S.settingCardTitle, {marginTop:30, color:'#e74c3c'}]}>Current Structure (Review & Delete)</Text>
                    {dbPartsCatalog.map(g => (
                        <View key={g._id} style={S.catalogBlock}>
                            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                <Text style={{fontWeight:'bold', color:'#000', fontSize:16}}>{g.groupName}</Text>
                                <TouchableOpacity onPress={() => handleDeleteGroup(g._id)}>
                                    <Text style={{color:'red', fontWeight:'bold', fontSize:12}}>Delete Group</Text>
                                </TouchableOpacity>
                            </View>
                            {g.items?.length > 0
                                ? <View style={{marginTop:10, paddingLeft:10, borderLeftWidth:2, borderLeftColor:BRAND}}>
                                    <Text style={{fontSize:12, color:'#555'}}>{g.items.join(', ')}</Text>
                                  </View>
                                : <Text style={{fontSize:12, color:'#aaa', marginTop:8}}>No items yet</Text>
                            }
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const S = StyleSheet.create({
    tabRow:        { flexDirection:'row', backgroundColor:'#e2e8f0', padding:4, borderRadius:8, marginBottom:15 },
    tabBtn:        { flex:1, padding:10, alignItems:'center', borderRadius:6 },
    tabBtnActive:  { backgroundColor:'#fff' },
    tabTxt:        { fontWeight:'bold', fontSize:12, color:'#64748b' },
    settingCard:   { backgroundColor:'#fff', padding:20, borderRadius:10, marginBottom:15 },
    settingCardTitle: { fontSize:16, fontWeight:'bold', color:'#2c3e50', borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:8, marginBottom:10 },
    input:         { borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, padding:11, marginBottom:10, fontSize:14, backgroundColor:'#fff', color:'#14532d' },
    saveBtn:       { padding:16, borderRadius:8, alignItems:'center', width:'100%' },
    deleteBtn:     { backgroundColor:'#ef4444', padding:16, borderRadius:8, alignItems:'center', paddingHorizontal:20 },
    addBtn:        { paddingHorizontal:16, paddingVertical:11, borderRadius:8, justifyContent:'center' },
    chip:          { backgroundColor:'#e2e8f0', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginRight:8 },
    chip2:         { backgroundColor:'#f1f5f9', paddingHorizontal:8, paddingVertical:4, borderRadius:8, fontSize:11, color:'#475569' },
    card:          { backgroundColor:'#fff', borderRadius:10, padding:14, marginBottom:10, borderLeftWidth:4, elevation:2, shadowColor:'#16a34a', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4 },
    badge:         { paddingHorizontal:8, paddingVertical:3, borderRadius:12, alignSelf:'flex-start' },
    sectionLabel:  { fontSize:11, fontWeight:'900', marginBottom:8, letterSpacing:1 },
    fieldLabel:    { fontSize:12, fontWeight:'700', marginBottom:4, marginTop:8, textTransform:'uppercase' },
    modalHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, backgroundColor:'#fff', borderBottomWidth:1, borderColor:'#e2e8f0' },
    modalBody:     { padding:18 },
    groupChip:     { paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:'#e2e8f0', marginRight:8, borderWidth:1, borderColor:'#cbd5e0' },
    itemRow:       { flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#f1f5f9' },
    itemDeleteBtn: { backgroundColor:'#ef4444', paddingHorizontal:10, paddingVertical:5, borderRadius:4 },
    catalogBlock:  { padding:12, backgroundColor:'#f8f9fa', borderRadius:8, marginTop:10, borderWidth:1, borderColor:'#edf2f7' },
});
