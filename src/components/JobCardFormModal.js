import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, TextInput, StyleSheet, Platform, Switch, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getStatusColor } from '../utils/helpers';
import { Image as ExpoImage } from 'expo-image';
import * as Contacts from 'expo-contacts';
import { getStyles } from '../utils/AppStyles';

const { width } = Dimensions.get('window');

export default function JobCardFormModal({
  showForm, setShowForm, isEditing, handleSave, loading,
  formTab, setFormTab, formData, setFormData,
  setDropdownMode, setShowStatusDropdown,
  showJobCardDatePicker, setShowJobCardDatePicker,
  showDeliveryDatePicker, setShowDeliveryDatePicker,
  tempDateObj, setTempDateObj,
  showReminderDatePicker, setShowReminderDatePicker,
  showReminderTimePicker, setShowReminderTimePicker,
  renderImageSection, openContactList,
  quickVoice, setQuickVoice, updateDynamicList,
  activeNavGroup, setActiveNavGroup,
  activeNavSubGroup, setActiveNavSubGroup,
  dbPartsCatalog, partSelections, toggleCatalogPart,
  customParts, updateDynamicCustomPart, removeCustomPart,
  usersList = [],
  isDark = true
}) {
  const voiceRefs       = useRef([]);
  const customPartsRefs = useRef([]);
  const [showPrefixDropdown, setShowPrefixDropdown] = React.useState(false);
  const [showMechanicPicker, setShowMechanicPicker] = React.useState(false);
  const S = getStyles(isDark);
  const C = isDark
    ? require('../utils/AppStyles').COLORS.dark
    : require('../utils/AppStyles').COLORS.light;

  const toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const addNewContact = async () => {
    if (formData.customerContact) {
      try { await Contacts.presentFormAsync(null, { name: formData.customerName || 'New Customer', phoneNumbers: [{ label: 'mobile', number: formData.customerContact }] }); }
      catch (error) { Alert.alert("Error", "Could not open Contacts."); }
    } else { Alert.alert("Notice", "Please enter a phone number first."); }
  };

  const formatSafeDate = (d) => {
    if (!d) return '-';
    if (typeof d === 'number' || !isNaN(Number(d))) return new Date(Number(d)).toISOString().split('T')[0];
    return String(d).split('T')[0].split(' ')[0];
  };

  const bg   = isDark ? '#0B0E14' : '#f4f7f8';
  const card = isDark ? '#0f1117' : '#ffffff';

  return (
    <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
      {/* ✅ FIX: Android eke 'height' use karanawa — keyboard field hide karanne nehe */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>

          {/* Header */}
          <View style={[S.modalHeader, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={S.modalTitle}>{isEditing ? '✏️  Modify Job Card' : '🆕  New Job Card'}</Text>
            <TouchableOpacity style={S.largeCloseBtn} onPress={() => setShowForm(false)}>
              <Text style={S.largeCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <View style={[S.topSaveContainer]}>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>
                {loading ? 'SAVING...' : '💾  COMMIT TRANSACTION'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={S.tabContainer}>
            <TouchableOpacity style={[S.tabBtn, formTab === 'info'  && S.tabBtnActive]} onPress={() => setFormTab('info')}>
              <Text style={[S.tabBtnText, formTab === 'info'  && S.tabBtnTextActive]}>📝  Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.tabBtn, formTab === 'parts' && S.tabBtnActive]} onPress={() => setFormTab('parts')}>
              <Text style={[S.tabBtnText, formTab === 'parts' && S.tabBtnTextActive]}>⚙️  Parts & Report</Text>
            </TouchableOpacity>
          </View>

          {formTab === 'info' ? (
            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 10, backgroundColor: bg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={S.formInputLabel}>Job Card Number</Text>
              <TextInput style={S.input} placeholder="e.g. JC-2026-889" placeholderTextColor={C.textSub} value={formData.jobCardNo} onChangeText={(v) => setFormData({ ...formData, jobCardNo: v })} />

              <TextInput
                style={[S.input, { fontSize: 17, fontWeight: '800', marginTop: 14, borderColor: C.accentDeep, borderWidth: 1.5, borderRadius: 10, padding: 14 }]}
                placeholder="PLATE NUMBER (e.g. DXB 24746)"
                placeholderTextColor="#90a4ae"
                value={formData.plateNumber}
                onChangeText={(v) => setFormData({ ...formData, plateNumber: (v || '').toUpperCase() })}
              />

              <Text style={S.formInputLabel}>Car Model / Brand</Text>
              <TextInput style={S.input} placeholder="Nissan Sunny, BMW 740Li..." placeholderTextColor={C.textSub} value={formData.carModel} onChangeText={(v) => setFormData({ ...formData, carModel: toTitleCase(v) })} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>Chassis No. (VIN)</Text>
                  <TextInput style={S.input} placeholder="Chassis Number" placeholderTextColor={C.textSub} autoCapitalize="characters" value={formData.vin} onChangeText={(v) => setFormData({ ...formData, vin: (v || '').toUpperCase() })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>ODO Kilometer</Text>
                  <TextInput style={S.input} placeholder="e.g. 45000" placeholderTextColor={C.textSub} keyboardType="number-pad" value={String(formData.odoKM || '')} onChangeText={(v) => setFormData({ ...formData, odoKM: v })} />
                </View>
              </View>

              <Text style={S.formInputLabel}>Company Name (Optional)</Text>
              <TextInput style={S.input} placeholder="Company Name" placeholderTextColor={C.textSub} value={formData.companyName} onChangeText={(v) => setFormData({ ...formData, companyName: toTitleCase(v) })} />

              <TouchableOpacity style={S.contactPickerTriggerBtn} onPress={openContactList}>
                <Text style={S.contactPickerTriggerText}>👤  PICK FROM CONTACTS</Text>
              </TouchableOpacity>

              <Text style={S.formInputLabel}>Customer Name</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ zIndex: 10 }}>
                  <TouchableOpacity style={S.prefixDropdownBtn} onPress={() => setShowPrefixDropdown(!showPrefixDropdown)}>
                    <Text style={{ fontWeight: '800', color: '#fff' }}>{formData.customerPrefix || 'Mr.'} ▼</Text>
                  </TouchableOpacity>
                  {showPrefixDropdown && (
                    <View style={S.prefixDropdownList}>
                      {['Mr.', 'Mrs.', 'Miss'].map(px => (
                        <TouchableOpacity key={px} style={{ padding: 12, borderBottomWidth: 1, borderColor: C.border }} onPress={() => { setFormData({ ...formData, customerPrefix: px }); setShowPrefixDropdown(false); }}>
                          <Text style={{ color: C.text }}>{px}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <TextInput style={[S.input, { flex: 1, zIndex: 1 }]} placeholder="Customer Name" placeholderTextColor={C.textSub} value={formData.customerName} onChangeText={(v) => setFormData({ ...formData, customerName: toTitleCase(v) })} />
              </View>

              <Text style={S.formInputLabel}>Customer Contacts</Text>
              {formData.customerContacts.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[S.input, { flex: 1 }]}
                    placeholder="Phone Number"
                    placeholderTextColor={C.textSub}
                    keyboardType="phone-pad"
                    value={c}
                    onChangeText={(val) => {
                      let newList = [...formData.customerContacts]; newList[i] = val;
                      if (i === newList.length - 1 && val !== '') newList.push('');
                      if (i === 0) setFormData({ ...formData, customerContacts: newList, customerContact: val });
                      else setFormData({ ...formData, customerContacts: newList });
                    }}
                  />
                  {(c !== '' || formData.customerContacts.length > 1) && (
                    <TouchableOpacity onPress={() => { let newList = [...formData.customerContacts]; newList.splice(i, 1); if (newList.length === 0) newList.push(''); setFormData({ ...formData, customerContacts: newList }); }} style={{ padding: 10 }}>
                      <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={addNewContact} style={{ marginTop: -5, marginBottom: 15, alignSelf: 'flex-start' }}>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '800' }}>➕  Add to Contacts</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>Inspection Tech</Text>
                  <TextInput style={S.input} placeholder="Tech Name" placeholderTextColor={C.textSub} value={formData.inspectionTech} onChangeText={(v) => setFormData({ ...formData, inspectionTech: toTitleCase(v) })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>Assigned Mechanic</Text>
                  <TouchableOpacity style={[S.input, { justifyContent: 'center' }]} onPress={() => setShowMechanicPicker(true)}>
                    <Text style={{ color: formData.jobDoneBy ? C.text : C.textSub, fontSize: 14 }}>
                      {formData.jobDoneBy || 'Select Mechanic ▼'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mechanic picker modal */}
              <Modal visible={showMechanicPicker} transparent animationType="fade" onRequestClose={() => setShowMechanicPicker(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 }}>
                  <View style={{ backgroundColor: isDark ? '#1a1f2e' : '#fff', borderRadius: 14, padding: 20, maxHeight: 400 }}>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: C.text, marginBottom: 14 }}>Select Mechanic</Text>
                    <ScrollView>
                      {usersList.filter(u => u.isActive !== false).map((u, i) => (
                        <TouchableOpacity key={i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          onPress={() => { setFormData({ ...formData, jobDoneBy: u.name }); setShowMechanicPicker(false); }}>
                          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{(u.name || '?')[0].toUpperCase()}</Text>
                          </View>
                          <View>
                            <Text style={{ fontWeight: '700', color: C.text }}>{u.name}</Text>
                            <Text style={{ fontSize: 11, color: C.textSub }}>{u.role}</Text>
                          </View>
                          {formData.jobDoneBy === u.name && <Text style={{ marginLeft: 'auto', color: C.accent, fontWeight: '800' }}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}
                        onPress={() => { setFormData({ ...formData, jobDoneBy: '' }); setShowMechanicPicker(false); }}>
                        <Text style={{ color: '#ef4444', fontWeight: '700' }}>✕  Clear Selection</Text>
                      </TouchableOpacity>
                    </ScrollView>
                    <TouchableOpacity style={{ marginTop: 14, alignSelf: 'flex-end' }} onPress={() => setShowMechanicPicker(false)}>
                      <Text style={{ color: C.textSub, fontWeight: '700' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              <Text style={S.formInputLabel}>Invoice & Payment Details</Text>
              <TextInput style={S.input} placeholder="Invoice No (e.g. INV-1002)" placeholderTextColor={C.textSub} value={formData.invoiceNo} onChangeText={(v) => setFormData({ ...formData, invoiceNo: v })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: C.textSub, marginBottom: 2 }}>Total Amount</Text>
                  <TextInput style={S.input} placeholder="0.00" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={String(formData.invoiceAmount || '')} onChangeText={(v) => setFormData({ ...formData, invoiceAmount: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: C.textSub, marginBottom: 2 }}>Paid Amount</Text>
                  <TextInput style={S.input} placeholder="0.00" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={String(formData.paidAmount || '')} onChangeText={(v) => setFormData({ ...formData, paidAmount: v })} />
                </View>
              </View>

              <Text style={S.formInputLabel}>Repair Status</Text>
              <TouchableOpacity style={S.statusDropdownBtnLarge} onPress={() => { setDropdownMode('form'); setShowStatusDropdown(true); }}>
                <Text style={[S.statusDropdownText, { color: getStatusColor(formData.status) }]}>{formData.status || 'Inspection'}</Text>
                <Text style={{ color: C.textSub, fontSize: 13 }}>▼ Change</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>Job Card Date</Text>
                  <TouchableOpacity style={S.datePickerBtn} onPress={() => { setTempDateObj(new Date()); setShowJobCardDatePicker(true); }}>
                    <Text style={S.datePickerBtnText}>{formatSafeDate(formData.jobCardDate)}</Text>
                  </TouchableOpacity>
                  {showJobCardDatePicker && (<DateTimePicker value={tempDateObj} mode="date" display="default" onChange={(e, d) => { setShowJobCardDatePicker(false); if (d) { const os = d.getTimezoneOffset() * 60000; setFormData({ ...formData, jobCardDate: (new Date(d - os)).toISOString().split('T')[0] }); } }} />)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.formInputLabel}>Delivery Date</Text>
                  <TouchableOpacity style={S.datePickerBtn} onPress={() => { setTempDateObj(new Date()); setShowDeliveryDatePicker(true); }}>
                    <Text style={S.datePickerBtnText}>{formatSafeDate(formData.deliveryDate)}</Text>
                  </TouchableOpacity>
                  {showDeliveryDatePicker && (<DateTimePicker value={tempDateObj} mode="date" display="default" onChange={(e, d) => { setShowDeliveryDatePicker(false); if (d) { const os = d.getTimezoneOffset() * 60000; setFormData({ ...formData, deliveryDate: (new Date(d - os)).toISOString().split('T')[0] }); } }} />)}
                </View>
              </View>

              <Text style={S.formInputLabel}>Next Customer Reminder</Text>
              <TouchableOpacity style={[S.datePickerBtn, { borderColor: '#f59e0b' }]} onPress={() => { setTempDateObj(new Date()); setShowReminderDatePicker(true); }}>
                <Text style={[S.datePickerBtnText, { color: '#f59e0b' }]}>{formData.reminderTime || '🔔  Set Reminder Time'}</Text>
              </TouchableOpacity>
              {showReminderDatePicker && (<DateTimePicker value={tempDateObj} mode="date" display="default" onChange={(e, d) => { setShowReminderDatePicker(false); if (d) { setTempDateObj(d); setShowReminderTimePicker(true); } }} />)}
              {showReminderTimePicker && (<DateTimePicker value={tempDateObj} mode="time" display="default" onChange={(e, t) => { setShowReminderTimePicker(false); if (t) { const fd = new Date(tempDateObj); fd.setHours(t.getHours()); fd.setMinutes(t.getMinutes()); const os = fd.getTimezoneOffset() * 60000; setFormData({ ...formData, reminderTime: (new Date(fd - os)).toISOString().slice(0, -1).replace('T', ' ').substring(0, 16) }); } }} />)}

              {renderImageSection("Rear View Photos", "rearImage")}
              {renderImageSection("VIN / Chassis Photos", "vinImage")}
              {renderImageSection("Odometer Photos", "odoImage")}
              <View style={{ height: 280 }} />
            </ScrollView>

          ) : (
            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 10, backgroundColor: bg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Mechanical Referral Toggle */}
              <View style={{ backgroundColor: isDark ? '#2e1065' : '#faf5ff', borderWidth: 1, borderColor: isDark ? '#6d28d9' : '#ddd6fe', padding: 14, marginBottom: 14 }}>
                <Text style={{ fontWeight: '800', fontSize: 13, color: isDark ? '#c4b5fd' : '#5b21b6', marginBottom: 10 }}>🔧 Mechanical Referral</Text>
                {formData.linkedJobId ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>🔗</Text>
                    <View>
                      <Text style={{ fontWeight: '800', color: isDark ? '#c4b5fd' : '#5b21b6', fontSize: 12 }}>Already referred to Visco Mechanical</Text>
                      {formData.linkedJobCardNo ? <Text style={{ fontSize: 11, color: '#7c3aed' }}>Mechanical Job: {formData.linkedJobCardNo}</Text> : null}
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: isDark ? '#ddd6fe' : '#4c1d95', fontSize: 12 }}>Refer to Visco Mechanical Workshop</Text>
                      <Text style={{ fontSize: 10, color: isDark ? '#6b7280' : '#9ca3af', marginTop: 2 }}>Creates a linked job in Mechanical app</Text>
                    </View>
                    <Switch
                      value={formData.referToMechanical || false}
                      onValueChange={(v) => setFormData({ ...formData, referToMechanical: v })}
                      trackColor={{ true: '#7c3aed', false: isDark ? '#374151' : '#d1d5db' }}
                      thumbColor="#fff"
                    />
                  </View>
                )}
              </View>

              <View style={S.voiceContainer}>
                <Text style={S.formInputLabel}>Customer Voice (Complaints)</Text>
                <View style={{ flexDirection: 'row', gap: 15, marginVertical: 10 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setQuickVoice({ ...quickVoice, engineOil: !quickVoice.engineOil })}>
                    <Text style={{ fontSize: 20 }}>{quickVoice.engineOil ? '☑️' : '⬜'}</Text>
                    <Text style={{ marginLeft: 8, fontWeight: '700', color: C.text }}>Oil Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setQuickVoice({ ...quickVoice, completeCheckup: !quickVoice.completeCheckup })}>
                    <Text style={{ fontSize: 20 }}>{quickVoice.completeCheckup ? '☑️' : '⬜'}</Text>
                    <Text style={{ marginLeft: 8, fontWeight: '700', color: C.text }}>Complete Checkup</Text>
                  </TouchableOpacity>
                </View>
                {formData.customerVoice.map((v, i) => (
                  <TextInput key={i} ref={el => voiceRefs.current[i] = el} style={[S.inputSmall, { color: C.text }]} placeholder="Type customer complaint..." placeholderTextColor={C.textSub} value={typeof v === 'object' ? v.text : v} onChangeText={(val) => updateDynamicList('customerVoice', i, val)} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { if (i < formData.customerVoice.length - 1) voiceRefs.current[i + 1]?.focus(); }} />
                ))}
              </View>

              <View style={{ backgroundColor: card, padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ fontWeight: '700', color: '#ef4444' }}>Car Not Start When Arrived?</Text>
                  <Switch value={formData.carNotStart} onValueChange={(v) => setFormData({ ...formData, carNotStart: v })} trackColor={{ true: "#ef4444" }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', color: '#16a34a' }}>Quotation Done?</Text>
                  <Switch value={formData.quoteDone} onValueChange={(v) => setFormData({ ...formData, quoteDone: v })} trackColor={{ true: "#16a34a" }} />
                </View>
              </View>

              {renderImageSection("Faulty Parts Photos (Inspection)", "inspectionPhotos")}

              <View style={S.partsNavRow}>
                <TouchableOpacity onPress={() => { setActiveNavGroup(null); setActiveNavSubGroup(null); }}>
                  <Text style={{ fontWeight: '800', color: !activeNavGroup ? C.accent : C.textSub }}>Groups</Text>
                </TouchableOpacity>
                {activeNavGroup && <Text style={{ color: C.textSub }}>  ➡️  </Text>}
                {activeNavGroup && <TouchableOpacity onPress={() => setActiveNavSubGroup(null)}><Text style={{ fontWeight: '800', color: !activeNavSubGroup ? C.accent : C.textSub }}>{activeNavGroup}</Text></TouchableOpacity>}
                {activeNavSubGroup && <Text style={{ color: C.textSub }}>  ➡️  </Text>}
                {activeNavSubGroup && <Text style={{ fontWeight: '800', color: C.accent }}>{activeNavSubGroup}</Text>}
              </View>

              {!activeNavGroup && (
                <View style={S.catalogGrid}>
                  {dbPartsCatalog.map((cat, idx) => (
                    <TouchableOpacity key={idx} style={S.catalogCatBtn} onPress={() => setActiveNavGroup(cat.groupName)}>
                      <Text style={S.catalogCatBtnText}>{cat.groupName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeNavGroup && !activeNavSubGroup && (
                <View>
                  {(dbPartsCatalog.find(g => g.groupName === activeNavGroup)?.subGroups || []).length > 0 && (
                    <View style={S.catalogGrid}>
                      {(dbPartsCatalog.find(g => g.groupName === activeNavGroup)?.subGroups || []).map((sg, idx) => (
                        <TouchableOpacity key={idx} style={[S.catalogCatBtn, { backgroundColor: isDark ? '#1a1f2e' : '#e2e8f0' }]} onPress={() => setActiveNavSubGroup(sg.subGroupName)}>
                          <Text style={S.catalogCatBtnText}>{sg.subGroupName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {(dbPartsCatalog.find(g => g.groupName === activeNavGroup)?.items || []).length > 0 && (
                    <View style={{ marginTop: 14, backgroundColor: card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border }}>
                      {(dbPartsCatalog.find(g => g.groupName === activeNavGroup)?.items || []).map((item, idx) => {
                        const isSelected = partSelections[item];
                        return (
                          <TouchableOpacity key={`dir-${idx}`} style={S.checkboxRowMain} onPress={() => toggleCatalogPart(item)}>
                            <Text style={{ fontSize: 20 }}>{isSelected ? '☑️' : '⬜'}</Text>
                            <Text style={[S.checkboxLabelMain, isSelected && { color: '#16a34a', fontWeight: '800' }]}>{item}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {activeNavGroup && activeNavSubGroup && (
                <View style={{ marginTop: 14, backgroundColor: card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border }}>
                  {(dbPartsCatalog.find(g => g.groupName === activeNavGroup)?.subGroups.find(sg => sg.subGroupName === activeNavSubGroup)?.items || []).map((item, idx) => {
                    const isSelected = partSelections[item];
                    return (
                      <TouchableOpacity key={idx} style={S.checkboxRowMain} onPress={() => toggleCatalogPart(item)}>
                        <Text style={{ fontSize: 20 }}>{isSelected ? '☑️' : '⬜'}</Text>
                        <Text style={[S.checkboxLabelMain, isSelected && { color: '#16a34a', fontWeight: '800' }]}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={S.selectedPartsPreviewBox}>
                <Text style={[S.formInputLabel, { color: C.accent }]}>Selected Parts List</Text>
                {Object.keys(partSelections).filter(k => partSelections[k]).map((part, idx) => (
                  <View style={S.previewPartRow} key={`cat-${idx}`}>
                    <Text style={S.previewPartText}>• {part}</Text>
                    <TouchableOpacity onPress={() => toggleCatalogPart(part)} style={S.previewPartDelBtn}><Text style={{ color: '#fff', fontSize: 10 }}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Labor Charges */}
              <View style={{ backgroundColor: isDark ? '#0f1117' : '#fff', borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1, borderColor: C.border }}>
                <Text style={[S.formInputLabel, { color: '#f97316', marginBottom: 8 }]}>🔧 Labor Charges</Text>
                <TextInput
                  style={[S.input, { fontSize: 16, fontWeight: '700' }]}
                  placeholder="AED 0.00"
                  placeholderTextColor={C.textSub}
                  keyboardType="decimal-pad"
                  value={String(formData.laborCharges || '')}
                  onChangeText={(v) => setFormData({ ...formData, laborCharges: v })}
                />
              </View>

              <Text style={[S.formInputLabel, { marginTop: 24 }]}>Unmapped Specialized Parts</Text>
              {customParts.map((v, i) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }} key={i}>
                  <TextInput key={i} ref={el => customPartsRefs.current[i] = el} style={[S.inputSmall, { flex: 1, color: C.text }]} placeholder="State unmapped part..." placeholderTextColor={C.textSub} autoCapitalize="words" value={String(v || '')} onChangeText={(val) => updateDynamicCustomPart(i, val)} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { if (i < customParts.length - 1) customPartsRefs.current[i + 1]?.focus(); }} />
                  {(String(v || '').trim() !== '' || customParts.length > 1) && (
                    <TouchableOpacity onPress={() => removeCustomPart(i)} style={{ padding: 10 }}>
                      <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={{ height: 280 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}