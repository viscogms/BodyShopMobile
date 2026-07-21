import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE } from '../utils/config';

const BRAND = '#16a34a';

function bsThisMonth() {
    const d = new Date(); const z = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}`;
}

function LaborSection({ BRAND, apiKey }) {
    const [month,    setMonth]    = useState(bsThisMonth());
    const [data,     setData]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { fetchSummary(); }, [month]);

    const fetchSummary = async () => {
        setLoading(true);
        setExpanded(null);
        try {
            const res = await axios.get(`${API_BASE}/labor-summary?month=${month}`, { headers: { 'x-api-key': apiKey } });
            setData(Array.isArray(res.data) ? res.data : []);
        } catch (_) {}
        finally { setLoading(false); }
    };

    const grandTotal = data.reduce((s, r) => s + r.totalLabor, 0);
    const grandJobs  = data.reduce((s, r) => s + r.jobCount, 0);

    const prevMonth = () => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    };
    const nextMonth = () => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m, 1);
        setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    };

    return (
        <View style={{ gap: 12 }}>
            {/* Month navigator */}
            <View style={[S.card, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}>
                <TouchableOpacity onPress={prevMonth} style={{ padding:8 }}>
                    <Text style={{ fontSize:20, color: BRAND }}>‹</Text>
                </TouchableOpacity>
                <View style={{ alignItems:'center' }}>
                    <Text style={{ fontWeight:'900', fontSize:16, color:'#14532d' }}>{month}</Text>
                    <Text style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{grandJobs} jobs · AED {grandTotal.toLocaleString()} total labor</Text>
                </View>
                <TouchableOpacity onPress={nextMonth} style={{ padding:8 }}>
                    <Text style={{ fontSize:20, color: BRAND }}>›</Text>
                </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator color={BRAND} style={{ marginVertical:20 }} />}

            {!loading && data.length === 0 && (
                <View style={[S.card, { alignItems:'center', paddingVertical:30 }]}>
                    <Text style={{ fontSize:32, marginBottom:8 }}>🔧</Text>
                    <Text style={{ color:'#94a3b8', fontSize:13, textAlign:'center' }}>No job cards with technician assigned for {month}</Text>
                </View>
            )}

            {!loading && data.map((row, i) => {
                const isOpen = expanded === row.name;
                const pct = grandTotal > 0 ? (row.totalLabor / grandTotal * 100) : 0;
                return (
                    <View key={row.name} style={[S.card, { padding:0, overflow:'hidden' }]}>
                        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : row.name)}
                            style={{ flexDirection:'row', alignItems:'center', padding:14, gap:10 }}>
                            {/* Rank badge */}
                            <View style={{ width:28, height:28, borderRadius:14, backgroundColor: BRAND + '1a', alignItems:'center', justifyContent:'center' }}>
                                <Text style={{ fontSize:11, fontWeight:'900', color: BRAND }}>{i+1}</Text>
                            </View>
                            {/* Name + bar */}
                            <View style={{ flex:1 }}>
                                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                                    <Text style={{ fontWeight:'900', fontSize:14, color:'#14532d' }}>{row.name}</Text>
                                    <Text style={{ fontSize:11, color:'#94a3b8' }}>{row.jobCount} job{row.jobCount!==1?'s':''}</Text>
                                </View>
                                <View style={{ height:4, borderRadius:2, backgroundColor:'#f1f5f9' }}>
                                    <View style={{ height:4, borderRadius:2, backgroundColor: BRAND, width:`${pct}%` }} />
                                </View>
                            </View>
                            {/* Amount */}
                            <View style={{ alignItems:'flex-end' }}>
                                <Text style={{ fontWeight:'900', color: BRAND, fontSize:14 }}>AED {row.totalLabor.toLocaleString()}</Text>
                                <Text style={{ fontSize:9, color:'#94a3b8' }}>{pct.toFixed(1)}%</Text>
                            </View>
                            <Text style={{ color:'#94a3b8', fontSize:10 }}>{isOpen?'▲':'▼'}</Text>
                        </TouchableOpacity>

                        {isOpen && (
                            <View style={{ borderTopWidth:1, borderTopColor:'#f1f5f9' }}>
                                {row.jobs.map((j, ji) => (
                                    <View key={ji} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                                        paddingHorizontal:14, paddingVertical:9, borderBottomWidth:1, borderBottomColor:'#f8f9fa' }}>
                                        <View style={{ flexDirection:'row', gap:10, alignItems:'center', flex:1 }}>
                                            <Text style={{ fontSize:10, color:'#94a3b8', width:72 }}>{j.jobCardDate}</Text>
                                            <View style={{ flex:1 }}>
                                                <Text style={{ fontWeight:'800', fontSize:13, color:'#0f172a' }}>{j.plateNumber}</Text>
                                                {j.jobCardNo ? <Text style={{ fontSize:10, color:'#94a3b8' }}>{j.jobCardNo}{j.carModel ? ` · ${j.carModel}` : ''}</Text> : null}
                                            </View>
                                        </View>
                                        <Text style={{ fontWeight:'900', fontSize:13, color: j.laborCharges > 0 ? BRAND : '#cbd5e1' }}>
                                            {j.laborCharges > 0 ? `AED ${j.laborCharges.toLocaleString()}` : '—'}
                                        </Text>
                                    </View>
                                ))}
                                {/* Subtotal row */}
                                <View style={{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:14, paddingVertical:10,
                                    backgroundColor: BRAND + '0d' }}>
                                    <Text style={{ fontSize:11, fontWeight:'900', color: BRAND, letterSpacing:0.5 }}>SUBTOTAL</Text>
                                    <Text style={{ fontSize:13, fontWeight:'900', color: BRAND }}>AED {row.totalLabor.toLocaleString()}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const S = StyleSheet.create({
    card: { backgroundColor:'#fff', borderRadius:10, padding:14, marginBottom:10, borderLeftWidth:4, borderLeftColor:'#16a34a', elevation:2, shadowColor:'#16a34a', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4 },
});

export default function LaborScreen({ onBack, isDark = false, apiKey }) {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0c12' : '#f4f7f8' }} edges={['left', 'right']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, backgroundColor: '#ffffff', borderBottomColor: BRAND }}>
                <TouchableOpacity onPress={onBack} style={{ paddingRight: 14, paddingVertical: 4 }}>
                    <Text style={{ color: BRAND, fontSize: 22 }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ color: '#14532d', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 }}>💼 Labor</Text>
            </View>
            <View style={{ flex: 1, padding: 15 }}>
                <LaborSection BRAND={BRAND} apiKey={apiKey} />
            </View>
        </SafeAreaView>
    );
}
