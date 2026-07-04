import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_BASE } from '../utils/config';

// ── Constants ───────────────────────────────────────────────────
const WHEEL_POS = ['FL', 'FR', 'RL', 'RR', 'ST'];
const BRAKE_POS = ['FL', 'FR', 'RL', 'RR'];
const SUSP_POS  = [
  { key: 'frontLeft', label: 'Front Left' },  { key: 'frontRight', label: 'Front Right' },
  { key: 'rearLeft',  label: 'Rear Left'  },  { key: 'rearRight',  label: 'Rear Right'  },
];
const INTERIOR_ITEMS = [
  'Roof Lining','Rear View Mirror','Steering Wheel Upholstery','Seats Upholstery',
  'Gear Lever','Trunk Lining','Armrest & Side Pockets','Dashboard','Floor Mats',
  'Doors','Front Windscreen','Rear Windscreen','Side Windows','Hood','Trunk',
  'Front Bumper','Back Bumper',
];
const ELECTRICAL_ITEMS = [
  'Gear Lever','Doors','Steering','Key','Infotainment','Windows Operation',
  'Seats Adjustment','Door Lock','A/C Control & Cooling','Center Console Buttons',
  'Cameras','Gauges','Rear View / Side Mirror','A/C Grilles','Ignition System',
  'Brake Lights','Headlights','Fog Lights','Reverse Lights','Number Plate Lights',
  'Indicators & Hazards','Wipers','Soft Closing Doors','Sunroof / Moonroof',
  'Interior Lights','Cruise Control','Horn','Parking Sensors',
];
const ENGINE_ITEMS = [
  'Engine Upper Cover','Engine Shield Cover','Engine Mounts','Bonnet Hinge & Holder',
  'Turbo / Supercharger','Fender Liners','Drive Belt / Pulleys','Engine Idle',
  'Engine Oil Filler Cap','Radiator','Engine Oil Leaks','Engine Oil Condition',
  'Coolant Condition','Hoses & Pipes','Coolant Cap','Exhaust System','4 Wheel Drive',
];
const TRANSMISSION_ITEMS = [
  'Transmission Fluid Level & Condition','Transmission Fluid Leaks',
  'Gear Selector','Unusual Noise','Gear Shifting','Differential',
];
const CHASSIS_ITEMS = [
  'Core Support','Frame Rail','Wheel House','Right Fender Apron',
  'Shock Tower / Shock Mount','Radiator Side Support','Left Fender Apron',
  'Front Body Hinge Pillar','Front Floor Board','Left Door Sill',
  'Center Pillar (B Pillar)','Mid Floor Board','Body Quarter Panel','C Pillar',
  'Seat Frame','Rear Floor Panel','Left A Pillar','Roof Panel','Right A Pillar',
];
const BODY_CONDITIONS = ['Original Paint','Cosmetic Paint','Re-Painted','Faded Paint','Replaced'];

const SECTIONS = [
  { key: 'interiorExterior', label: '🚪 Interior & Exterior' },
  { key: 'electrical',       label: '⚡ Electrical'          },
  { key: 'engine',           label: '🔧 Engine'              },
  { key: 'transmission',     label: '⚙️ Transmission'        },
  { key: 'chassis',          label: '🏗️ Chassis & Subframe'  },
];

function makeDefault() {
  const wp = () => Object.fromEntries(WHEEL_POS.map(p => [p, { status: 'PASS', mfgYear: '', notes: '' }]));
  const bp = () => Object.fromEntries(BRAKE_POS.map(p => [p, { type: 'DISC', pads: 'PASS', disc: 'PASS', notes: '' }]));
  const sp = () => Object.fromEntries(SUSP_POS.map(p => [p.key, { status: 'PASS', notes: '' }]));
  const lp = (items) => items.map(label => ({ label, status: 'PASS', notes: '' }));
  return {
    inspectorName: '', inspectionDate: new Date().toISOString().split('T')[0],
    tyres: wp(), rims: wp(), brakes: bp(), suspension: sp(),
    interiorExterior: lp(INTERIOR_ITEMS), electrical: lp(ELECTRICAL_ITEMS),
    engine: lp(ENGINE_ITEMS), transmission: lp(TRANSMISSION_ITEMS), chassis: lp(CHASSIS_ITEMS),
    bodyCondition: 'Original Paint', bodyNotes: '', comments: '',
  };
}

