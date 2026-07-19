import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const BRAND = '#16a34a';

const QUICK_OPTIONS = [
    { label: '30 min', minutes: 30 },
    { label: '1 hr', minutes: 60 },
    { label: '3 hr', minutes: 180 },
    { label: 'Tomorrow 8am', minutes: null },
];

function tomorrow8am() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
}

// todo: the active to-do object (or null — modal hidden when null)
export default function TodoReminderModal({ todo, onClose, onMarkDone, onSnooze }) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate,       setTempDate]       = useState(new Date());

    if (!todo) return null;

    const pickQuick = (opt) => {
        const when = opt.minutes == null ? tomorrow8am() : new Date(Date.now() + opt.minutes * 60000);
        onSnooze(when);
    };

    const openCustomPicker = () => {
        setTempDate(new Date());
        setShowDatePicker(true);
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={S.overlay}>
                <View style={S.card}>
                    <Text style={S.badge}>{todo.priority === 'High' ? '⚠️ HIGH PRIORITY' : '📋 TO-DO'}</Text>
                    <Text style={S.text}>{todo.text}</Text>

                    <TouchableOpacity style={S.doneBtn} onPress={onMarkDone}>
                        <Text style={S.doneBtnText}>✓ Mark Done</Text>
                    </TouchableOpacity>

                    <Text style={S.snoozeLabel}>Remind me again in...</Text>
                    <View style={S.quickRow}>
                        {QUICK_OPTIONS.map(opt => (
                            <TouchableOpacity key={opt.label} style={S.quickBtn} onPress={() => pickQuick(opt)}>
                                <Text style={S.quickBtnText}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={S.customBtn} onPress={openCustomPicker}>
                        <Text style={S.customBtnText}>🗓️ Pick a custom time</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
                        <Text style={S.cancelBtnText}>Later</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) { setTempDate(d); setShowTimePicker(true); }
                    }}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                    onChange={(e, t) => {
                        setShowTimePicker(false);
                        if (t) {
                            const combined = new Date(tempDate);
                            combined.setHours(t.getHours(), t.getMinutes(), 0, 0);
                            onSnooze(combined);
                        }
                    }}
                />
            )}
        </Modal>
    );
}

const S = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    badge: { fontSize: 11, fontWeight: '900', color: BRAND, letterSpacing: 0.5, marginBottom: 8 },
    text: { fontSize: 16, fontWeight: '700', color: '#14532d', marginBottom: 18 },
    doneBtn: { backgroundColor: BRAND, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
    doneBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    snoozeLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    quickBtn: { flexGrow: 1, backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 10, alignItems: 'center', minWidth: '45%' },
    quickBtnText: { color: '#15803d', fontWeight: '800', fontSize: 12 },
    customBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginBottom: 14 },
    customBtnText: { color: '#475569', fontWeight: '700', fontSize: 12 },
    cancelBtn: { alignItems: 'center', paddingVertical: 6 },
    cancelBtnText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
});
