import { StyleSheet, Dimensions, Platform } from 'react-native';
const { width } = Dimensions.get('window');

export const SIDEBAR_WIDTH = width * 0.65;
export const GRID_PADDING  = 6;
export const GRID_GAP      = 4;
export const CARD_WIDTH    = (width - (GRID_PADDING * 2) - (GRID_GAP * 2)) / 3;

export const COLORS = {
  dark: {
    bg: '#0B0E14', surface: '#0f1117', card: '#0f1117', border: '#1a1f2e',
    text: '#e2e8f0', textSub: '#475569', accent: '#16a34a', accentDeep: '#15803d',
    success: '#4ade80', warning: '#fb923c', danger: '#f87171', gold: '#fbbf24',
    headerBg: '#0d1018', sidebarBg: '#090c12', inputBg: '#0f1117', inputBorder: '#1a1f2e', bannerBg: '#111827',
  },
  light: {
    bg: '#f0fdf4', surface: '#f7fdf9', card: '#f7fdf9', border: '#86efac',
    text: '#14532d', textSub: '#15803d', accent: '#16a34a', accentDeep: '#15803d',
    success: '#16a34a', warning: '#f97316', danger: '#ef4444', gold: '#d97706',
    headerBg: '#ffffff', sidebarBg: '#ffffff', inputBg: '#ecfdf5', inputBorder: '#86efac', bannerBg: '#ffffff',
  }
};

