import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Modal, Alert } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';

const STAFF_CATEGORIES = ['Foreman','Technician','Helper','Supervisor','Accounts Clerk','Driver','Denter','Painter'];

const blankStaff = () => ({ name:'', category:'Technician', birthday:'', country:'', passportNo:'', eid:'', eidExpiry:'', salary:'', mobiles:[''], email:'' });

export default function AdminScreen({
    adminPartTab, setAdminPartTab, usersList, openNewUserModal, openEditUserModal, handleDeleteUser, toggleUserActive,
    dbPartsCatalog, newGroupName, setNewGroupName, handleAddGroup,
    selectedAdminGroupId, setSelectedAdminGroupId, newItemName, setNewItemName, handleAddItem, handleDeleteGroup,
    handleDeleteItem,
}) {
    // Staff records local state
    const [staffList,       setStaffList]       = useState([]);
    const [staffLoaded,     setStaffLoaded]      = useState(false);
    const [staffLoading,    setStaffLoading]     = useState(false);
    const [showStaffModal,  setShowStaffModal]   = useState(false);
    const [editingStaffId,  setEditingStaffId]   = useState(null);
    const [staffForm,       setStaffForm]        = useState(blankStaff());
    const [staffSearch,     setStaffSearch]      = useState('');
    const [staffCatFilter,  setStaffCatFilter]   = useState('all');
    const [staffSaving,     setStaffSaving]      = useState(false);

    const fetchStaff = async () => {
        if (staffLoading) return;
        setStaffLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/staff`);
            setStaffList(res.data);
            setStaffLoaded(true);
        } catch (e) { Alert.alert('Error', 'Failed to load staff records'); }
        finally { setStaffLoading(false); }
    };

    const switchToStaff = () => {
        setAdminPartTab('staff');
        if (!staffLoaded) fetchStaff();
    };

    const openNewStaff  = () => { setEditingStaffId(null); setStaffForm(blankStaff()); setShowStaffModal(true); };
    const openEditStaff = (s) => {
        setEditingStaffId(s._id);
        setStaffForm({ ...s, salary: String(s.salary||''), mobiles: s.mobiles?.length ? [...s.mobiles,''] : [''] });
        setShowStaffModal(true);
    };

    const saveStaff = async () => {
        if (!staffForm.name.trim()) return Alert.alert('Required', 'Name is required');
        setStaffSaving(true);
        try {
            const payload = { ...staffForm, mobiles: staffForm.mobiles.filter(m => m.trim()), salary: Number(staffForm.salary)||0 };
            if (editingStaffId) {
                const res = await axios.put(`${API_BASE}/staff/${editingStaffId}`, payload);
                setStaffList(prev => prev.map(s => s._id === editingStaffId ? res.data : s));
            } else {
                const res = await axios.post(`${API_BASE}/staff`, payload);
                setStaffList(prev => [res.data, ...prev]);
            }
            setShowStaffModal(false);
        } catch (e) { Alert.alert('Error', 'Failed to save'); }
        finally { setStaffSaving(false); }
    };

    const deleteStaff = (s) => {
        Alert.alert('Delete Record', `Delete "${s.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await axios.delete(`${API_BASE}/staff/${s._id}`);
                setStaffList(prev => prev.filter(x => x._id !== s._id));
                setShowStaffModal(false);
            }}
        ]);
    };

    const setMobile = (idx, val) => {
        const list = [...staffForm.mobiles];
        list[idx] = val;
        if (idx === list.length - 1 && val.trim()) list.push('');
        setStaffForm(f => ({ ...f, mobiles: list }));
    };

    const removeMobile = (idx) => {
        const list = staffForm.mobiles.filter((_, i) => i !== idx);
        setStaffForm(f => ({ ...f, mobiles: list.length ? list : [''] }));
    };

    const filteredStaff = staffList.filter(s => {
        const q = staffSearch.toLowerCase();
        const matchSearch = !staffSearch || [s.name, s.eid, s.passportNo, s.email].some(f => (f||'').toLowerCase().includes(q));
        const matchCat = staffCatFilter === 'all' || s.category === staffCatFilter;
        return matchSearch && matchCat;
    });

    return (
       <ScrollView style={{flex: 1, backgroundColor: '#f4f7f8', padding: 15}} keyboardShouldPersistTaps="handled">
          {/* Tab header */}
          <View style={styles.adminTabHeaderRow}>
             <TouchableOpacity style={[styles.adminTabHeaderBtn, adminPartTab === 'users' && styles.adminTabHeaderBtnActive]} onPress={() => setAdminPartTab('users')}>
               <Text style={[styles.tabBtnTxt, adminPartTab === 'users' && {color:'#16a34a'}]}>👥 Accounts</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.adminTabHeaderBtn, adminPartTab === 'staff' && styles.adminTabHeaderBtnActive]} onPress={switchToStaff}>
               <Text style={[styles.tabBtnTxt, adminPartTab === 'staff' && {color:'#16a34a'}]}>🪪 Staff</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.adminTabHeaderBtn, adminPartTab === 'parts' && styles.adminTabHeaderBtnActive]} onPress={() => setAdminPartTab('parts')}>
               <Text style={[styles.tabBtnTxt, adminPartTab === 'parts' && {color:'#16a34a'}]}>⚙️ Parts</Text>
             </TouchableOpacity>
          </View>

          {/* ── ACCOUNTS TAB ─────────────────────────────────── */}
          {adminPartTab === 'users' && (
             <View>
                <View style={styles.settingCard}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomWidth:1, borderColor:'#eee', paddingBottom:10, marginBottom:10}}>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>System Identity Matrix</Text>
                    <TouchableOpacity style={{backgroundColor: '#27ae60', padding: 8, borderRadius: 5}} onPress={openNewUserModal}><Text style={{color: '#fff', fontWeight:'bold'}}>+ Add Staff</Text></TouchableOpacity>
                  </View>
                  {usersList.map((u, i) => (
                    <View key={i} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f1f1'}}>
                      <View style={{ flex: 1 }}>
                        <Text style={{fontWeight: 'bold', fontSize: 15, color: u.isActive ? '#000' : '#e74c3c'}}>{u.name}</Text>
                        <Text style={{fontSize: 12, color: '#7f8c8d'}}>{u.role} • {u.username}</Text>
                      </View>
                      {u.username !== 'admin' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity style={{backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5}} onPress={() => openEditUserModal(u)}>
                            <Text style={{color: '#16a34a', fontWeight: '700', fontSize: 12}}>✏️ Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={{backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5}} onPress={() => handleDeleteUser(u)}>
                            <Text style={{color: '#ef4444', fontWeight: '700', fontSize: 12}}>🗑️</Text>
                          </TouchableOpacity>
                          <Switch value={u.isActive} onValueChange={() => toggleUserActive(u)} trackColor={{ true: "#27ae60" }} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
             </View>
          )}

          {/* ── STAFF RECORDS TAB ────────────────────────────── */}
          {adminPartTab === 'staff' && (
            <View>
              {/* Search + filter row */}
              <View style={{flexDirection:'row', gap:8, marginBottom:12, flexWrap:'wrap'}}>
                <TextInput
                  style={[styles.input, {flex:1, minWidth:140}]}
                  placeholder="Search name, EID..."
                  placeholderTextColor="#aaa"
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                />
                <TouchableOpacity style={styles.addBtn} onPress={openNewStaff}>
                  <Text style={{color:'#fff', fontWeight:'800', fontSize:13}}>+ Add Staff</Text>
                </TouchableOpacity>
              </View>

              {/* Category filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                {['all', ...STAFF_CATEGORIES].map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setStaffCatFilter(cat)}
                    style={[styles.catChip, staffCatFilter === cat && styles.catChipActive]}>
                    <Text style={{fontSize:11, fontWeight:'700', color: staffCatFilter===cat ? '#fff' : '#555'}}>
                      {cat === 'all' ? 'All' : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {staffLoading && <Text style={{textAlign:'center', color:'#888', marginTop:20}}>Loading...</Text>}

              {/* Staff cards */}
              {filteredStaff.map(s => (
                <TouchableOpacity key={s._id} style={styles.staffCard} onPress={() => openEditStaff(s)}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <View style={{flex:1}}>
                      <Text style={{fontWeight:'900', fontSize:15, color:'#14532d'}}>{s.name}</Text>
                      <View style={styles.catBadge}><Text style={{color:'#16a34a', fontSize:10, fontWeight:'800'}}>{s.category}</Text></View>
                    </View>
                    <TouchableOpacity onPress={() => deleteStaff(s)} style={{padding:6}}>
                      <Text style={{color:'#ef4444', fontWeight:'800', fontSize:13}}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:8}}>
                    {s.country    && <Text style={styles.infoChip}>🌍 {s.country}</Text>}
                    {s.salary > 0 && <Text style={styles.infoChip}>💰 AED {s.salary}</Text>}
                    {s.eid        && <Text style={styles.infoChip}>🪪 {s.eid}</Text>}
                    {s.eidExpiry  && <Text style={styles.infoChip}>📅 {s.eidExpiry}</Text>}
                    {s.passportNo && <Text style={styles.infoChip}>📘 {s.passportNo}</Text>}
                    {s.birthday   && <Text style={styles.infoChip}>🎂 {s.birthday}</Text>}
                    {(s.mobiles||[]).filter(Boolean).map((m,i) => <Text key={i} style={styles.infoChip}>📞 {m}</Text>)}
                    {s.email      && <Text style={[styles.infoChip, {maxWidth:'100%'}]}>✉️ {s.email}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              {!staffLoading && filteredStaff.length === 0 && (
                <Text style={{textAlign:'center', color:'#aaa', marginTop:30}}>No staff records found.</Text>
              )}

              {/* Staff add/edit modal */}
              <Modal visible={showStaffModal} animationType="slide" onRequestClose={() => setShowStaffModal(false)}>
                <ScrollView style={{flex:1, backgroundColor:'#f4f7f8'}} keyboardShouldPersistTaps="handled">
                  {/* Modal header */}
                  <View style={styles.modalHeader}>
                    <Text style={{fontWeight:'900', fontSize:17, color:'#14532d'}}>{editingStaffId ? '✏️ Edit Staff Record' : '🆕 New Staff Record'}</Text>
                    <TouchableOpacity onPress={() => setShowStaffModal(false)}><Text style={{fontSize:22, color:'#94a3b8'}}>✕</Text></TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.fieldLabel}>Full Name *</Text>
                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#aaa" value={staffForm.name} onChangeText={v => setStaffForm(f=>({...f,name:v}))} />

                    <Text style={styles.fieldLabel}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                      {STAFF_CATEGORIES.map(cat => (
                        <TouchableOpacity key={cat} onPress={() => setStaffForm(f=>({...f,category:cat}))}
                          style={[styles.catChip, staffForm.category===cat && styles.catChipActive]}>
                          <Text style={{fontSize:12, fontWeight:'700', color: staffForm.category===cat ? '#fff' : '#555'}}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={{flexDirection:'row', gap:10}}>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>Birthday</Text>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" value={staffForm.birthday} onChangeText={v => setStaffForm(f=>({...f,birthday:v}))} />
                      </View>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>Country</Text>
                        <TextInput style={styles.input} placeholder="e.g. Sri Lanka" placeholderTextColor="#aaa" value={staffForm.country} onChangeText={v => setStaffForm(f=>({...f,country:v}))} />
                      </View>
                    </View>

                    <View style={{flexDirection:'row', gap:10}}>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>Passport No.</Text>
                        <TextInput style={styles.input} placeholder="N12345678" placeholderTextColor="#aaa" autoCapitalize="characters" value={staffForm.passportNo} onChangeText={v => setStaffForm(f=>({...f,passportNo:v.toUpperCase()}))} />
                      </View>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>Salary (AED)</Text>
                        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#aaa" keyboardType="number-pad" value={staffForm.salary} onChangeText={v => setStaffForm(f=>({...f,salary:v}))} />
                      </View>
                    </View>

                    <View style={{flexDirection:'row', gap:10}}>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>EID</Text>
                        <TextInput style={styles.input} placeholder="784-xxxx-xxxxxxx-x" placeholderTextColor="#aaa" value={staffForm.eid} onChangeText={v => setStaffForm(f=>({...f,eid:v}))} />
                      </View>
                      <View style={{flex:1}}>
                        <Text style={styles.fieldLabel}>EID Expiry</Text>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" value={staffForm.eidExpiry} onChangeText={v => setStaffForm(f=>({...f,eidExpiry:v}))} />
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput style={styles.input} placeholder="name@example.com" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" value={staffForm.email} onChangeText={v => setStaffForm(f=>({...f,email:v}))} />

                    <Text style={styles.fieldLabel}>Mobile Numbers</Text>
                    {staffForm.mobiles.map((m, i) => (
                      <View key={i} style={{flexDirection:'row', alignItems:'center', gap:8, marginBottom:6}}>
                        <TextInput
                          style={[styles.input, {flex:1, marginBottom:0}]}
                          placeholder={`Mobile ${i+1}`}
                          placeholderTextColor="#aaa"
                          keyboardType="phone-pad"
                          value={m}
                          onChangeText={v => setMobile(i, v)}
                        />
                        {(staffForm.mobiles.length > 1 || m.trim()) && (
                          <TouchableOpacity onPress={() => removeMobile(i)} style={{padding:8}}>
                            <Text style={{color:'#ef4444', fontWeight:'800', fontSize:16}}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    <View style={{flexDirection:'row', gap:10, marginTop:20}}>
                      <TouchableOpacity style={[styles.saveBtn, {flex:1}]} onPress={saveStaff} disabled={staffSaving}>
                        <Text style={{color:'#fff', fontWeight:'900', fontSize:15}}>{staffSaving ? 'SAVING...' : editingStaffId ? 'SAVE CHANGES' : 'CREATE RECORD'}</Text>
                      </TouchableOpacity>
                      {editingStaffId && (
                        <TouchableOpacity style={[styles.deleteBtn]} onPress={() => deleteStaff(staffList.find(s => s._id === editingStaffId))}>
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

          {/* ── PARTS TAB ────────────────────────────────────── */}
          {adminPartTab === 'parts' && (
             <View style={styles.settingCard}>
                <Text style={styles.settingCardTitle}>1. Create New Group (e.g. Brake Parts)</Text>
                <TextInput style={styles.input} placeholder="Type Group Name..." placeholderTextColor="#aaa" value={newGroupName} onChangeText={setNewGroupName} />
                <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#27ae60', marginBottom: 20}]} onPress={handleAddGroup}><Text style={{color:'#fff', fontWeight:'bold'}}>SAVE NEW GROUP</Text></TouchableOpacity>

                <Text style={styles.settingCardTitle}>2. Select a Group</Text>
                <ScrollView horizontal style={{flexDirection: 'row', marginBottom: 16}} showsHorizontalScrollIndicator={false}>
                   {dbPartsCatalog.map(g => (
                      <TouchableOpacity key={g._id}
                         style={[styles.smallAdminCatSelectTab, selectedAdminGroupId === g._id && {backgroundColor: '#16a34a'}]}
                         onPress={() => setSelectedAdminGroupId(prev => prev === g._id ? '' : g._id)}>
                         <Text style={{color: selectedAdminGroupId === g._id ? '#fff' : '#000', fontSize: 11, fontWeight: 'bold'}}>{g.groupName}</Text>
                      </TouchableOpacity>
                   ))}
                </ScrollView>

                {selectedAdminGroupId && (
                   <View style={{marginBottom: 10}}>
                      <Text style={styles.settingCardTitle}>
                        3. Add Item to "{dbPartsCatalog.find(g => g._id === selectedAdminGroupId)?.groupName}"
                      </Text>
                      <TextInput style={styles.input} placeholder="e.g. Front Brake Pads" placeholderTextColor="#aaa" value={newItemName} onChangeText={setNewItemName} />
                      <TouchableOpacity style={styles.saveBtn} onPress={handleAddItem}>
                          <Text style={{color:'#fff', fontWeight:'bold'}}>+ ADD ITEM TO GROUP</Text>
                      </TouchableOpacity>

                      {(dbPartsCatalog.find(g => g._id === selectedAdminGroupId)?.items || []).length > 0 && (
                        <View style={{ marginTop: 16 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>Items in this group</Text>
                          {(dbPartsCatalog.find(g => g._id === selectedAdminGroupId)?.items || []).map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                              <Text style={{ flex: 1, fontSize: 13, color: '#1a202c' }}>{item}</Text>
                              <TouchableOpacity style={styles.itemDeleteBtn} onPress={() => handleDeleteItem(selectedAdminGroupId, idx)}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>✕ Remove</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                   </View>
                )}

                <Text style={[styles.settingCardTitle, {marginTop: 30, color: '#e74c3c'}]}>Current Structure (Review & Delete)</Text>
                {dbPartsCatalog.map(g => (
                   <View key={g._id} style={styles.adminCatalogSummaryBlock}>
                      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <Text style={{fontWeight: 'bold', color: '#000', fontSize: 16}}>{g.groupName}</Text>
                        <TouchableOpacity onPress={() => handleDeleteGroup(g._id)}><Text style={{color: 'red', fontWeight: 'bold', fontSize: 12}}>Delete Group</Text></TouchableOpacity>
                      </View>
                      {g.items && g.items.length > 0 ? (
                         <View style={{marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#27ae60'}}>
                            <Text style={{fontSize: 12, color: '#555'}}>{g.items.join(', ')}</Text>
                         </View>
                      ) : (
                         <Text style={{fontSize: 12, color: '#aaa', marginTop: 8}}>No items yet</Text>
                      )}
                      {g.subGroups && g.subGroups.length > 0 && g.subGroups.map((sg, i) => (
                         <View key={i} style={{marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#ccc'}}>
                            <Text style={{fontWeight: 'bold', color: '#16a34a'}}>{sg.subGroupName}</Text>
                            <Text style={{fontSize: 12, color: '#555'}}>{sg.items.join(', ') || 'No items'}</Text>
                         </View>
                      ))}
                   </View>
                ))}
             </View>
          )}
       </ScrollView>
    );
}

const styles = StyleSheet.create({
  settingCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 15 },
  settingCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 10 },
  adminTabHeaderRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 8, marginBottom: 15 },
  adminTabHeaderBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 6 },
  adminTabHeaderBtnActive: { backgroundColor: '#fff' },
  tabBtnTxt: { fontWeight: 'bold', fontSize: 12, color: '#64748b' },
  smallAdminCatSelectTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8, borderWidth: 1, borderColor: '#cbd5e0' },
  adminCatalogSummaryBlock: { padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#edf2f7' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 11, marginBottom: 10, fontSize: 14, backgroundColor: '#fff', color: '#14532d' },
  saveBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', width: '100%' },
  deleteBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 8, alignItems: 'center', paddingHorizontal: 20 },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  // Staff-specific
  staffCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#16a34a', elevation: 2, shadowColor: '#16a34a', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4 },
  catBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  catChip: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  catChipActive: { backgroundColor: '#16a34a' },
  infoChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, color: '#475569' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  modalBody: { padding: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 4, marginTop: 8, textTransform: 'uppercase' },
});
