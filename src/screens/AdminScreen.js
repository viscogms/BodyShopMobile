import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';

const STAFF_CATEGORIES = ['Foreman','Technician','Helper','Supervisor','Accounts Clerk','Driver','Denter','Painter'];
const ROLES = ['Admin','Owner','Technician','User'];

const BLANK = () => ({
    name:'', category:'Technician', birthday:'', country:'', passportNo:'',
    eid:'', eidExpiry:'', salary:'', mobiles:[''], email:'',
    username:'', password:'', role:'User', isActive:true,
});

const BRAND = '#16a34a';

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
                        return (
                            <TouchableOpacity key={name} style={[S.card, {borderLeftColor:BRAND}]} onPress={() => openEdit({ staff: s, user: u })}>
                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <View style={{flex:1}}>
                                        <Text style={{fontWeight:'900', fontSize:15, color:'#14532d'}}>{name}</Text>
                                        <View style={{flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:4}}>
                                            {s && <View style={[S.badge, {backgroundColor:'#dcfce7'}]}><Text style={{color:BRAND, fontSize:10, fontWeight:'800'}}>{s.category}</Text></View>}
                                            {u && (
                                                <View style={[S.badge, {backgroundColor: u.isActive ? '#dcfce7' : '#fee2e2'}]}>
                                                    <Text style={{color: u.isActive ? '#15803d' : '#dc2626', fontSize:10, fontWeight:'800'}}>{u.role} {u.isActive ? '✓' : '✗'}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => deletePerson({ staff: s, user: u })} style={{padding:6}}>
                                        <Text style={{color:'#ef4444', fontWeight:'800', fontSize:13}}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:8}}>
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
                            </TouchableOpacity>
                        );
                    })}
                    {!loading && filtered.length === 0 && (
                        <Text style={{textAlign:'center', color:'#aaa', marginTop:30}}>No staff found.</Text>
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