export const getStyles = (isDark) => {
  const C = isDark ? COLORS.dark : COLORS.light;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // ── Header ───────────────────────────────────────
    header: {
      backgroundColor: C.headerBg,
      paddingTop: 10, paddingBottom: 12, paddingHorizontal: 15,
      borderBottomWidth: 2, borderBottomColor: C.accent,
      elevation: 6,
    },
    headerContentWrapper: { flexDirection: 'row', alignItems: 'center' },
    logoImage: { width: 40, height: 40, resizeMode: 'contain', marginRight: 12, borderRadius: 8 },
    headerTextWrapper: { flex: 1 },
    headerTitleMain: { color: C.text, fontSize: 14, fontWeight: '900', letterSpacing: 1.8 },
    headerTitleSub:  { color: C.textSub, fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },
    slidingSearchContainer: {
      height: 40, backgroundColor: isDark ? '#0f1117' : '#ffffff',
      paddingHorizontal: 12, justifyContent: 'center',
      borderWidth: 1, borderColor: C.accent, borderRadius: 8,
    },
    searchBarInput: { width: '100%', fontSize: 14, color: isDark ? '#e2e8f0' : '#14532d', paddingVertical: 0 },
    themeToggleBtn: {
      width: 36, height: 36,
      backgroundColor: isDark ? '#0f1117' : '#ecfdf5',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
      borderRadius: 10, marginLeft: 8,
    },

    // ── Finance Banner ────────────────────────────────
    financeBannerBox: {
      backgroundColor: isDark ? '#111827' : '#f0fdf4',
      marginHorizontal: 8, marginTop: 8, marginBottom: 4,
      paddingVertical: 14, paddingHorizontal: 16,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1.5, borderColor: C.border,
      borderLeftWidth: 4, borderLeftColor: C.accent,
      elevation: 3,
    },
    financeBannerTitle:  { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 0.8, textTransform: 'uppercase' },
    financeBannerSub:    { fontSize: 9, color: C.textSub, marginTop: 3 },
    financeBannerAmount: { fontSize: 22, fontWeight: '900', color: '#ef4444', letterSpacing: -0.5 },

    // ── Bottom Banner ─────────────────────────────────
    bottomBannerFixed: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: C.headerBg,
      paddingHorizontal: 20, paddingTop: 6,
      paddingBottom: Platform.OS === 'android' ? 12 : 10,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, borderTopColor: C.border, zIndex: 10,
      elevation: 8,
    },
    bottomBannerText: { color: C.textSub, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

    // ── Sidebar ───────────────────────────────────────
    sidebarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 999 },
    sidebar: {
      position: 'absolute', top: 0, bottom: 0, left: 0, width: SIDEBAR_WIDTH,
      backgroundColor: isDark ? '#090c12' : '#ffffff',
      zIndex: 1000, elevation: 20,
      borderRightWidth: 1, borderRightColor: C.border,
    },
    sidebarHeader: {
      padding: 20, backgroundColor: isDark ? '#0d1018' : C.accent,
      alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: isDark ? '#1a1f2e' : C.accentDeep,
    },
    sidebarAvatar: { width: 66, height: 66, borderRadius: 33, marginBottom: 10, borderWidth: 2, borderColor: isDark ? C.accent : '#fff' },
    sidebarName:   { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
    sidebarRole:   { color: isDark ? '#fbbf24' : '#bbf7d0', fontSize: 11, fontWeight: '700', marginTop: 3 },
    sidebarMenu:   { flex: 1, paddingTop: 6 },
    sidebarLink:   {
      paddingVertical: 14, paddingHorizontal: 20,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
    },
    sidebarLinkActive: {
      backgroundColor: isDark ? '#0f1520' : '#ecfdf5',
      borderLeftWidth: 2, borderLeftColor: C.accent,
    },
    sidebarLinkText: { fontSize: 13, color: isDark ? '#94a3b8' : '#14532d', fontWeight: '600' },
    sidebarLogoutBtn: {
      margin: 14, backgroundColor: '#7f1d1d',
      padding: 13, alignItems: 'center', borderRadius: 8,
      borderWidth: 1, borderColor: '#991b1b',
    },

    // ── List ─────────────────────────────────────────
    flatListPadding: { paddingHorizontal: GRID_PADDING, paddingTop: 8, paddingBottom: 120 },
    rowWrapper:      { gap: GRID_GAP, marginBottom: GRID_GAP },

    // ── FAB Buttons ───────────────────────────────────
    floatingActionGroup: {
      position: 'absolute', bottom: 48, right: 12,
      flexDirection: 'row', alignItems: 'center', zIndex: 100, gap: 8,
    },
    smallFab: {
      width: 42, height: 42,
      backgroundColor: isDark ? '#0f1117' : '#ffffff',
      justifyContent: 'center', alignItems: 'center',
      elevation: 6, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
    },
    checkFabBadge: {
      position: 'absolute', top: -4, right: -4,
      backgroundColor: '#16a34a', borderRadius: 8,
      paddingHorizontal: 4, minWidth: 16, height: 16,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: isDark ? '#0f1117' : '#ffffff',
    },
    checkFabBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
    mainFab: {
      width: 52, height: 52,
      backgroundColor: C.accent,
      justifyContent: 'center', alignItems: 'center',
      elevation: 10, borderRadius: 14,
    },
    mainFabText: { color: '#ffffff', fontSize: 28, fontWeight: '300', marginTop: -2 },

    // ── Modals ────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    dropdownModalBox: {
      width: '85%', backgroundColor: C.surface, padding: 20, maxHeight: '80%',
      borderRadius: 12, borderWidth: 1, borderColor: C.border,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center',
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    modalTitle: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
    largeCloseBtn: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: isDark ? '#1a1f2e' : '#ecfdf5',
      justifyContent: 'center', alignItems: 'center',
    },
    largeCloseText: { color: '#ef4444', fontSize: 16, fontWeight: '900' },
    statusOptionRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1,
      borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
    },
    statusColorDot:   { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
    statusOptionText: { fontSize: 14, color: C.text, fontWeight: '600' },
    printOptionBtn: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      backgroundColor: isDark ? '#0f1117' : '#f7fdf9', marginBottom: 10,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    printOptionTitle: { fontSize: 14, fontWeight: '700', color: C.text },

    // ── Calculator ────────────────────────────────────
    calcOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    calcBox: {
      backgroundColor: isDark ? '#0f1117' : '#fff', padding: 16,
      borderTopWidth: 1, borderTopColor: C.border,
      borderTopLeftRadius: 16, borderTopRightRadius: 16,
    },
    calcInputDisplay: {
      backgroundColor: isDark ? '#0B0E14' : '#f7fdf9',
      padding: 18, fontSize: 32, textAlign: 'right', marginBottom: 14,
      color: C.text, fontWeight: '800',
      borderRadius: 10, borderWidth: 1, borderColor: C.border,
    },
    calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 6 },
    calcBtn: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    calcBtnText: { fontSize: 22, fontWeight: '700' },

    // ── Forms ─────────────────────────────────────────
    formInputLabel: {
      fontSize: 10, fontWeight: '800', color: C.textSub,
      marginTop: 14, textTransform: 'uppercase', letterSpacing: 1,
    },
    input: {
      borderWidth: 1, borderColor: C.inputBorder,
      borderRadius: 8, padding: 11, marginTop: 5, marginBottom: 12,
      fontSize: 14, backgroundColor: C.inputBg, color: C.text,
    },
    inputSmall: {
      borderWidth: 1, borderColor: C.inputBorder, borderRadius: 8,
      padding: 9, fontSize: 14, color: C.text, backgroundColor: C.inputBg, marginTop: 5,
    },
    saveBtn: { backgroundColor: C.accent, padding: 14, alignItems: 'center', borderRadius: 10, width: '100%' },
    tabContainer: {
      flexDirection: 'row', marginHorizontal: 20, marginTop: 14,
      backgroundColor: isDark ? '#0B0E14' : '#f0fdf4',
      borderRadius: 10, overflow: 'hidden',
      borderWidth: 1, borderColor: C.border,
    },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabBtnActive: {
      backgroundColor: isDark ? '#0f1117' : '#fff',
      borderBottomWidth: 2, borderBottomColor: C.accent,
    },
    tabBtnText: { fontSize: 12, fontWeight: '700', color: C.textSub },
    tabBtnTextActive: { color: C.accent },

    // ── Contact List ──────────────────────────────────
    contactSearchWrapper: {
      padding: 12, backgroundColor: C.surface,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    contactSearchInputField: {
      backgroundColor: isDark ? '#0f1117' : '#f7fdf9',
      padding: 10, borderRadius: 8, borderWidth: 1,
      borderColor: C.border, fontSize: 14, color: C.text,
    },
    contactItemRow: {
      flexDirection: 'row', padding: 14, alignItems: 'center',
      backgroundColor: C.surface,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
    },
    contactAvatarBox: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center',
    },
    avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '900' },
    contactMainName: { fontSize: 14, fontWeight: '700', color: C.text },
    contactSubPhone: { fontSize: 11, color: C.textSub, marginTop: 2 },

    // ── Detail Modal ──────────────────────────────────
    lokuPlateHeader: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.5 },
    topSaveContainer: {
      backgroundColor: isDark ? '#0B0E14' : '#f7fdf9', padding: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    topActionRow: {
      flexDirection: 'row', gap: 6, padding: 10,
      backgroundColor: isDark ? '#0B0E14' : '#f7fdf9',
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    actionBtnFull: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.3 },
    infoBlock: {
      padding: 14, backgroundColor: C.surface, gap: 10, marginTop: 5,
      borderWidth: 1, borderColor: C.border, borderRadius: 8,
    },
    detailRowMetric: {
      flexDirection: 'row', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
      paddingBottom: 8, alignItems: 'center',
    },
    lightLabelText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
    highlightDetailValue: { fontSize: 13, color: C.text, fontWeight: '700' },
    highlightedSectionBox: {
      backgroundColor: isDark ? '#0f1117' : '#f7fdf9', padding: 14, marginTop: 10,
      borderRadius: 8, borderWidth: 1,
      borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.accent,
    },
    sectionHighlightTitle: {
      fontSize: 11, fontWeight: '800',
      color: isDark ? '#4ade80' : C.accent,
      marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
    },
    checkboxRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, paddingHorizontal: 8,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
    },
    bulletItemText: { fontSize: 13, color: C.text, fontWeight: '500', flex: 1 },
    billingAdjustmentCard: {
      backgroundColor: C.surface, padding: 14,
      borderLeftWidth: 3, borderLeftColor: '#16a34a', marginTop: 10,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    whatsappCustomerBtn: {
      padding: 12, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center',
    },
    whatsappBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    detailLargeImage: { width: 110, height: 110, borderRadius: 8, borderWidth: 1, borderColor: C.border },

    // ── Parts Catalog ─────────────────────────────────
    catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    catalogCatBtn: {
      backgroundColor: C.surface, borderRadius: 8,
      borderWidth: 1, borderColor: C.border,
      paddingVertical: 12, paddingHorizontal: 12, width: '48%',
    },
    catalogCatBtnText: { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },
    selectedPartsPreviewBox: {
      marginTop: 20, backgroundColor: C.surface, padding: 14,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    previewPartRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: isDark ? '#0f1117' : '#ecfdf5',
    },
    previewPartText: { fontSize: 13, color: C.text, flex: 1 },
    previewPartDelBtn: {
      backgroundColor: '#ef4444', width: 22, height: 22,
      borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    },
    checkboxRowMain: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    checkboxLabelMain: { fontSize: 13, color: C.text, marginLeft: 14, fontWeight: '500' },
    partsNavRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#0f1117' : '#ecfdf5',
      padding: 12, marginBottom: 12, borderRadius: 8,
      borderWidth: 1, borderColor: C.border,
    },
    voiceContainer: {
      backgroundColor: C.surface, padding: 14, borderRadius: 8,
      borderWidth: 1, borderColor: C.border, marginBottom: 14,
    },
    datePickerBtn: {
      backgroundColor: isDark ? '#0f1117' : '#ecfdf5',
      padding: 12, alignItems: 'center', marginTop: 5, marginBottom: 12,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    datePickerBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },
    contactPickerTriggerBtn: {
      backgroundColor: isDark ? '#0f1117' : '#ecfdf5',
      padding: 12, alignItems: 'center', marginTop: 5, marginBottom: 12,
      borderRadius: 8, borderWidth: 1, borderColor: C.accent,
    },
    contactPickerTriggerText: { color: C.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    statusDropdownBtnLarge: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 1, borderColor: C.border, borderRadius: 8,
      padding: 13, marginTop: 5, marginBottom: 12,
      backgroundColor: isDark ? '#0f1117' : '#f7fdf9',
    },
    statusDropdownText: { fontSize: 14, fontWeight: '800' },
    newImageSectionContainer: {
      backgroundColor: C.surface, padding: 14, marginTop: 12,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    newImageActionBtn: {
      backgroundColor: isDark ? '#0f1117' : '#ecfdf5',
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: C.border,
    },
    newPreviewImage: { width: width - 70, height: 230, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    newRemoveImageBtn: {
      position: 'absolute', top: -5, right: -5,
      backgroundColor: 'rgba(220,38,38,0.9)',
      paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
    },
    prefixDropdownBtn: { backgroundColor: isDark ? '#1a1f2e' : C.accent, padding: 13, borderRadius: 8 },
    prefixDropdownList: {
      position: 'absolute', top: 48, left: 0,
      backgroundColor: C.surface, elevation: 8,
      borderRadius: 8, borderWidth: 1, borderColor: C.border, width: 75, zIndex: 999,
    },
  });
};
