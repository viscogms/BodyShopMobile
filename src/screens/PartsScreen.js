import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BRAND = '#16a34a';

export default function PartsScreen({
    onBack, isDark = false,
    dbPartsCatalog, newGroupName, setNewGroupName, handleAddGroup,
    selectedAdminGroupId, setSelectedAdminGroupId, newItemName, setNewItemName, handleAddItem,
    handleDeleteGroup, handleDeleteItem,
}) {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0c12' : '#f4f7f8' }} edges={['top', 'left', 'right']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, backgroundColor: '#ffffff', borderBottomColor: BRAND }}>
                <TouchableOpacity onPress={onBack} style={{ paddingRight: 14, paddingVertical: 4 }}>
                    <Text style={{ color: BRAND, fontSize: 22 }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ color: '#14532d', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>🔧 Parts</Text>
            </View>
            <ScrollView style={{ flex: 1, padding: 15 }} keyboardShouldPersistTaps="handled">
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
                            <TouchableOpacity style={S.saveBtn} onPress={handleAddItem}>
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
            </ScrollView>
        </SafeAreaView>
    );
}

const S = StyleSheet.create({
    settingCard:   { backgroundColor:'#fff', padding:20, borderRadius:10, marginBottom:15 },
    settingCardTitle: { fontSize:16, fontWeight:'bold', color:'#2c3e50', borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:8, marginBottom:10 },
    input:         { borderWidth:1, borderColor:'#e2e8f0', borderRadius:8, padding:11, marginBottom:10, fontSize:14, backgroundColor:'#fff', color:'#14532d' },
    saveBtn:       { padding:16, borderRadius:8, alignItems:'center', width:'100%' },
    groupChip:     { paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:'#e2e8f0', marginRight:8, borderWidth:1, borderColor:'#cbd5e0' },
    itemRow:       { flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#f1f5f9' },
    itemDeleteBtn: { backgroundColor:'#ef4444', paddingHorizontal:10, paddingVertical:5, borderRadius:4 },
    catalogBlock:  { padding:12, backgroundColor:'#f8f9fa', borderRadius:8, marginTop:10, borderWidth:1, borderColor:'#edf2f7' },
});
