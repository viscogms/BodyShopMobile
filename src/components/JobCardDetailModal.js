import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { getStatusColor, decodePart, parseImagesToArray, getCleanModelText, getCustomerNameOnly } from '../utils/helpers';
import { getStyles, COLORS } from '../utils/AppStyles';
import { API_BASE } from '../utils/config';
import InspectionReportTab from './InspectionReportTab';

const { width } = Dimensions.get('window');
const API_URL = `${API_BASE}/jobcards`;

// ── Inline Todo Input Component ──────────────────────────────
function TodoInput({ selectedCard, setSelectedCard, S, C }) {
  const [text, setText] = useState('');

  const addTodo = async () => {
    if (!text.trim()) return;
    const newTodo = { text: text.trim(), completed: false };
    const updatedTodos = [...(selectedCard.todos || []), newTodo];
    const updatedCard = { ...selectedCard, todos: updatedTodos };
    setSelectedCard(updatedCard);
    setText('');
    try { await axios.put(`${API_URL}/${selectedCard._id}`, { todos: updatedTodos }); } catch(e) {}
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
      <TextInput
        style={[S.input, { flex: 1, marginBottom: 0, marginTop: 0 }]}
        placeholder="Add a to-do comment..."
        placeholderTextColor={C.textSub}
        value={text}
        onChangeText={setText}
        onSubmitEditing={addTodo}
        returnKeyType="done"
      />
      <TouchableOpacity
        style={{ backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 10 }}
        onPress={addTodo}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Inline Part Cost / Bill Input Component ──────────────────
function PartCostInput({ selectedCard, setSelectedCard, S, C, setFullScreenImg }) {
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('');
  const [billImage, setBillImage] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickBillImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.4 });
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.4 });
      }
      if (!result.canceled && result.assets?.length > 0) {
        setUploading(true);
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop();
        const type = `image/${filename.split('.').pop()}`;
        const imageForm = new FormData();
        imageForm.append('image', { uri: localUri, name: filename, type });
        const res = await axios.post(`${API_BASE}/upload`, imageForm, { headers: { 'Content-Type': 'multipart/form-data' } });
        setBillImage(res.data.imageUrl);
      }
    } catch (e) { Alert.alert('Error', 'Failed to upload bill image'); }
    finally { setUploading(false); }
  };

  const addPartCost = async () => {
    if (!supplierName.trim() || !amount) return Alert.alert('Error', 'Enter supplier name and amount');
    const newEntry = { supplierName: supplierName.trim(), amount: Number(amount), billImage };
    const updated = [...(selectedCard.partCosts || []), newEntry];
    const updatedCard = { ...selectedCard, partCosts: updated };
    setSelectedCard(updatedCard);
    setSupplierName(''); setAmount(''); setBillImage('');
    try { await axios.put(`${API_URL}/${selectedCard._id}`, { partCosts: updated }); } catch (e) { Alert.alert('Error', 'Failed to save bill'); }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[S.input, { flex: 1 }]} placeholder="Supplier Name" placeholderTextColor={C.textSub} value={supplierName} onChangeText={setSupplierName} />
        <TextInput style={[S.input, { flex: 1 }]} placeholder="Amount AED" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: -6 }}>
        <TouchableOpacity style={S.newImageActionBtn} onPress={() => pickBillImage('camera')}><Text style={{ fontSize: 12 }}>📷 Bill Photo</Text></TouchableOpacity>
        <TouchableOpacity style={S.newImageActionBtn} onPress={() => pickBillImage('gallery')}><Text style={{ fontSize: 12 }}>🖼️ Gallery</Text></TouchableOpacity>
        {uploading && <ActivityIndicator size="small" color={C.accent} />}
        {!uploading && billImage ? (
          <TouchableOpacity onPress={() => setFullScreenImg(billImage)}>
            <ExpoImage source={{ uri: billImage }} style={{ width: 34, height: 34, borderRadius: 6, borderWidth: 1, borderColor: C.border }} contentFit="cover" />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity style={{ backgroundColor: '#16a34a', padding: 11, marginTop: 10, alignItems: 'center', borderRadius: 8 }} onPress={addPartCost}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>+ Add Bill</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function JobCardDetailModal({
  selectedCard, setSelectedCard, currentUser, hasPerm, onClose,
  handleEdit, handleClone, handleDelete, handleSaveFinanceAmount,
  setDropdownMode, setShowStatusDropdown, printInspectionReportPDF,
  setFullScreenImg, handleTogglePartReceived, requestPricingWhatsApp,
  formatSafeDate, initiateDirectReminderUpdate, handleToggleVoiceCompleted,
  isDark = false, usersList = []
}) {
  if (!selectedCard) return null;

  const S = getStyles(isDark);
  const C = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? '#0f1117' : '#f9fbff';
  const isOwnerViewer = currentUser?.role === 'Owner';
  const [detailTab, setDetailTab] = React.useState('info'); // read-only: can view everything, mutate nothing

  const DetailRow = ({ label, value }) => {
    const strValue = String(value || '');
    if (!strValue || strValue === '-' || strValue.trim() === '' || strValue === ' KM' || strValue === 'No Model') return null;
    return (
      <View style={S.detailRowMetric}>
        <Text style={S.lightLabelText}>{label}</Text>
        <Text style={S.highlightDetailValue}>{strValue}</Text>
      </View>
    );
  };

  const renderImageGroup = (title, imageField) => {
    const images = parseImagesToArray(selectedCard[imageField]);
    if (!images || images.length === 0) return null;
    return (
      <View style={S.highlightedSectionBox}>
        <Text style={S.sectionHighlightTitle}>{title}</Text>
        <ScrollView horizontal style={{ flexDirection: 'row', marginTop: 6 }}>
          {images.map((img, idx) => (
            <TouchableOpacity key={idx} onPress={() => setFullScreenImg(img)} style={{ marginRight: 10 }}>
              <ExpoImage source={{ uri: img }} style={S.detailLargeImage} contentFit="cover" transition={200} cachePolicy="disk" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const toggleTodo = async (idx) => {
    const updatedTodos = [...(selectedCard.todos || [])];
    updatedTodos[idx] = { ...updatedTodos[idx], completed: !updatedTodos[idx].completed };
    const updatedCard = { ...selectedCard, todos: updatedTodos };
    setSelectedCard(updatedCard);
    try { await axios.put(`${API_URL}/${selectedCard._id}`, { todos: updatedTodos }); } catch(e) {}
  };

  const deleteTodo = async (idx) => {
    const updatedTodos = [...(selectedCard.todos || [])];
    updatedTodos.splice(idx, 1);
    const updatedCard = { ...selectedCard, todos: updatedTodos };
    setSelectedCard(updatedCard);
    try { await axios.put(`${API_URL}/${selectedCard._id}`, { todos: updatedTodos }); } catch(e) {}
  };

  const deletePartCost = async (idx) => {
    const updated = [...(selectedCard.partCosts || [])];
    updated.splice(idx, 1);
    const updatedCard = { ...selectedCard, partCosts: updated };
    setSelectedCard(updatedCard);
    try { await axios.put(`${API_URL}/${selectedCard._id}`, { partCosts: updated }); } catch(e) {}
  };

  const totalPartCost = (selectedCard.partCosts || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <Modal visible={!!selectedCard} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={[S.modalHeader, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
          <Text style={S.lokuPlateHeader}>{String(selectedCard.plateNumber || '')}</Text>
          <TouchableOpacity style={S.largeCloseBtn} onPress={onClose}>
            <Text style={S.largeCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={S.topActionRow}>
          {hasPerm('canEditCard')   && <TouchableOpacity style={[S.actionBtnFull, { backgroundColor: '#16a34a' }]} onPress={() => handleEdit(selectedCard)}><Text style={S.btnText}>✏️ Edit</Text></TouchableOpacity>}
          {hasPerm('canCreateCard') && <TouchableOpacity style={[S.actionBtnFull, { backgroundColor: '#f59e0b' }]} onPress={() => handleClone(selectedCard)}><Text style={S.btnText}>📋 Clone</Text></TouchableOpacity>}
          {hasPerm('canDeleteCard') && <TouchableOpacity style={[S.actionBtnFull, { backgroundColor: '#dc2626' }]} onPress={() => Alert.alert("Delete", "Delete this Job Card?", [{ text: "Cancel" }, { text: "Delete", onPress: () => handleDelete(selectedCard._id) }])}><Text style={S.btnText}>🗑️ Delete</Text></TouchableOpacity>}
        </View>

        {/* Mechanical Referral Banner */}
        {selectedCard.linkedJobId && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor: isDark?'#2e1065':'#faf5ff', borderBottomWidth:1, borderBottomColor: isDark?'#6d28d9':'#ddd6fe', padding:12 }}>
            <Text style={{ fontSize:20 }}>🔗</Text>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:'800', fontSize:12, color: isDark?'#c4b5fd':'#5b21b6' }}>Linked to {selectedCard.linkedAppName||'Visco Mechanical'}</Text>
              {selectedCard.linkedJobCardNo ? <Text style={{ fontSize:11, color:'#7c3aed' }}>Job Card: {selectedCard.linkedJobCardNo}</Text> : null}
            </View>
            <Text style={{ fontSize:10, color:'#9ca3af' }}>Open Mechanical app ↗</Text>
          </View>
        )}

        {/* Detail Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: isDark ? '#0f1117' : '#fff' }}>
          {[['info','📋 Details'],['inspection','🔍 Inspection']].map(([t,l]) => (
            <TouchableOpacity key={t} onPress={() => setDetailTab(t)}
              style={{ flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor: detailTab===t?'#16a34a':'transparent' }}>
              <Text style={{ fontSize:12, fontWeight:'800', color: detailTab===t?'#16a34a':(isDark?'#6b7280':'#9ca3af') }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {detailTab === 'inspection' && (
          <ScrollView style={{ backgroundColor: bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <InspectionReportTab
              card={selectedCard}
              onCardUpdate={(updated) => setSelectedCard(updated)}
              canEdit={hasPerm('canEditCard')}
              isDark={isDark}
              usersList={usersList}
            />
          </ScrollView>
        )}

        {detailTab === 'info' && <ScrollView style={{ backgroundColor: bg }}>

          {/* Rear Image */}
          {parseImagesToArray(selectedCard.rearImage).length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 14, marginTop: 14 }}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {parseImagesToArray(selectedCard.rearImage).map((img, idx) => (
                  <TouchableOpacity key={idx} onPress={() => setFullScreenImg(img)} style={{ marginRight: 10 }}>
                    <ExpoImage source={{ uri: img }} style={{ width: width - 32, height: 240, borderRadius: 0 }} contentFit="cover" transition={200} cachePolicy="disk" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* VIN + ODO Images */}
          {(parseImagesToArray(selectedCard.vinImage).length > 0 || parseImagesToArray(selectedCard.odoImage).length > 0) && (
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 }}>
              {parseImagesToArray(selectedCard.vinImage).length > 0 && (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setFullScreenImg(parseImagesToArray(selectedCard.vinImage)[0])}>
                  <ExpoImage source={{ uri: parseImagesToArray(selectedCard.vinImage)[0] }} style={{ width: '100%', height: 150 }} contentFit="cover" />
                </TouchableOpacity>
              )}
              {parseImagesToArray(selectedCard.odoImage).length > 0 && (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setFullScreenImg(parseImagesToArray(selectedCard.odoImage)[0])}>
                  <ExpoImage source={{ uri: parseImagesToArray(selectedCard.odoImage)[0] }} style={{ width: '100%', height: 150 }} contentFit="cover" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>

            {/* Info Block */}
            <View style={S.infoBlock}>
              <View style={S.detailRowMetric}>
                <Text style={S.lightLabelText}>Current Status</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1a1f2e' : '#f0f4f8', paddingHorizontal: 10, paddingVertical: 5 }}
                  onPress={() => { if (hasPerm('canUpdateStatus')) { setDropdownMode('detail'); setShowStatusDropdown(true); } }}
                >
                  <Text style={[S.highlightDetailValue, { color: getStatusColor(selectedCard.status || 'Inspection') }]}>{String(selectedCard.status || 'Inspection')}</Text>
                  {hasPerm('canUpdateStatus') && <Text style={{ fontSize: 11, marginLeft: 8, color: C.textSub }}>▼ Edit</Text>}
                </TouchableOpacity>
              </View>
              <DetailRow label="Job Card No"     value={selectedCard.jobCardNo} />
              <DetailRow label="Vehicle Model"   value={getCleanModelText(selectedCard.carModel)} />
              <DetailRow label="Chassis No"      value={selectedCard.vin} />
              <DetailRow label="ODO Kilometer"   value={selectedCard.odoKM ? `${selectedCard.odoKM} KM` : ''} />
              <DetailRow label="Customer"        value={getCustomerNameOnly(selectedCard.carModel)} />
              <DetailRow label="Contact"         value={selectedCard.customerContacts?.length ? selectedCard.customerContacts.filter(c => c).join(', ') : selectedCard.customerContact} />
              <DetailRow label="Inspection Tech" value={selectedCard.inspectionTech} />
              <DetailRow label="Job Done By"     value={selectedCard.jobDoneBy} />
              <DetailRow label="Received Date"   value={formatSafeDate ? formatSafeDate(selectedCard.receiveDate) : String(selectedCard.receiveDate).split(' ')[0]} />
              <DetailRow label="Delivery Date"   value={formatSafeDate ? formatSafeDate(selectedCard.deliveryDate) : String(selectedCard.deliveryDate).split(' ')[0]} />
              {selectedCard.reminderTime ? (
                <View style={S.detailRowMetric}>
                  <Text style={{ color: '#f59e0b', fontWeight: '700' }}>Next Reminder</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#f59e0b', fontWeight: '700', marginRight: 8 }}>{selectedCard.reminderTime}</Text>
                    <TouchableOpacity style={{ backgroundColor: isDark ? '#1e2433' : '#fff3e0', padding: 5 }} onPress={() => initiateDirectReminderUpdate && initiateDirectReminderUpdate(selectedCard)}>
                      <Text style={{ fontSize: 11 }}>✏️ Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={S.detailRowMetric}>
                  <Text style={S.lightLabelText}>Next Reminder</Text>
                  <TouchableOpacity style={{ backgroundColor: isDark ? '#1e2433' : '#f1f5f9', padding: 5 }} onPress={() => initiateDirectReminderUpdate && initiateDirectReminderUpdate(selectedCard)}>
                    <Text style={{ fontSize: 11, color: C.accent }}>+ Add Time</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Customer Voice */}
            {(selectedCard.customerVoice || []).filter(v => typeof v === 'object' ? v.text : v).length > 0 && (
              <View style={S.highlightedSectionBox}>
                <Text style={S.sectionHighlightTitle}>🗣️ Customer Complaints</Text>
                {selectedCard.customerVoice?.map((voice, idx) => {
                  const text = typeof voice === 'object' ? voice.text : voice;
                  if (!text.trim()) return null;
                  const completed = typeof voice === 'object' ? voice.completed : false;
                  return (
                    <TouchableOpacity key={idx} style={S.checkboxRow} disabled={isOwnerViewer} onPress={() => handleToggleVoiceCompleted && handleToggleVoiceCompleted(selectedCard, idx)}>
                      <Text style={{ fontSize: 20 }}>{completed ? '✅' : '⬜'}</Text>
                      <Text style={[S.bulletItemText, { marginLeft: 10 }, completed && { textDecorationLine: 'line-through', color: C.textSub }]}>{text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {renderImageGroup("📸 Faulty Component Photos", "inspectionPhotos")}

            {/* Parts */}
            <View style={S.highlightedSectionBox}>
              <Text style={S.sectionHighlightTitle}>🛠️ Inspection Report & Parts</Text>
              {selectedCard.inspectionDetails?.map((item, idx) => {
                const dec = decodePart(item); if (!dec.name.trim()) return null;
                return (
                  <TouchableOpacity key={idx} style={S.checkboxRow} disabled={isOwnerViewer} onPress={() => handleTogglePartReceived(selectedCard, idx)}>
                    <Text style={{ fontSize: 20 }}>{dec.received ? '✅' : '⬜'}</Text>
                    <Text style={[S.bulletItemText, { marginLeft: 10 }, dec.received && { textDecorationLine: 'line-through', color: C.textSub }]}>{dec.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={[S.whatsappCustomerBtn, { flex: 1, backgroundColor: '#dc2626' }]} onPress={() => printInspectionReportPDF(selectedCard)}>
                  <Text style={S.whatsappBtnText}>🖨️ PDF Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.whatsappCustomerBtn, { flex: 1, backgroundColor: '#25D366' }]} onPress={() => requestPricingWhatsApp && requestPricingWhatsApp(selectedCard)}>
                  <Text style={S.whatsappBtnText}>📲 WhatsApp Parts</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── TODO SECTION ─────────────────────────────── */}
            <View style={[S.highlightedSectionBox, { borderLeftColor: '#16a34a' }]}>
              <Text style={[S.sectionHighlightTitle, { color: '#16a34a' }]}>
                📋 To-Do Comments {(selectedCard.todos || []).filter(t => !t.completed).length > 0 ? `(${(selectedCard.todos || []).filter(t => !t.completed).length} pending)` : ''}
              </Text>

              {(selectedCard.todos || []).length === 0 && (
                <Text style={{ color: C.textSub, fontSize: 12, marginBottom: 8 }}>No to-do's yet. Add one below.</Text>
              )}

              {(selectedCard.todos || []).map((todo, idx) => (
                <View key={idx} style={[S.checkboxRow, { justifyContent: 'space-between' }]}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} disabled={isOwnerViewer} onPress={() => toggleTodo(idx)}>
                    <Text style={{ fontSize: 20 }}>{todo.completed ? '✅' : '⬜'}</Text>
                    <Text style={[S.bulletItemText, { marginLeft: 10 }, todo.completed && { textDecorationLine: 'line-through', color: C.textSub }]}>{todo.text}</Text>
                  </TouchableOpacity>
                  {!isOwnerViewer && (
                    <TouchableOpacity onPress={() => deleteTodo(idx)} style={{ paddingLeft: 10 }}>
                      <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {!isOwnerViewer && <TodoInput selectedCard={selectedCard} setSelectedCard={setSelectedCard} S={S} C={C} isDark={isDark} />}
            </View>

            {/* Part Purchase Costs */}
            {(hasPerm('canEditCard') || isOwnerViewer) && (
              <View style={[S.highlightedSectionBox, { borderLeftColor: '#16a34a' }]}>
                <Text style={[S.sectionHighlightTitle, { color: '#16a34a' }]}>🧾 Part Purchase Costs</Text>

                {(selectedCard.partCosts || []).length === 0 && (
                  <Text style={{ color: C.textSub, fontSize: 12, marginBottom: 8 }}>No bills added yet.</Text>
                )}

                {(selectedCard.partCosts || []).map((pc, idx) => (
                  <View key={idx} style={[S.checkboxRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => pc.billImage && setFullScreenImg(pc.billImage)}>
                      {pc.billImage ? (
                        <ExpoImage source={{ uri: pc.billImage }} style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10 }} contentFit="cover" />
                      ) : (
                        <Text style={{ fontSize: 20, marginRight: 10 }}>🧾</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={S.bulletItemText}>{pc.supplierName}</Text>
                        <Text style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>AED {Number(pc.amount || 0).toFixed(2)}</Text>
                      </View>
                    </TouchableOpacity>
                    {!isOwnerViewer && (
                      <TouchableOpacity onPress={() => deletePartCost(idx)} style={{ paddingLeft: 10 }}>
                        <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {(selectedCard.partCosts || []).length > 0 && (
                  <View style={{ marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontWeight: '800', color: C.text, fontSize: 13 }}>Total Parts Cost: AED {totalPartCost.toFixed(2)}</Text>
                  </View>
                )}

                {!isOwnerViewer && <PartCostInput selectedCard={selectedCard} setSelectedCard={setSelectedCard} S={S} C={C} setFullScreenImg={setFullScreenImg} />}
              </View>
            )}

            {/* Billing */}
            {(currentUser?.role === 'Admin' || isOwnerViewer) && (
              <View style={S.billingAdjustmentCard}>
                <Text style={{ fontWeight: '800', color: C.text, marginBottom: 10 }}>🏁 Invoice & Financial Settlement</Text>
                {isOwnerViewer ? (
                  <View style={{ gap: 8 }}>
                    <View style={S.detailRowMetric}><Text style={S.lightLabelText}>Invoice No</Text><Text style={S.highlightDetailValue}>{selectedCard.invoiceNo || '-'}</Text></View>
                    <View style={S.detailRowMetric}><Text style={S.lightLabelText}>Invoice Amount</Text><Text style={S.highlightDetailValue}>AED {Number(selectedCard.invoiceAmount || 0).toFixed(2)}</Text></View>
                    {Number(selectedCard.laborCharges || 0) > 0 && <View style={S.detailRowMetric}><Text style={[S.lightLabelText, {color:'#f97316'}]}>🔧 Labor Charges</Text><Text style={[S.highlightDetailValue, {color:'#f97316'}]}>AED {Number(selectedCard.laborCharges || 0).toFixed(2)}</Text></View>}
                    <View style={S.detailRowMetric}><Text style={S.lightLabelText}>Paid Amount</Text><Text style={S.highlightDetailValue}>AED {Number(selectedCard.paidAmount || 0).toFixed(2)}</Text></View>
                    <View style={{ padding: 10, backgroundColor: isDark ? '#111827' : '#f1f5f9', marginTop: 4 }}>
                      <Text style={{ fontWeight: '800', color: selectedCard.paymentStatus === 'Paid' ? '#16a34a' : '#ef4444' }}>
                        Status: {selectedCard.paymentStatus}  (Balance: AED {(Number(selectedCard.invoiceAmount || 0) - Number(selectedCard.paidAmount || 0)).toFixed(2)})
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontSize: 10, color: C.textSub, marginBottom: 6 }}>Fill invoice number and total amount below</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <TextInput style={[S.input, { flex: 1 }]} placeholder="Invoice No" placeholderTextColor={C.textSub} value={selectedCard.invoiceNo} onChangeText={(v) => setSelectedCard({ ...selectedCard, invoiceNo: v })} />
                      <TextInput style={[S.input, { flex: 1 }]} placeholder="Total AED" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={String(selectedCard.invoiceAmount || '')} onChangeText={(v) => setSelectedCard({ ...selectedCard, invoiceAmount: v })} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#f97316', flex: 1 }}>🔧 Labor Charges (AED)</Text>
                      <TextInput style={[S.input, { flex: 1, borderColor: '#f97316' }]} placeholder="0.00" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={String(selectedCard.laborCharges || '')} onChangeText={(v) => setSelectedCard({ ...selectedCard, laborCharges: v })} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <TextInput style={[S.input, { flex: 2 }]} placeholder="Paid AED" placeholderTextColor={C.textSub} keyboardType="decimal-pad" value={String(selectedCard.paidAmount || '')} onChangeText={(v) => setSelectedCard({ ...selectedCard, paidAmount: v })} />
                      <TouchableOpacity style={{ backgroundColor: isDark ? '#16a34a' : '#000', padding: 12, flex: 1, alignItems: 'center' }} onPress={() => handleSaveFinanceAmount(selectedCard, selectedCard.invoiceAmount, selectedCard.paidAmount, selectedCard.invoiceNo)}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>SAVE PAY</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ padding: 10, backgroundColor: isDark ? '#111827' : '#f1f5f9' }}>
                      <Text style={{ fontWeight: '800', color: selectedCard.paymentStatus === 'Paid' ? '#16a34a' : '#ef4444' }}>
                        Status: {selectedCard.paymentStatus}  (Balance: AED {(Number(selectedCard.invoiceAmount || 0) - Number(selectedCard.paidAmount || 0)).toFixed(2)})
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={{ height: 200 }} />
          </View>
        </ScrollView>}
      </SafeAreaView>
    </Modal>
  );
}