// ── Status Button ────────────────────────────────────────────────
function StatusBtn({ value, onChange, canEdit, size = 'sm' }) {
  const btnH = size === 'sm' ? 26 : 30;
  const fs   = size === 'sm' ? 9  : 10;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {['PASS', 'FAIL', 'N/A'].map(s => {
        const active = value === s;
        const color  = s === 'PASS' ? '#16a34a' : s === 'FAIL' ? '#dc2626' : '#6b7280';
        return (
          <TouchableOpacity
            key={s}
            disabled={!canEdit}
            onPress={() => canEdit && onChange(s)}
            style={{
              height: btnH, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center',
              backgroundColor: active ? color : '#f3f4f6',
              borderWidth: 1, borderColor: active ? color : '#d1d5db',
            }}
          >
            <Text style={{ fontSize: fs, fontWeight: '900', color: active ? '#fff' : '#9ca3af' }}>{s}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Section Header ───────────────────────────────────────────────
function SectionHeader({ title, open, onToggle, failCount, isDark }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: isDark ? '#1e2433' : '#f3f4f6',
        padding: 12, borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', marginBottom: open ? 0 : 4,
      }}
    >
      <Text style={{ fontWeight: '800', fontSize: 13, color: isDark ? '#fff' : '#111' }}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {failCount > 0 && (
          <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#dc2626' }}>{failCount} FAIL</Text>
          </View>
        )}
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Checklist Section ────────────────────────────────────────────
function ChecklistSection({ items, sectionKey, onUpdate, canEdit, isDark }) {
  return (
    <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: isDark ? '#374151' : '#e5e7eb' }}>
      {items.map((item, idx) => (
        <View key={idx} style={{
          padding: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#1f2937' : '#f3f4f6',
          backgroundColor: item.status === 'FAIL' ? (isDark ? '#2d1515' : '#fff5f5') : 'transparent',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: isDark ? '#d1d5db' : '#374151', flex: 1, marginRight: 8 }}>{item.label}</Text>
            <StatusBtn value={item.status} onChange={v => onUpdate(sectionKey, idx, 'status', v)} canEdit={canEdit} />
          </View>
          {item.status === 'FAIL' && canEdit && (
            <TextInput
              style={{
                marginTop: 6, borderWidth: 1, borderColor: '#f87171', padding: 6, fontSize: 11,
                color: isDark ? '#fff' : '#111', backgroundColor: isDark ? '#1f2937' : '#fff',
              }}
              placeholder="Notes..."
              placeholderTextColor="#9ca3af"
              value={item.notes || ''}
              onChangeText={v => onUpdate(sectionKey, idx, 'notes', v)}
            />
          )}
          {item.status === 'FAIL' && !canEdit && item.notes ? (
            <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{item.notes}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function InspectionReportTab({ card, onCardUpdate, canEdit, isDark = false }) {
  const [report, setReport] = useState(() => {
    const def = makeDefault();
    if (!card.inspectionReport) return def;
    return {
      ...def, ...card.inspectionReport,
      interiorExterior: card.inspectionReport.interiorExterior || def.interiorExterior,
      electrical:       card.inspectionReport.electrical       || def.electrical,
      engine:           card.inspectionReport.engine           || def.engine,
      transmission:     card.inspectionReport.transmission     || def.transmission,
      chassis:          card.inspectionReport.chassis          || def.chassis,
    };
  });
  const [saving,  setSaving]  = useState(false);
  const [openSec, setOpenSec] = useState('tyres');

  const bg  = isDark ? '#0f1117' : '#f9fbff';
  const txt = isDark ? '#fff'    : '#111';

  const updWheel = (type, pos, field, val) =>
    setReport(r => ({ ...r, [type]: { ...r[type], [pos]: { ...r[type][pos], [field]: val } } }));
  const updBrake = (pos, field, val) =>
    setReport(r => ({ ...r, brakes: { ...r.brakes, [pos]: { ...r.brakes[pos], [field]: val } } }));
  const updSusp  = (pos, field, val) =>
    setReport(r => ({ ...r, suspension: { ...r.suspension, [pos]: { ...r.suspension[pos], [field]: val } } }));
  const updList  = (sec, idx, field, val) =>
    setReport(r => { const l = [...r[sec]]; l[idx] = { ...l[idx], [field]: val }; return { ...r, [sec]: l }; });

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/jobcards/${card._id}`, { inspectionReport: report });
      onCardUpdate({ ...card, inspectionReport: report });
      Alert.alert('Saved', 'Inspection report saved successfully');
    } catch (e) { Alert.alert('Error', 'Failed to save inspection report'); }
    finally { setSaving(false); }
  };

  const buildHTML = () => {
    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const badge = (s) => {
      const col = s==='PASS'?'#16a34a':s==='FAIL'?'#dc2626':'#6b7280';
      return `<span style="display:inline-block;background:${col};color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:3px;">${s}</span>`;
    };
    const all = [];
    WHEEL_POS.forEach(p=>{all.push(report.tyres[p]?.status);all.push(report.rims[p]?.status);});
    BRAKE_POS.forEach(p=>{all.push(report.brakes[p]?.pads);all.push(report.brakes[p]?.disc);});
    SUSP_POS.forEach(p=>all.push(report.suspension[p.key]?.status));
    ['interiorExterior','electrical','engine','transmission','chassis'].forEach(s=>(report[s]||[]).forEach(i=>all.push(i.status)));
    const passN=all.filter(s=>s==='PASS').length, failN=all.filter(s=>s==='FAIL').length;
    const tot=passN+failN, pct=tot>0?Math.round((passN/tot)*100):100;
    const isPassing=pct>=60, scoreColor=isPassing?'#16a34a':'#dc2626';
    const custRaw=(card.carModel||'').match(/\[Cust:\s*(.*?)\]/)?.[1]?.trim()||card.customerName||'—';
    const modelClean=(card.carModel||'').replace(/\s*\[Cust:.*?\]/,'').trim()||'—';
    const checklist=(items)=>items.map(it=>`<tr style="${it.status==='FAIL'?'background:#fff5f5;':''}"><td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px;">${esc(it.label)}</td><td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;">${badge(it.status)}</td><td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:9px;color:#dc2626;">${esc(it.notes||'')}</td></tr>`).join('');
    const sec=(icon,title,color,content)=>`<div style="margin-bottom:18px;"><div style="background:${color};color:#fff;padding:7px 12px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${icon} ${title}</div>${content}</div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Inspection – ${esc(card.plateNumber)}</title></head><body style="font-family:Arial,sans-serif;margin:0;background:#f8f9fa;">
<div style="max-width:900px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#4c1d95,#16a34a,#a855f7);padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
    <div><div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;">VISCO BODY SHOP</div><div style="color:#86efac;font-size:10px;margin-top:3px;">PROFESSIONAL VEHICLE INSPECTION REPORT</div><div style="color:#bbf7d0;font-size:9px;margin-top:2px;">Dubai, UAE | Tel: +971 XX XXX XXXX</div></div>
    <div style="text-align:right;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);padding:8px 14px;"><div style="color:#bbf7d0;font-size:8px;font-weight:700;text-transform:uppercase;">Report Date</div><div style="color:#fff;font-size:13px;font-weight:900;">${esc(report.inspectionDate)}</div><div style="color:#86efac;font-size:9px;">Inspector: ${esc(report.inspectorName||'—')}</div></div>
  </div>
  <div style="background:#14532d;padding:12px 24px;display:flex;flex-wrap:wrap;">
    ${[['PLATE',card.plateNumber],['MODEL',modelClean],['VIN',card.vin||'—'],['ODO',(card.odoKM||'—')+' KM'],['CUSTOMER',custRaw],['JOB CARD',card.jobCardNo||'—']].map(([l,v])=>`<div style="flex:1;min-width:120px;padding:6px 10px;border-right:1px solid rgba(255,255,255,.08);"><div style="font-size:7px;font-weight:700;color:#4ade80;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">${l}</div><div style="font-size:11px;font-weight:800;color:#fff;">${esc(v)}</div></div>`).join('')}
  </div>
  <div style="background:linear-gradient(135deg,#0f0f23,#1a1040);padding:16px 24px;display:flex;align-items:center;gap:20px;">
    <div style="flex-shrink:0;"><svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="7"/><circle cx="40" cy="40" r="34" fill="none" stroke="${scoreColor}" stroke-width="7" stroke-dasharray="${Math.round(2*Math.PI*34*pct/100)} ${Math.round(2*Math.PI*34*(100-pct)/100)}" stroke-dashoffset="${Math.round(2*Math.PI*34*.25)}" stroke-linecap="round"/><text x="40" y="36" text-anchor="middle" fill="#fff" font-size="16" font-weight="900" font-family="Arial">${pct}%</text><text x="40" y="50" text-anchor="middle" fill="${scoreColor}" font-size="7" font-weight="700" font-family="Arial">${isPassing?'PASS':'FAIL'}</text></svg></div>
    <div><div style="color:#fff;font-size:16px;font-weight:900;">${isPassing?'✅ OVERALL PASS':'❌ OVERALL FAIL'}</div><div style="color:#9ca3af;font-size:10px;margin-top:3px;">${tot} checks | ${esc(report.inspectionDate)}</div><div style="display:flex;gap:14px;margin-top:8px;"><div style="text-align:center;"><div style="font-size:20px;font-weight:900;color:#22c55e;">${passN}</div><div style="font-size:8px;color:#9ca3af;font-weight:700;">PASSED</div></div><div style="text-align:center;"><div style="font-size:20px;font-weight:900;color:#ef4444;">${failN}</div><div style="font-size:8px;color:#9ca3af;font-weight:700;">FAILED</div></div></div></div>
  </div>
  <div style="padding:20px 24px;">
    ${sec('🔵','Tyres','#0369a1',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#eff6ff;">${WHEEL_POS.map(p=>`<th style="padding:5px;font-size:8px;color:#1d4ed8;border:1px solid #bfdbfe;">${p}</th>`).join('')}</tr><tr>${WHEEL_POS.map(p=>`<td style="padding:6px;text-align:center;border:1px solid #e5e7eb;${report.tyres[p]?.status==='FAIL'?'background:#fff5f5;':''}">${badge(report.tyres[p]?.status||'PASS')}<div style="font-size:8px;color:#6b7280;margin-top:2px;">${esc(report.tyres[p]?.mfgYear||'—')}</div>${report.tyres[p]?.notes?`<div style="font-size:7px;color:#dc2626;">${esc(report.tyres[p].notes)}</div>`:''}</td>`).join('')}</tr></table>`)}
    ${sec('⭕','Rims','#0891b2',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#ecfeff;">${WHEEL_POS.map(p=>`<th style="padding:5px;font-size:8px;color:#0e7490;border:1px solid #a5f3fc;">${p}</th>`).join('')}</tr><tr>${WHEEL_POS.map(p=>`<td style="padding:6px;text-align:center;border:1px solid #e5e7eb;">${badge(report.rims[p]?.status||'PASS')}${report.rims[p]?.notes?`<div style="font-size:7px;color:#dc2626;">${esc(report.rims[p].notes)}</div>`:''}</td>`).join('')}</tr></table>`)}
    ${sec('🛑','Brakes','#b91c1c',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#fef2f2;"><th style="padding:5px 8px;font-size:8px;color:#991b1b;border:1px solid #fecaca;">POS</th><th style="padding:5px 8px;font-size:8px;color:#991b1b;border:1px solid #fecaca;">TYPE</th><th style="padding:5px 8px;font-size:8px;color:#991b1b;border:1px solid #fecaca;">PADS</th><th style="padding:5px 8px;font-size:8px;color:#991b1b;border:1px solid #fecaca;">DISC</th><th style="padding:5px 8px;font-size:8px;color:#991b1b;border:1px solid #fecaca;">NOTES</th></tr>${BRAKE_POS.map(p=>`<tr style="${(report.brakes[p]?.pads==='FAIL'||report.brakes[p]?.disc==='FAIL')?'background:#fff5f5;':''}"><td style="padding:6px 8px;font-weight:900;border:1px solid #e5e7eb;">${p}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;">${esc(report.brakes[p]?.type||'DISC')}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${badge(report.brakes[p]?.pads||'PASS')}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${badge(report.brakes[p]?.disc||'PASS')}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:9px;color:#dc2626;">${esc(report.brakes[p]?.notes||'')}</td></tr>`).join('')}</table>`)}
    ${sec('🔩','Suspension','#16a34a',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#ecfdf5;"><th style="padding:5px 8px;font-size:8px;color:#5b21b6;border:1px solid #bbf7d0;text-align:left;">POSITION</th><th style="padding:5px 8px;font-size:8px;color:#5b21b6;border:1px solid #bbf7d0;text-align:left;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#5b21b6;border:1px solid #bbf7d0;text-align:left;">NOTES</th></tr>${SUSP_POS.map(p=>`<tr style="${report.suspension[p.key]?.status==='FAIL'?'background:#fff5f5;':''}"><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:10px;">${p.label}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${badge(report.suspension[p.key]?.status||'PASS')}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:9px;color:#dc2626;">${esc(report.suspension[p.key]?.notes||'')}</td></tr>`).join('')}</table>`)}
    ${sec('🚪','Interior & Exterior','#059669',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#ecfdf5;"><th style="padding:5px 8px;font-size:8px;color:#065f46;border:1px solid #a7f3d0;text-align:left;">ITEM</th><th style="padding:5px 8px;font-size:8px;color:#065f46;border:1px solid #a7f3d0;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#065f46;border:1px solid #a7f3d0;text-align:left;">NOTES</th></tr>${checklist(report.interiorExterior||[])}</table>`)}
    ${sec('⚡','Electrical','#d97706',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#fffbeb;"><th style="padding:5px 8px;font-size:8px;color:#92400e;border:1px solid #fde68a;text-align:left;">ITEM</th><th style="padding:5px 8px;font-size:8px;color:#92400e;border:1px solid #fde68a;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#92400e;border:1px solid #fde68a;text-align:left;">NOTES</th></tr>${checklist(report.electrical||[])}</table>`)}
    ${sec('🎨','Body Condition','#db2777',`<div style="border:1px solid #fbcfe8;padding:12px;background:#fdf2f8;display:flex;align-items:center;gap:10px;"><span style="background:#db2777;color:#fff;font-size:11px;font-weight:900;padding:4px 12px;">${esc(report.bodyCondition||'Original Paint')}</span>${report.bodyNotes?`<span style="font-size:10px;color:#6b7280;font-style:italic;">${esc(report.bodyNotes)}</span>`:''}</div>`)}
    ${sec('🔧','Engine','#1d4ed8',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#eff6ff;"><th style="padding:5px 8px;font-size:8px;color:#1e40af;border:1px solid #bfdbfe;text-align:left;">ITEM</th><th style="padding:5px 8px;font-size:8px;color:#1e40af;border:1px solid #bfdbfe;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#1e40af;border:1px solid #bfdbfe;text-align:left;">NOTES</th></tr>${checklist(report.engine||[])}</table>`)}
    ${sec('⚙️','Transmission','#15803d',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#ecfdf5;"><th style="padding:5px 8px;font-size:8px;color:#4c1d95;border:1px solid #bbf7d0;text-align:left;">ITEM</th><th style="padding:5px 8px;font-size:8px;color:#4c1d95;border:1px solid #bbf7d0;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#4c1d95;border:1px solid #bbf7d0;text-align:left;">NOTES</th></tr>${checklist(report.transmission||[])}</table>`)}
    ${sec('🏗️','Chassis & Subframe','#374151',`<table style="width:100%;border-collapse:collapse;"><tr style="background:#f9fafb;"><th style="padding:5px 8px;font-size:8px;color:#374151;border:1px solid #e5e7eb;text-align:left;">ITEM</th><th style="padding:5px 8px;font-size:8px;color:#374151;border:1px solid #e5e7eb;">STATUS</th><th style="padding:5px 8px;font-size:8px;color:#374151;border:1px solid #e5e7eb;text-align:left;">NOTES</th></tr>${checklist(report.chassis||[])}</table>`)}
    <div style="margin-bottom:18px;"><div style="background:linear-gradient(135deg,#1f2937,#374151);color:#fff;padding:7px 12px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">💬 INSPECTOR COMMENTS</div><div style="border:1px solid #e5e7eb;padding:12px;font-size:11px;line-height:1.7;color:#374151;min-height:50px;background:#fafafa;">${esc(report.comments)||'<span style="color:#9ca3af;font-style:italic;">No additional comments.</span>'}</div></div>
    <div style="display:flex;gap:12px;margin-top:20px;padding-top:14px;border-top:2px dashed #e5e7eb;">${['Inspector Signature','Customer Signature','Authorized By'].map(l=>`<div style="flex:1;text-align:center;"><div style="border-bottom:2px solid #16a34a;margin-bottom:6px;height:44px;"></div><div style="font-size:8px;color:#6b7280;font-weight:700;text-transform:uppercase;">${l}</div></div>`).join('')}</div>
  </div>
  <div style="background:linear-gradient(135deg,#4c1d95,#16a34a);padding:10px 24px;display:flex;justify-content:space-between;align-items:center;">
    <span style="color:#86efac;font-size:8px;font-weight:700;letter-spacing:1px;">VISCO BODY SHOP — PROFESSIONAL VEHICLE INSPECTION</span>
    <span style="color:#bbf7d0;font-size:8px;">Generated: ${new Date().toLocaleDateString()}</span>
  </div>
</div></body></html>`;
  };

  const [sharing, setSharing] = useState(false);

  const shareReport = async () => {
    setSharing(true);
    try {
      const html  = buildHTML();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Inspection Report – ${card.plateNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF: ' + e.message);
    } finally {
      setSharing(false);
    }
  };

  const sendWhatsApp = () => {
    const custRaw = (card.carModel||'').match(/\[Cust:\s*(.*?)\]/)?.[1]?.trim() || card.customerName || 'Customer';
    const model   = (card.carModel||'').replace(/\s*\[Cust:.*?\]/,'').trim();
    const phone   = (card.customerContacts||[]).filter(Boolean)[0] || card.customerContact || '';
    const clean   = phone.replace(/\D/g,'');
    const msg = `Dear ${custRaw},\n\nYour vehicle inspection from *VISCO BODY SHOP* is ready.\n\n🚗 Vehicle: ${model}\n🔑 Plate: ${card.plateNumber}\n📅 Date: ${report.inspectionDate}\n\nPlease check the attached inspection report.\n\n— Visco Body Shop`;
    const url = clean ? `whatsapp://send?phone=${clean}&text=${encodeURIComponent(msg)}` : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp not installed'));
  };

  // Stats
  const allS = [];
  WHEEL_POS.forEach(p => { allS.push(report.tyres[p]?.status); allS.push(report.rims[p]?.status); });
  BRAKE_POS.forEach(p => { allS.push(report.brakes[p]?.pads); allS.push(report.brakes[p]?.disc); });
  SUSP_POS.forEach(p => allS.push(report.suspension[p.key]?.status));
  ['interiorExterior','electrical','engine','transmission','chassis'].forEach(s => (report[s]||[]).forEach(i => allS.push(i.status)));
  const passN = allS.filter(s => s === 'PASS').length;
  const failN = allS.filter(s => s === 'FAIL').length;
  const pct   = passN + failN > 0 ? Math.round((passN / (passN + failN)) * 100) : 100;

  const failIn = (sec) => (report[sec] || []).filter(i => i.status === 'FAIL').length;
  const wheelFail = (type) => WHEEL_POS.filter(p => report[type][p]?.status === 'FAIL').length;
  const brakeFail = () => BRAKE_POS.filter(p => report.brakes[p]?.pads === 'FAIL' || report.brakes[p]?.disc === 'FAIL').length;
  const suspFail  = () => SUSP_POS.filter(p => report.suspension[p.key]?.status === 'FAIL').length;

  const toggle = (sec) => setOpenSec(o => o === sec ? null : sec);

  const inp = (val, onChange, placeholder = '') => (
    <TextInput
      style={{
        borderWidth: 1, borderColor: isDark ? '#374151' : '#d1d5db', padding: 8, fontSize: 12,
        color: txt, backgroundColor: isDark ? '#1f2937' : '#fff', marginBottom: 4,
      }}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      value={val || ''}
      onChangeText={onChange}
      editable={canEdit}
    />
  );

  return (
    <View style={{ paddingHorizontal: 4 }}>

      {/* Overall score */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12,
        backgroundColor: pct >= 60 ? '#f0fdf4' : '#fff5f5',
        borderWidth: 1, borderColor: pct >= 60 ? '#bbf7d0' : '#fecaca',
      }}>
        <View style={{
          width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
          backgroundColor: pct >= 60 ? '#16a34a' : '#dc2626', marginRight: 14,
        }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{pct}%</Text>
        </View>
        <View>
          <Text style={{ fontWeight: '900', fontSize: 14, color: pct >= 60 ? '#15803d' : '#dc2626' }}>
            {pct >= 60 ? 'OVERALL PASS' : 'OVERALL FAIL'}
          </Text>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>{passN} pass · {failN} fail</Text>
        </View>
      </View>

      {/* Inspector info */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a', marginBottom: 3 }}>INSPECTOR NAME</Text>
      {inp(report.inspectorName, v => setReport(r => ({ ...r, inspectorName: v })), 'Inspector name')}
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a', marginBottom: 3, marginTop: 6 }}>INSPECTION DATE</Text>
      {inp(report.inspectionDate, v => setReport(r => ({ ...r, inspectionDate: v })), 'YYYY-MM-DD')}

      <View style={{ height: 16 }} />

      {/* ── TYRES ── */}
      <SectionHeader title="🔵 Tyres" open={openSec==='tyres'} onToggle={() => toggle('tyres')} failCount={wheelFail('tyres')} isDark={isDark} />
      {openSec === 'tyres' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {WHEEL_POS.map(p => (
              <View key={p} style={{ marginRight: 12, alignItems: 'center', width: 75 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#16a34a', marginBottom: 5 }}>{p}</Text>
                <StatusBtn value={report.tyres[p]?.status} onChange={v => updWheel('tyres', p, 'status', v)} canEdit={canEdit} />
                <TextInput
                  style={{ marginTop: 4, borderWidth:1, borderColor:'#d1d5db', padding:4, fontSize:10, width:'100%', color:txt, backgroundColor: isDark?'#1f2937':'#fff' }}
                  placeholder="Mfg Year" placeholderTextColor="#9ca3af" editable={canEdit}
                  value={report.tyres[p]?.mfgYear || ''}
                  onChangeText={v => updWheel('tyres', p, 'mfgYear', v)}
                />
                {report.tyres[p]?.status === 'FAIL' && (
                  <TextInput
                    style={{ marginTop: 3, borderWidth:1, borderColor:'#f87171', padding:4, fontSize:10, width:'100%', color:txt, backgroundColor: isDark?'#1f2937':'#fff' }}
                    placeholder="Notes" placeholderTextColor="#9ca3af" editable={canEdit}
                    value={report.tyres[p]?.notes || ''}
                    onChangeText={v => updWheel('tyres', p, 'notes', v)}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── RIMS ── */}
      <SectionHeader title="⭕ Rims" open={openSec==='rims'} onToggle={() => toggle('rims')} failCount={wheelFail('rims')} isDark={isDark} />
      {openSec === 'rims' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {WHEEL_POS.map(p => (
              <View key={p} style={{ marginRight: 12, alignItems: 'center', width: 75 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#16a34a', marginBottom: 5 }}>{p}</Text>
                <StatusBtn value={report.rims[p]?.status} onChange={v => updWheel('rims', p, 'status', v)} canEdit={canEdit} />
                {report.rims[p]?.status === 'FAIL' && (
                  <TextInput
                    style={{ marginTop: 3, borderWidth:1, borderColor:'#f87171', padding:4, fontSize:10, width:'100%', color:txt, backgroundColor: isDark?'#1f2937':'#fff' }}
                    placeholder="Notes" placeholderTextColor="#9ca3af" editable={canEdit}
                    value={report.rims[p]?.notes || ''}
                    onChangeText={v => updWheel('rims', p, 'notes', v)}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── BRAKES ── */}
      <SectionHeader title="🛑 Brakes" open={openSec==='brakes'} onToggle={() => toggle('brakes')} failCount={brakeFail()} isDark={isDark} />
      {openSec === 'brakes' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          {BRAKE_POS.map(p => (
            <View key={p} style={{ marginBottom: 10, borderWidth:1, borderColor: isDark?'#1f2937':'#f3f4f6', padding:8 }}>
              <Text style={{ fontWeight: '800', fontSize: 12, color: txt, marginBottom: 6 }}>{p}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <View>
                  <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>TYPE</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {['DISC','DRUM'].map(t => (
                      <TouchableOpacity key={t} disabled={!canEdit} onPress={() => updBrake(p, 'type', t)}
                        style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: report.brakes[p]?.type===t?'#16a34a':'#f3f4f6', borderWidth:1, borderColor: report.brakes[p]?.type===t?'#16a34a':'#d1d5db' }}>
                        <Text style={{ fontSize: 10, fontWeight:'800', color: report.brakes[p]?.type===t?'#fff':'#6b7280' }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>PADS</Text>
                  <StatusBtn value={report.brakes[p]?.pads} onChange={v => updBrake(p, 'pads', v)} canEdit={canEdit} />
                </View>
                <View>
                  <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>DISC</Text>
                  <StatusBtn value={report.brakes[p]?.disc} onChange={v => updBrake(p, 'disc', v)} canEdit={canEdit} />
                </View>
              </View>
              {(report.brakes[p]?.pads === 'FAIL' || report.brakes[p]?.disc === 'FAIL') && (
                <TextInput
                  style={{ marginTop: 6, borderWidth:1, borderColor:'#f87171', padding:6, fontSize:11, color:txt, backgroundColor: isDark?'#1f2937':'#fff' }}
                  placeholder="Notes..." placeholderTextColor="#9ca3af" editable={canEdit}
                  value={report.brakes[p]?.notes || ''}
                  onChangeText={v => updBrake(p, 'notes', v)}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── SUSPENSION ── */}
      <SectionHeader title="🔩 Suspension" open={openSec==='suspension'} onToggle={() => toggle('suspension')} failCount={suspFail()} isDark={isDark} />
      {openSec === 'suspension' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          {SUSP_POS.map(p => (
            <View key={p.key} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight:'700', fontSize:12, color:txt, marginBottom:4 }}>{p.label}</Text>
              <StatusBtn value={report.suspension[p.key]?.status} onChange={v => updSusp(p.key, 'status', v)} canEdit={canEdit} />
              {report.suspension[p.key]?.status === 'FAIL' && (
                <TextInput
                  style={{ marginTop:5, borderWidth:1, borderColor:'#f87171', padding:6, fontSize:11, color:txt, backgroundColor: isDark?'#1f2937':'#fff' }}
                  placeholder="Notes..." placeholderTextColor="#9ca3af" editable={canEdit}
                  value={report.suspension[p.key]?.notes || ''}
                  onChangeText={v => updSusp(p.key, 'notes', v)}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── CHECKLIST SECTIONS ── */}
      {SECTIONS.map(({ key, label }) => (
        <View key={key}>
          <SectionHeader title={label} open={openSec===key} onToggle={() => toggle(key)} failCount={failIn(key)} isDark={isDark} />
          {openSec === key && (
            <ChecklistSection items={report[key]||[]} sectionKey={key} onUpdate={updList} canEdit={canEdit} isDark={isDark} />
          )}
          {openSec === key && <View style={{ marginBottom: 4 }} />}
        </View>
      ))}

      {/* ── BODY ── */}
      <SectionHeader title="🎨 Body Condition" open={openSec==='body'} onToggle={() => toggle('body')} failCount={0} isDark={isDark} />
      {openSec === 'body' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          <Text style={{ fontSize:10, fontWeight:'700', color:'#6b7280', marginBottom:6 }}>PAINT CONDITION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {BODY_CONDITIONS.map(c => (
              <TouchableOpacity key={c} disabled={!canEdit} onPress={() => setReport(r => ({ ...r, bodyCondition: c }))}
                style={{
                  marginRight: 6, paddingHorizontal: 10, paddingVertical: 7,
                  backgroundColor: report.bodyCondition===c ? '#16a34a' : (isDark?'#1f2937':'#f3f4f6'),
                  borderWidth:1, borderColor: report.bodyCondition===c ? '#16a34a' : (isDark?'#374151':'#d1d5db'),
                }}>
                <Text style={{ fontSize:11, fontWeight:'800', color: report.bodyCondition===c?'#fff':(isDark?'#9ca3af':'#6b7280') }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontSize:10, fontWeight:'700', color:'#6b7280', marginBottom:4 }}>BODY NOTES</Text>
          <TextInput
            style={{ borderWidth:1, borderColor: isDark?'#374151':'#d1d5db', padding:8, fontSize:12, color:txt, backgroundColor: isDark?'#1f2937':'#fff', minHeight:70, textAlignVertical:'top' }}
            placeholder="Describe any body damage, rust, scratches..." placeholderTextColor="#9ca3af"
            multiline editable={canEdit}
            value={report.bodyNotes || ''}
            onChangeText={v => setReport(r => ({ ...r, bodyNotes: v }))}
          />
        </View>
      )}

      {/* ── COMMENTS ── */}
      <SectionHeader title="💬 Inspector Comments" open={openSec==='comments'} onToggle={() => toggle('comments')} failCount={0} isDark={isDark} />
      {openSec === 'comments' && (
        <View style={{ borderWidth:1, borderTopWidth:0, borderColor: isDark?'#374151':'#e5e7eb', padding:10, marginBottom:4 }}>
          <TextInput
            style={{ borderWidth:1, borderColor: isDark?'#374151':'#d1d5db', padding:8, fontSize:12, color:txt, backgroundColor: isDark?'#1f2937':'#fff', minHeight:100, textAlignVertical:'top' }}
            placeholder="Overall inspection comments, recommendations..." placeholderTextColor="#9ca3af"
            multiline editable={canEdit}
            value={report.comments || ''}
            onChangeText={v => setReport(r => ({ ...r, comments: v }))}
          />
        </View>
      )}

      <View style={{ height: 20 }} />

      {/* Save button */}
      {canEdit && (
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{ backgroundColor: saving ? '#9ca3af' : '#16a34a', padding: 16, alignItems: 'center', marginTop: 8 }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>💾 SAVE INSPECTION REPORT</Text>
          }
        </TouchableOpacity>
      )}

      <View style={{ height: 12 }} />

      {/* Action buttons */}
      <TouchableOpacity
        onPress={shareReport}
        disabled={sharing}
        style={{ backgroundColor: sharing ? '#9ca3af' : '#16a34a', padding: 15, alignItems: 'center', marginBottom: 8 }}
      >
        {sharing
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>📤 Send Report (PDF Share)</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        onPress={sendWhatsApp}
        style={{ backgroundColor: '#25D366', padding: 15, alignItems: 'center', marginBottom: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>💬 Send via WhatsApp</Text>
      </TouchableOpacity>

      {canEdit && (
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{ backgroundColor: saving ? '#9ca3af' : '#16a34a', padding: 15, alignItems: 'center', marginBottom: 8 }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>💾 SAVE INSPECTION REPORT</Text>
          }
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
