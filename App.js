import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, Alert, Modal, TextInput, ScrollView, Switch, Image, Dimensions, Animated, Linking, BackHandler, AppState } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Image as ExpoImage } from 'expo-image';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications'; // ✅ Push Notifications
import Constants from 'expo-constants'; // ✅ Expo Go detection

// ✅ Notification handler — app foreground ලදී notification show කරනවා
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { API_BASE as _API_BASE, API_KEY } from './src/utils/config';
import { STATUS_OPTIONS, INACTIVE_STATUSES } from './src/utils/constants';
import { getStatusColor, decodePart, encodePart, parseImagesToArray, getCleanModelText, getCustomerNameOnly } from './src/utils/helpers';
import { getStyles, SIDEBAR_WIDTH, GRID_PADDING, GRID_GAP, CARD_WIDTH } from './src/utils/AppStyles';
import JobCardItem from './src/components/JobCardItem';
import JobCardFormModal from './src/components/JobCardFormModal';
import JobCardDetailModal from './src/components/JobCardDetailModal';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import TodoScreen from './src/screens/TodoScreen';

const API_BASE = _API_BASE;
const API_URL  = `${API_BASE}/jobcards`;
axios.defaults.headers.common['x-api-key'] = API_KEY;

// Send JWT Bearer token on every request; fall back to API key if no token yet
axios.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('bodyshop_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      delete config.headers['x-api-key'];
    }
  } catch {}
  return config;
});

// If the token expired/invalid, every request 401s silently — clear it and bounce back to login
let onUnauthorized = null; // set by the App component below
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('bodyshop_user');
        await AsyncStorage.removeItem('bodyshop_token');
      } catch {}
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

const { width } = Dimensions.get('window');

const AnimatedIconBtn = ({ icon, onPress, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true }).start();
  const S = getStyles(isDark);
  return (
    <TouchableOpacity activeOpacity={0.8} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[S.smallFab, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const AddFabButton = ({ onPress, isDark }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();
  const S = getStyles(isDark);
  return (
    <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[S.mainFab, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={S.mainFabText}>+</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [currentUser,   setCurrentUser]   = useState(null);
  const [authChecking,  setAuthChecking]  = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const [jobCards,  setJobCards]  = useState([]);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(true);

  const [usersList,      setUsersList]      = useState([]);
  const [activityLogs,   setActivityLogs]   = useState([]);
  const [allTodoCards,   setAllTodoCards]   = useState([]);
  const [dbPartsCatalog, setDbPartsCatalog] = useState([]);
  const [financeSummary, setFinanceSummary] = useState({ totalOutstanding: 0, unpaidCount: 0 });
  const [totalActiveCount, setTotalActiveCount] = useState(0); // ← FIX 2: Add this state
  const [pinnedCardId, setPinnedCardId] = useState(null); // ✅ New/clone card top ekata pin karanawa
  const pinnedCardIdRef = useRef(null); // Async context eke access karanawa
  const [adminPartTab,   setAdminPartTab]   = useState('users');

  const [newGroupName,          setNewGroupName]          = useState('');
  const [newSubGroupName,       setNewSubGroupName]       = useState('');
  const [newItemName,           setNewItemName]           = useState('');
  const [selectedAdminGroupId,  setSelectedAdminGroupId]  = useState('');
  const [selectedAdminSubGroup, setSelectedAdminSubGroup] = useState('');

  const [loading,             setLoading]             = useState(false);
  const [refreshing,          setRefreshing]          = useState(false);
  const [showForm,            setShowForm]            = useState(false);
  const [isEditing,           setIsEditing]           = useState(false);
  const [editId,              setEditId]              = useState(null);
  const [selectedCard,        setSelectedCard]        = useState(null);
  const [fullScreenImg,       setFullScreenImg]       = useState(null);
  const [showStatusDropdown,  setShowStatusDropdown]  = useState(false);
  const [dropdownMode,        setDropdownMode]        = useState('form');
  const [showCalc,            setShowCalc]            = useState(false);
  const [calcInput,           setCalcInput]           = useState('');
  const [searchQuery,         setSearchQuery]         = useState('');
  const [isSearchOpen,        setIsSearchOpen]        = useState(false);
  const searchAnim    = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef(null);
  const currentUserRef = useRef(null);
  const notificationListener = useRef(null); // ✅ Notification listener
  const responseListener     = useRef(null); // ✅ Notification tap listener

  const [allContacts,        setAllContacts]        = useState([]);
  const [filteredContacts,   setFilteredContacts]   = useState([]);
  const [showContactModal,   setShowContactModal]   = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [loadingContacts,    setLoadingContacts]    = useState(false);
  const [showPrintModal,     setShowPrintModal]     = useState(false);

  const [formTab,           setFormTab]           = useState('info');
  const [activeNavGroup,    setActiveNavGroup]    = useState(null);
  const [activeNavSubGroup, setActiveNavSubGroup] = useState(null);
  const [partSelections,    setPartSelections]    = useState({});
  const [customParts,       setCustomParts]       = useState(['']);
  const [partStatuses,      setPartStatuses]      = useState({});
  const [quickVoice,        setQuickVoice]        = useState({ engineOil: false, completeCheckup: false });
  const [newPassword,       setNewPassword]       = useState('');

  const [showJobCardDatePicker,       setShowJobCardDatePicker]       = useState(false);
  const [showReceiveDatePicker,       setShowReceiveDatePicker]       = useState(false);
  const [showReminderDatePicker,      setShowReminderDatePicker]      = useState(false);
  const [showReminderTimePicker,      setShowReminderTimePicker]      = useState(false);
  const [showDeliveryDatePicker,      setShowDeliveryDatePicker]      = useState(false);
  const [tempDateObj,                 setTempDateObj]                 = useState(new Date());
  const [showDirectReminderDatePicker,setShowDirectReminderDatePicker]= useState(false);
  const [showDirectReminderTimePicker,setShowDirectReminderTimePicker]= useState(false);
  const [directReminderCard,          setDirectReminderCard]          = useState(null);
  const [showUserModal,               setShowUserModal]               = useState(false);
  const [editingUserId,               setEditingUserId]               = useState(null);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'User', permissions: { canCreateCard: false, canEditCard: false, canDeleteCard: false, canUpdateStatus: false, canApproveQuote: false } });

  const now               = new Date();
  const todayDate         = now.toISOString().split('T')[0];
  const currentTime       = now.toTimeString().split(' ')[0].substring(0, 5);
  const defaultDateTime   = `${todayDate} ${currentTime}`;
  const formattedDateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const [formData, setFormData] = useState({
    jobCardDate: defaultDateTime, customerPrefix: 'Mr.', plateNumber: '', carModel: '', companyName: '',
    customerName: '', customerContact: '', customerContacts: [''], jobCardNo: '', vin: '', odoKM: '',
    carNotStart: false, quoteDone: false, approvalDone: false,
    receiveDate: defaultDateTime, deliveryDate: defaultDateTime, reminderTime: '',
    customerVoice: [''], inspectionTech: '', jobDoneBy: '', located: 'Main Body Shop',
    invoiceNo: '', invoiceAmount: '', paidAmount: '', paymentStatus: 'Pending',
    rearImage: [], vinImage: [], odoImage: [], inspectionPhotos: [], status: 'Inspection'
  });

  const S = getStyles(isDark);
  const C = isDark ? require('./src/utils/AppStyles').COLORS.dark : require('./src/utils/AppStyles').COLORS.light;

  // ── FIX 1: Update currentUserRef when currentUser changes ──
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  // ✅ Sync pinnedCardId to ref for async access
  useEffect(() => { pinnedCardIdRef.current = pinnedCardId; }, [pinnedCardId]);

  // ✅ Push Notification Setup — login වුණාම token ගන්නවා
  useEffect(() => {
    if (!currentUser) return;

    const registerPushToken = async () => {
      try {
        // Expo Go eke push notifications work karanne nehe — skip
        if (Constants.appOwnership === 'expo') return;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        // Backend ට save කරනවා
        await axios.put(`${API_BASE}/users/${currentUser._id}/push-token`, { pushToken: token });
      } catch (e) {
        console.log('Push token error:', e);
      }
    };

    registerPushToken();

    // Notification tap කරනකොට relevant card open කරනවා
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
      const cardId = response.notification.request.content.data?.cardId;
      if (cardId) {
        try {
          // State eke nathnam backend eken direct fetch karanawa
          const res = await axios.get(`${API_URL}/${cardId}`);
          if (res.data) {
            setCurrentScreen('home');
            setTimeout(() => setSelectedCard(res.data), 300);
          }
        } catch (e) {
          console.log('Notification card fetch error:', e);
        }
      }
    });

    return () => {
      if (responseListener.current) responseListener.current.remove();
    };
  }, [currentUser]);

  // AppState auto-refresh removed — data loads once on login, use pull-to-refresh to update manually

  const fetchAllTodos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobcards/todos`);
      setAllTodoCards(res.data || []);
    } catch (e) { console.log('todos fetch error', e); }
  };

  useEffect(() => { checkLoginStatus(); }, []);
  useEffect(() => {
    onUnauthorized = () => {
      setCurrentUser(null);
      setCurrentScreen('home');
      setJobCards([]);
      Alert.alert('Session Expired', 'Please log in again.');
    };
    return () => { onUnauthorized = null; };
  }, []);
  const checkLoginStatus = async () => {
    try { const userData = await AsyncStorage.getItem('bodyshop_user'); if (userData) setCurrentUser(JSON.parse(userData)); }
    catch (e) { console.log("Auth check error"); } finally { setAuthChecking(false); }
  };
  useEffect(() => { if (currentUser) { fetchJobCards(1, ''); fetchFinanceAndParts(); fetchAllTodos(); } }, [currentUser]);

  useEffect(() => {
    const backAction = () => {
      if (isSidebarOpen)            { toggleSidebar(); return true; }
      if (showUserModal)             { setShowUserModal(false); return true; }
      if (fullScreenImg)             { setFullScreenImg(null); return true; }
      if (activeNavGroup)            { setActiveNavGroup(null); setActiveNavSubGroup(null); return true; }
      if (showCalc)                  { setShowCalc(false); return true; }
      if (showPrintModal)            { setShowPrintModal(false); return true; }
      if (showStatusDropdown)        { setShowStatusDropdown(false); return true; }
      if (showContactModal)          { setShowContactModal(false); return true; }
      if (showForm)                  { setShowForm(false); return true; }
      if (selectedCard)              { setSelectedCard(null); return true; }
      if (currentScreen !== 'home')  { setCurrentScreen('home'); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedCard, showForm, showContactModal, showStatusDropdown, showCalc, fullScreenImg, showPrintModal, isSidebarOpen, currentScreen, showUserModal, activeNavGroup]);

  // ── FIX 2: New function to fetch total active count from backend ──
  const fetchActiveCount = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobcards/active-count`);
      setTotalActiveCount(res.data.count);
    } catch (e) { console.log('Active count error'); }
  };

  const fetchFinanceAndParts = async () => {
    try {
      const resParts = await axios.get(`${API_BASE}/parts`); setDbPartsCatalog(resParts.data);
      if (currentUser?.role === 'Admin') {
        const resFinance = await axios.get(`${API_BASE}/finances/summary`); setFinanceSummary(resFinance.data);
      }
      fetchActiveCount(); // ← FIX 2: Call this to get real total count
    } catch (e) { console.log("Data sync error"); }
  };

  const fetchJobCards = async (pageNum = 1, query = '') => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await axios.get(`${API_URL}?page=${pageNum}&limit=15&search=${query}`);
      if (pageNum === 1) {
        const currentPinnedId = pinnedCardIdRef.current;
        if (currentPinnedId) {
          // Look for pinned card in fresh server data first
          let pinnedCard = res.data.find(c => String(c._id) === String(currentPinnedId));
          const others = res.data.filter(c => String(c._id) !== String(currentPinnedId));
          if (!pinnedCard) {
            // Card not returned in page 1 (backend sort put it elsewhere) — fetch it directly
            try {
              const pr = await axios.get(`${API_URL}/${currentPinnedId}`);
              pinnedCard = pr.data;
            } catch { setPinnedCardId(null); }
          }
          setJobCards(pinnedCard ? [pinnedCard, ...others] : res.data);
        } else {
          setJobCards(res.data);
        }
      } else {
        setJobCards(prev => { const existingIds = new Set(prev.map(c => c._id)); return [...prev, ...res.data.filter(c => !existingIds.has(c._id))]; });
      }
      setHasMore(res.data.length === 15);
    } catch (e) { console.log(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const handlePullToRefresh = () => {
    setRefreshing(true);
    setPage(1);
    // pinnedCardId keep karanawa — refresh karapath pinned card top ekata thiyenna ona
    fetchJobCards(1, searchQuery);
    fetchFinanceAndParts();
  };
  const handleLoadMore      = () => { if (hasMore && !loading && !refreshing) { const nextPage = page + 1; setPage(nextPage); fetchJobCards(nextPage, searchQuery); } };

  const toggleSearch = () => {
    if (isSearchOpen) { Animated.timing(searchAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => setIsSearchOpen(false)); setSearchQuery(''); setPage(1); fetchJobCards(1, ''); }
    else { setIsSearchOpen(true); Animated.timing(searchAnim, { toValue: width - 40, duration: 300, useNativeDriver: false }).start(); }
  };
  const handleSearch = (text) => { setSearchQuery(text); if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => { setPage(1); fetchJobCards(1, text); }, 600); };

  const handleAddGroup    = async () => { if (!newGroupName.trim()) return Alert.alert("Error", "Enter Group Name"); try { await axios.post(`${API_BASE}/parts`, { groupName: newGroupName.trim(), subGroups: [], items: [] }); setNewGroupName(''); fetchFinanceAndParts(); Alert.alert("Success", "New Parts Group Created!"); } catch(e) { Alert.alert("Error", e.response?.data?.error || "Group creation failed"); } };
  const handleAddSubGroup = async () => { if (!selectedAdminGroupId || !newSubGroupName.trim()) return Alert.alert("Error", "Select Group and Enter Sub-Group Name"); try { const group = dbPartsCatalog.find(g => g._id === selectedAdminGroupId); const updatedSubGroups = [...group.subGroups, { subGroupName: newSubGroupName.trim(), items: [] }]; await axios.put(`${API_BASE}/parts/${selectedAdminGroupId}`, { subGroups: updatedSubGroups }); setNewSubGroupName(''); fetchFinanceAndParts(); Alert.alert("Success", "Sub-Group Added!"); } catch(e) { Alert.alert("Error", "Sub-Group creation failed"); } };
  const handleAddItem = async () => {
    if (!selectedAdminGroupId || !newItemName.trim()) return Alert.alert("Error", "Select a Group and enter Item Name");
    try {
      const group = dbPartsCatalog.find(g => g._id === selectedAdminGroupId);
      const updatedItems = [...(group.items || []), newItemName.trim()];
      await axios.put(`${API_BASE}/parts/${selectedAdminGroupId}`, { items: updatedItems });
      setNewItemName('');
      await fetchFinanceAndParts();
      Alert.alert("Success", "Item successfully added!");
    } catch(e) {
      Alert.alert("Error", e.response?.data?.error || "Item creation failed");
    }
  };

  const handleDeleteItem = async (groupId, itemIndex) => {
    try {
      const group = dbPartsCatalog.find(g => g._id === groupId);
      const updatedItems = [...(group.items || [])];
      updatedItems.splice(itemIndex, 1);
      await axios.put(`${API_BASE}/parts/${groupId}`, { items: updatedItems });
      await fetchFinanceAndParts();
    } catch(e) {
      Alert.alert("Error", e.response?.data?.error || "Item deletion failed");
    }
  };
  const handleDeleteGroup = async (id) => { Alert.alert("Delete", "Delete this entire group and all its parts?", [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await axios.delete(`${API_BASE}/parts/${id}`); fetchFinanceAndParts(); } }]); };

  const handleLogout = () => { Alert.alert("Logout", "Are you sure you want to log out?", [{ text: "Cancel", style: "cancel" }, { text: "Logout", onPress: async () => { await AsyncStorage.removeItem('bodyshop_user'); await AsyncStorage.removeItem('bodyshop_token'); if (isSidebarOpen) toggleSidebar(); setCurrentUser(null); setCurrentScreen('home'); setJobCards([]); setPage(1); } }]); };
  const hasPerm     = (perm) => { if (currentUser?.role === 'Admin') return true; return currentUser?.permissions?.[perm] === true; };
  const navigateTo = (screen) => {
    setCurrentScreen(screen);
    if (isSidebarOpen) toggleSidebar();
    if (screen === 'todos') { fetchAllTodos(); }
    if (screen === 'admin') { setLoading(true); axios.get(`${API_BASE}/users`).then(r => setUsersList(r.data)); axios.get(`${API_BASE}/logs`).then(r => setActivityLogs(r.data)); setLoading(false); }
  };
  const toggleSidebar = () => { const toValue = isSidebarOpen ? -SIDEBAR_WIDTH : 0; Animated.timing(sidebarAnim, { toValue, duration: 300, useNativeDriver: true }).start(); setIsSidebarOpen(!isSidebarOpen); };

  const handleProfileUpdate = async (updateData) => { try { setLoading(true); const payload = { ...updateData }; if (!payload.password) delete payload.password; const res = await axios.put(`${API_BASE}/users/${currentUser?._id}`, payload); setCurrentUser(res.data); setNewPassword(''); Alert.alert("Success", "Profile updated successfully!"); } catch (e) { Alert.alert("Error", "Failed to update profile"); } finally { setLoading(false); } };
  const changeProfilePic    = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') return Alert.alert("Permission Denied", "Gallery access is required."); const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5, aspect: [1, 1] }); if (!result.canceled && result.assets.length > 0) { setLoading(true); try { const localUri = result.assets[0].uri; const filename = localUri.split('/').pop(); const type = `image/${filename.split('.').pop()}`; const imageForm = new FormData(); imageForm.append('image', { uri: localUri, name: filename, type }); const uploadRes = await axios.post(`${API_BASE}/upload`, imageForm, { headers: { 'Content-Type': 'multipart/form-data' } }); await handleProfileUpdate({ profileImage: uploadRes.data.imageUrl }); } catch (e) { Alert.alert("Error", "Upload failed"); setLoading(false); } } };
  const resetUserModal = () => { setEditingUserId(null); setNewUser({ name: '', username: '', password: '', role: 'User', permissions: { canCreateCard: false, canEditCard: false, canDeleteCard: false, canUpdateStatus: false, canApproveQuote: false } }); };
  const openNewUserModal  = () => { resetUserModal(); setShowUserModal(true); };
  const openEditUserModal = (user) => {
    setEditingUserId(user._id);
    setNewUser({ name: user.name || '', username: user.username || '', password: '', role: user.role || 'User', permissions: user.permissions || { canCreateCard: false, canEditCard: false, canDeleteCard: false, canUpdateStatus: false, canApproveQuote: false } });
    setShowUserModal(true);
  };
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.username || (!editingUserId && !newUser.password)) return Alert.alert("Error", "Fill all required fields");
    try {
      setLoading(true);
      if (editingUserId) {
        const payload = { ...newUser };
        if (!payload.password) delete payload.password;
        await axios.put(`${API_BASE}/users/${editingUserId}`, payload);
        Alert.alert("Success", "User updated successfully!");
      } else {
        await axios.post(`${API_BASE}/users`, newUser);
        Alert.alert("Success", "User created successfully!");
      }
      setShowUserModal(false);
      resetUserModal();
      axios.get(`${API_BASE}/users`).then(r => setUsersList(r.data));
    } catch (e) { Alert.alert("Error", e.response?.data?.error || "Failed to save user"); } finally { setLoading(false); }
  };
  const handleDeleteUser = (user) => {
    Alert.alert("Delete User", `Delete account "${user.name}"? This cannot be undone.`, [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { setLoading(true); await axios.delete(`${API_BASE}/users/${user._id}`); axios.get(`${API_BASE}/users`).then(r => setUsersList(r.data)); }
        catch (e) { Alert.alert("Error", e.response?.data?.error || "Failed to delete user"); }
        finally { setLoading(false); }
      } }
    ]);
  };
  const toggleUserActive    = async (user) => { try { setLoading(true); await axios.put(`${API_BASE}/users/${user._id}`, { isActive: !user.isActive }); axios.get(`${API_BASE}/users`).then(r => setUsersList(r.data)); } catch (e) { Alert.alert("Error", "Update failed"); } finally { setLoading(false); } };

  const handleSaveFinanceAmount = async (card, invAmount, paidAmt, invNo) => { const pStatus = Number(paidAmt) >= Number(invAmount) && Number(invAmount) > 0 ? 'Paid' : (Number(paidAmt) > 0 ? 'Partial' : 'Pending'); const updatedCard = { ...card, invoiceAmount: invAmount, paidAmount: paidAmt, invoiceNo: invNo, paymentStatus: pStatus }; setSelectedCard(updatedCard); setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c)); try { await axios.put(`${API_URL}/${card._id}`, { invoiceAmount: Number(invAmount || 0), paidAmount: Number(paidAmt || 0), invoiceNo: invNo, paymentStatus: pStatus, laborCharges: Number(card.laborCharges || 0) }); fetchFinanceAndParts(); Alert.alert("Success", "Billing updated successfully!"); } catch(e) { Alert.alert("Error", "Billing save failed"); } };
  const handleUpdateStatusFromDetail = async (card, newStatus) => { if (!hasPerm('canUpdateStatus')) return Alert.alert("Restricted", "You do not have permission to change status."); const updatedCard = { ...card, status: newStatus }; setSelectedCard(updatedCard); setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c)); try { await axios.put(`${API_URL}/${card._id}`, { status: newStatus }); } catch (e) { Alert.alert("Error", "Failed to update."); } };
  const handleTogglePartReceived = async (card, idx) => { if (!hasPerm('canEditCard')) return Alert.alert("Restricted", "No permission."); const updatedDetails = [...(card.inspectionDetails || [])]; const dec = decodePart(updatedDetails[idx]); dec.received = !dec.received; updatedDetails[idx] = encodePart(dec.name, dec.received); const updatedCard = { ...card, inspectionDetails: updatedDetails }; setSelectedCard(updatedCard); setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c)); try { await axios.put(`${API_URL}/${card._id}`, { inspectionDetails: updatedDetails }); } catch (e) {} };
  const handleToggleVoiceCompleted = async (card, idx) => { if (!hasPerm('canEditCard')) return Alert.alert("Restricted", "No permission."); const updatedVoices = [...(card.customerVoice || [])]; let target = updatedVoices[idx]; if (typeof target === 'string') { target = { text: target, completed: true }; } else { target = { ...target, completed: !target.completed }; } updatedVoices[idx] = target; const updatedCard = { ...card, customerVoice: updatedVoices }; setSelectedCard(updatedCard); setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c)); try { await axios.put(`${API_URL}/${card._id}`, { customerVoice: updatedVoices }); } catch(err) {} };
  const initiateDirectReminderUpdate = (card) => { if (!hasPerm('canEditCard')) return Alert.alert("Restricted", "No permission."); setDirectReminderCard(card); setTempDateObj(new Date()); setShowDirectReminderDatePicker(true); };

  const handleSave = async () => {
    if (!formData.plateNumber) return Alert.alert("Validation Error", "Plate Number is required!");
    let formattedName  = formData.customerName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    let mixedModelText = formData.carModel.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    if (formattedName.trim()) mixedModelText = `${mixedModelText} [Cust: ${formData.customerPrefix} ${formattedName.trim()}]`;
    const selectedFromCatalog    = Object.keys(partSelections).filter(k => partSelections[k]);
    const validCustomParts       = customParts.filter(p => String(p).trim() !== '');
    const finalInspectionDetails = [...selectedFromCatalog, ...validCustomParts].map(name => encodePart(name, partStatuses[name] || false));
    let finalCustomerVoice = formData.customerVoice.filter(t => t && String(t).trim() !== '').map(t => ({ text: String(t), completed: false }));
    if (quickVoice.engineOil)       finalCustomerVoice.unshift({ text: 'Engine Oil Filter Service', completed: false });
    if (quickVoice.completeCheckup) finalCustomerVoice.unshift({ text: 'Complete Checkup', completed: false });
    const pStatus       = Number(formData.paidAmount) >= Number(formData.invoiceAmount) && Number(formData.invoiceAmount) > 0 ? 'Paid' : (Number(formData.paidAmount) > 0 ? 'Partial' : 'Pending');
    const validContacts = formData.customerContacts.filter(c => c.trim() !== '');
    const finalData     = { ...formData, carModel: mixedModelText, customerName: formattedName, customerContacts: validContacts, invoiceAmount: Number(formData.invoiceAmount || 0), paidAmount: Number(formData.paidAmount || 0), rearImage: formData.rearImage.filter(img => img && String(img).trim() !== '').join(','), vinImage: formData.vinImage.filter(img => img && String(img).trim() !== '').join(','), odoImage: formData.odoImage.filter(img => img && String(img).trim() !== '').join(','), inspectionPhotos: formData.inspectionPhotos.filter(img => img && String(img).trim() !== '').join(','), customerVoice: finalCustomerVoice, inspectionDetails: finalInspectionDetails, paymentStatus: pStatus };
    try {
      setLoading(true);
      if (isEditing) {
        // Edit: update card in state, then sync from backend
        const res = await axios.put(`${API_URL}/${editId}`, finalData);
        setJobCards(prev => prev.map(c => c._id === editId ? res.data : c));
        fetchJobCards(1, ''); // sync after edit
      } else {
        // New / Clone: prepend to TOP + pin to top
        const res = await axios.post(API_URL, finalData);
        setJobCards(prev => [res.data, ...prev]);
        setPinnedCardId(res.data._id); // ✅ Sort ekata depend nowanawa — always top
        fetchFinanceAndParts();
      }
      setShowForm(false);
      setPage(1);
      resetForm();
    } catch (e) { Alert.alert("Server Error", "Could not save data."); } finally { setLoading(false); }
  };

  const handleEdit = (card) => {
    setIsEditing(true); setEditId(card._id);
    let originalModel = card.carModel || ''; let extractedName = ''; let extractedPrefix = 'Mr.';
    if (String(originalModel).includes(' [Cust: ')) { const parts = String(originalModel).split(' [Cust: '); originalModel = parts[0]; let rawName = parts[1].replace(']', ''); if (rawName.startsWith('Mr. ')) { extractedPrefix = 'Mr.'; extractedName = rawName.replace('Mr. ', ''); } else if (rawName.startsWith('Miss ')) { extractedPrefix = 'Miss'; extractedName = rawName.replace('Miss ', ''); } else if (rawName.startsWith('Mrs. ')) { extractedPrefix = 'Mrs.'; extractedName = rawName.replace('Mrs. ', ''); } else { extractedName = rawName; } }
    const loadedSelections = {}; const loadedCustomParts = []; const loadedReceivedStates = {};
    const allKnownItems = dbPartsCatalog.flatMap(g => [...(g.items || []), ...g.subGroups.flatMap(sg => sg.items)]);
    (card.inspectionDetails || []).forEach(p => { const dec = decodePart(p); if (!dec.name.trim()) return; loadedReceivedStates[dec.name] = dec.received; if (allKnownItems.includes(dec.name)) loadedSelections[dec.name] = true; else loadedCustomParts.push(dec.name); });
    loadedCustomParts.push('');
    let loadedContacts = card.customerContacts?.length ? [...card.customerContacts] : (card.customerContact ? [card.customerContact] : []);
    if (loadedContacts.length === 0 || loadedContacts[loadedContacts.length - 1] !== '') loadedContacts.push('');
    setFormData({ ...card, carModel: originalModel, customerName: extractedName, customerPrefix: extractedPrefix, jobCardDate: card.jobCardDate || defaultDateTime, customerContact: loadedContacts.length > 0 ? loadedContacts[0] : '', customerContacts: loadedContacts, companyName: card.companyName || '', customerVoice: card.customerVoice?.length > 0 ? [...card.customerVoice.map(v => typeof v === 'object' ? (v.text || '') : (v || '')), ''] : [''], odoKM: card.odoKM ? String(card.odoKM) : '', status: card.status || 'Inspection', inspectionTech: card.inspectionTech || '', jobDoneBy: card.jobDoneBy || '', invoiceAmount: String(card.invoiceAmount || ''), paidAmount: String(card.paidAmount || ''), laborCharges: String(card.laborCharges || ''), rearImage: parseImagesToArray(card.rearImage).filter(img => img && String(img).trim() !== ''), vinImage: parseImagesToArray(card.vinImage).filter(img => img && String(img).trim() !== ''), odoImage: parseImagesToArray(card.odoImage).filter(img => img && String(img).trim() !== ''), inspectionPhotos: parseImagesToArray(card.inspectionPhotos).filter(img => img && String(img).trim() !== ''), receiveDate: card.receiveDate || defaultDateTime, deliveryDate: card.deliveryDate || defaultDateTime, reminderTime: card.reminderTime || '' });
    setPartSelections(loadedSelections); setCustomParts(loadedCustomParts); setPartStatuses(loadedReceivedStates);
    setQuickVoice({ engineOil: false, completeCheckup: false }); setFormTab('info'); setSelectedCard(null); setShowForm(true);
  };

  const handleClone = (card) => {
    setIsEditing(false); setEditId(null);
    let originalModel = card.carModel || ''; let extractedName = ''; let extractedPrefix = 'Mr.';
    if (String(originalModel).includes(' [Cust: ')) { const parts = String(originalModel).split(' [Cust: '); originalModel = parts[0]; let rawName = parts[1].replace(']', ''); if (rawName.startsWith('Mr. ')) { extractedPrefix = 'Mr.'; extractedName = rawName.replace('Mr. ', ''); } else if (rawName.startsWith('Miss ')) { extractedPrefix = 'Miss'; extractedName = rawName.replace('Miss ', ''); } else if (rawName.startsWith('Mrs. ')) { extractedPrefix = 'Mrs.'; extractedName = rawName.replace('Mrs. ', ''); } else { extractedName = rawName; } }
    let loadedContacts = card.customerContacts?.length ? [...card.customerContacts] : (card.customerContact ? [card.customerContact] : []);
    if (loadedContacts.length === 0 || loadedContacts[loadedContacts.length - 1] !== '') loadedContacts.push('');
    setFormData({
      ...card, _id: undefined,
      carModel: originalModel, customerName: extractedName, customerPrefix: extractedPrefix,
      jobCardDate: defaultDateTime,
      customerContact: loadedContacts.length > 0 ? loadedContacts[0] : '',
      customerContacts: loadedContacts, companyName: card.companyName || '',
      customerVoice: card.customerVoice?.length > 0 ? [...card.customerVoice.map(v => typeof v === 'object' ? (v.text || '') : (v || '')), ''] : [''],
      status: 'Inspection', quoteDone: false, approvalDone: false,
      receiveDate: defaultDateTime, deliveryDate: defaultDateTime, reminderTime: '',
      inspectionTech: card.inspectionTech || '', jobDoneBy: card.jobDoneBy || '',
      invoiceNo: '', invoiceAmount: '', paidAmount: '', paymentStatus: 'Pending', laborCharges: '',
      rearImage: parseImagesToArray(card.rearImage).filter(img => img && String(img).trim() !== ''),
      vinImage:  parseImagesToArray(card.vinImage).filter(img => img && String(img).trim() !== ''),
      odoImage:  [],
      inspectionPhotos: parseImagesToArray(card.inspectionPhotos).filter(img => img && String(img).trim() !== ''),
      todos: [],
    });
    const loadedSelections = {}; const loadedCustomParts = [];
    const allKnownItems = dbPartsCatalog.flatMap(g => [...(g.items || []), ...g.subGroups.flatMap(sg => sg.items)]);
    (card.inspectionDetails || []).forEach(p => { const dec = decodePart(p); if (!dec.name.trim()) return; if (allKnownItems.includes(dec.name)) loadedSelections[dec.name] = true; else loadedCustomParts.push(dec.name); });
    loadedCustomParts.push(''); setPartSelections(loadedSelections); setCustomParts(loadedCustomParts); setPartStatuses({}); setQuickVoice({ engineOil: false, completeCheckup: false }); setFormTab('info'); setSelectedCard(null); setShowForm(true);
  };

  const handleDelete = (id) => { Alert.alert("Delete", "Are you sure you want to delete this Job Card?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await axios.delete(`${API_URL}/${id}`); setSelectedCard(null); setPage(1); fetchJobCards(1, ''); } }]); };

  const resetForm = () => {
    setIsEditing(false); setEditId(null); setFormTab('info'); setPartSelections({}); setCustomParts(['']); setPartStatuses({}); setQuickVoice({ engineOil: false, completeCheckup: false }); setActiveNavGroup(null); setActiveNavSubGroup(null);
    setFormData({ jobCardDate: defaultDateTime, customerPrefix: 'Mr.', plateNumber: '', carModel: '', companyName: '', customerName: '', customerContact: '', customerContacts: [''], jobCardNo: '', vin: '', odoKM: '', carNotStart: false, quoteDone: false, approvalDone: false, receiveDate: defaultDateTime, deliveryDate: defaultDateTime, reminderTime: '', customerVoice: [''], inspectionTech: '', jobDoneBy: '', located: 'Main Body Shop', invoiceNo: '', invoiceAmount: '', paidAmount: '', paymentStatus: 'Pending', laborCharges: '', rearImage: [], vinImage: [], odoImage: [], inspectionPhotos: [], status: 'Inspection' });
  };

  const toggleCatalogPart       = (partString) => setPartSelections(prev => ({ ...prev, [partString]: !prev[partString] }));
  const updateDynamicList       = (listName, index, value) => { let newList = [...formData[listName]]; newList[index] = value; if (index === newList.length - 1 && value !== '') newList.push(''); setFormData({ ...formData, [listName]: newList }); };
  const updateDynamicCustomPart = (index, value) => { let newList = [...customParts]; newList[index] = value; if (index === newList.length - 1 && value !== '') newList.push(''); setCustomParts(newList); };
  const removeCustomPart        = (index) => { let newList = [...customParts]; newList.splice(index, 1); if (newList.length === 0) newList.push(''); setCustomParts(newList); };

  const captureOrPickImage = async (field, source) => {
    try {
      let result;
      if (source === 'camera') { await ImagePicker.requestCameraPermissionsAsync(); result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.3 }); }
      else { await ImagePicker.requestMediaLibraryPermissionsAsync(); result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.3 }); }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const localUri = result.assets[0].uri; const filename = localUri.split('/').pop(); const type = `image/${filename.split('.').pop()}`;
        const imageForm = new FormData(); imageForm.append('image', { uri: localUri, name: filename, type });
        const res = await axios.post(`${API_BASE}/upload`, imageForm, { headers: { 'Content-Type': 'multipart/form-data' } });
        setFormData(prev => ({ ...prev, [field]: [...prev[field], res.data.imageUrl] }));
        setLoading(false);
      }
    } catch (error) { Alert.alert("Error", "Failed to upload."); setLoading(false); }
  };
  const removeImage = (field, indexToRemove) => { const updatedArray = [...formData[field]]; updatedArray.splice(indexToRemove, 1); setFormData(prev => ({ ...prev, [field]: updatedArray })); };

  const renderNewImageSection = (label, fieldName) => (
    <View style={S.newImageSectionContainer}>
      <Text style={S.formInputLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={S.newImageActionBtn} onPress={() => captureOrPickImage(fieldName, 'camera')}><Text style={{ fontSize: 13 }}>📷 Camera</Text></TouchableOpacity>
        <TouchableOpacity style={S.newImageActionBtn} onPress={() => captureOrPickImage(fieldName, 'gallery')}><Text style={{ fontSize: 13 }}>🖼️ Gallery</Text></TouchableOpacity>
      </View>
      {formData[fieldName] && formData[fieldName].length > 0 && (
        <ScrollView horizontal style={{ marginTop: 14 }} showsHorizontalScrollIndicator={false}>
          {formData[fieldName].map((img, idx) => (
            <View key={idx} style={{ marginRight: 12 }}>
              <TouchableOpacity onPress={() => setFullScreenImg(img)}><ExpoImage source={{ uri: img }} style={S.newPreviewImage} contentFit="cover" /></TouchableOpacity>
              <TouchableOpacity style={S.newRemoveImageBtn} onPress={() => removeImage(fieldName, idx)}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>✕ Remove</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const openContactList = async () => {
    try {
      setLoadingContacts(true); const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert("Permission Required", "Please allow Contacts access."); setLoadingContacts(false); return; }
      setShowContactModal(true); const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers], pageSize: 3000 });
      if (data && data.length > 0) { const validContacts = data.filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0); setAllContacts(validContacts); setFilteredContacts(validContacts); }
      else { setAllContacts([]); setFilteredContacts([]); }
    } catch (err) { Alert.alert("Notice", "Could not load contacts properly."); } finally { setLoadingContacts(false); }
  };
  const handleContactSearch = (text) => { setContactSearchQuery(text); if (!text.trim()) { setFilteredContacts(allContacts); return; } const filtered = allContacts.filter(c => String(c.name || '').toLowerCase().includes(String(text).toLowerCase()) || (c.phoneNumbers && c.phoneNumbers.some(p => String(p.number || '').includes(text)))); setFilteredContacts(filtered); };
  const selectContact = (chosen) => { let phone = ''; if (chosen.phoneNumbers && chosen.phoneNumbers.length > 0) phone = chosen.phoneNumbers[0].number; const formattedPhone = phone ? String(phone).replace(/\s+/g, '') : ''; let newContacts = [...formData.customerContacts]; let emptyIdx = newContacts.findIndex(c => c === ''); if (emptyIdx !== -1) newContacts[emptyIdx] = formattedPhone; else newContacts.push(formattedPhone); if (newContacts[newContacts.length - 1] !== '') newContacts.push(''); setFormData(prev => ({ ...prev, customerName: chosen.name, customerContacts: newContacts, customerContact: formattedPhone })); setShowContactModal(false); setContactSearchQuery(''); };

  const printInspectionReportPDF = async (card) => {
    try {
      setLoading(true);
      const partsListHtml = (card.inspectionDetails || []).map(p => { const dec = decodePart(p); return `<li style="padding:6px 0;border-bottom:1px solid #eee;color:${dec.received ? '#27ae60' : '#333'}">${dec.received ? '✓' : '✗'} ${dec.name}</li>`; }).join('');
      const rearImg = parseImagesToArray(card.rearImage)[0]; const vinImg = parseImagesToArray(card.vinImage)[0]; const odoImg = parseImagesToArray(card.odoImage)[0];
      let topImagesHtml = '';
      if (rearImg || vinImg || odoImg) { topImagesHtml = `<div style="display:flex;justify-content:space-between;margin-bottom:20px;">${rearImg ? `<img src="${rearImg}" style="width:32%;height:160px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"/>` : '<div style="width:32%;"></div>'}${vinImg ? `<img src="${vinImg}" style="width:32%;height:160px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"/>` : '<div style="width:32%;"></div>'}${odoImg ? `<img src="${odoImg}" style="width:32%;height:160px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"/>` : '<div style="width:32%;"></div>'}</div>`; }
      const photoBlocksHtml = parseImagesToArray(card.inspectionPhotos).map(img => `<img src="${img}" style="width:31%;margin:1%;height:150px;object-fit:cover;border-radius:6px;border:1px solid #ddd;"/>`).join('');
      const htmlContent = `<html><body style="font-family:Arial,sans-serif;padding:25px;color:#333;"><div style="text-align:center;border-bottom:3px solid #16a34a;padding-bottom:15px;margin-bottom:20px;"><h1 style="margin:0;color:#0B0E14;">VISCO BODY SHOP</h1><p style="margin:5px 0;color:#7f8c8d;font-weight:bold;">DIGITAL WORKSHOP INSPECTION REPORT</p></div>${topImagesHtml}<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><h3 style="margin-top:0;border-bottom:1px solid #ddd;padding-bottom:5px;">Vehicle Details</h3><p><b>Plate Number:</b> ${card.plateNumber}</p><p><b>Vehicle Model:</b> ${getCleanModelText(card.carModel)}</p><p><b>Job Card No:</b> ${card.jobCardNo || 'N/A'}</p><p><b>Customer Name:</b> ${getCustomerNameOnly(card.carModel) || 'Valued Client'}</p><p><b>Inspection Tech:</b> ${card.inspectionTech || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Job Done By:</b> ${card.jobDoneBy || 'N/A'}</p></div><div style="margin-top:25px;"><h3 style="border-bottom:1px solid #ddd;padding-bottom:5px;color:#e74c3c;">Defects & Required Parts</h3><ul>${partsListHtml || '<li>General checkup</li>'}</ul></div>${photoBlocksHtml ? `<div style="margin-top:25px;"><h3 style="border-bottom:1px solid #ddd;padding-bottom:5px;">Inspection Media</h3><div style="display:flex;flex-wrap:wrap;">${photoBlocksHtml}</div></div>` : ''}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch(e) { Alert.alert("Error", "Failed to generate report"); } finally { setLoading(false); }
  };

  const requestPricingWhatsApp = (card) => { const parts = (card.inspectionDetails || []).map(p => decodePart(p)).filter(d => d.name).map(d => `- ${d.name}`).join('\n'); const msg = `*Visco Body Shop - Parts Inquiry*\nVehicle: ${getCleanModelText(card.carModel)}\nVIN: ${card.vin || 'N/A'}\n\n*Required Parts for Pricing:*\n${parts || 'No specific parts listed.'}`; Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert("Error", "WhatsApp is not installed.")); };
  const printPDF = async (type) => {
    try {
      setShowPrintModal(false);
      setLoading(true);
      // Fetch all active job cards (up to 500)
      const res = await axios.get(`${API_URL}?page=1&limit=500`);
      const activeCards = res.data.filter(c => !INACTIVE_STATUSES.includes(c.status));
      const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      let bodyHtml = '';
      if (type === 'table') {
        const rows = activeCards.map((card, i) => {
          const statusColor = getStatusColor(card.status) || '#f59e0b';
          const date = formatSafeDate(card.receiveDate || card.jobCardDate);
          const model = getCleanModelText(card.carModel);
          // Short customer name: prefix + first word only (e.g. "Mr. Zuhaib")
          const fullName = getCustomerNameOnly(card.carModel) || '';
          const shortName = fullName ? fullName.split(' ').slice(0, 2).join(' ') : '-';
          return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f7ff'}">
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;color:#888">${i + 1}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px">${model}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-weight:800;font-size:12px;letter-spacing:0.3px">${card.plateNumber}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px">${shortName}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;font-weight:700;color:${statusColor}">${card.status}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f0fdf4;font-size:11px;color:#555">${date}</td>
          </tr>`;
        }).join('');
        bodyHtml = `<table style="width:100%;border-collapse:collapse">
          <tr style="background:#16a34a;color:#fff">
            <th style="padding:9px 8px;text-align:left;font-size:11px">#</th>
            <th style="padding:9px 8px;text-align:left;font-size:11px">Model</th>
            <th style="padding:9px 8px;text-align:left;font-size:11px">Plate No</th>
            <th style="padding:9px 8px;text-align:left;font-size:11px">Customer</th>
            <th style="padding:9px 8px;text-align:left;font-size:11px">Status</th>
            <th style="padding:9px 8px;text-align:left;font-size:11px">Date</th>
          </tr>${rows}</table>`;
      } else {
        // Grid style — color-coded cards, no images (keeps PDF small and fast)
        const cells = activeCards.map(card => {
          const statusColor = getStatusColor(card.status) || '#f59e0b';
          const date = formatSafeDate(card.receiveDate || card.jobCardDate);
          const model = getCleanModelText(card.carModel);
          const fullName = getCustomerNameOnly(card.carModel) || '';
          const shortName = fullName ? fullName.split(' ').slice(0, 2).join(' ') : '-';
          return `<div style="width:21%;margin:1%;display:inline-block;vertical-align:top;border:1.5px solid ${statusColor};border-radius:8px;overflow:hidden;background:#fff;page-break-inside:avoid">
            <div style="background:${statusColor};padding:5px 8px">
              <div style="color:#fff;font-size:9px;font-weight:700">${card.status}</div>
            </div>
            <div style="padding:7px 8px 9px;min-height:70px">
              <div style="font-size:11px;font-weight:800;color:#14532d;letter-spacing:0.4px">${card.plateNumber}</div>
              <div style="font-size:9px;color:#16a34a;font-weight:600;margin-top:3px">${model}</div>
              <div style="font-size:9px;color:#444;margin-top:3px">${shortName}</div>
              <div style="font-size:8px;color:#999;margin-top:4px">${date}</div>
            </div>
          </div>`;
        }).join('');
        bodyHtml = `<div style="text-align:left;line-height:0">${cells}</div>`;
      }

      const html = `<html><body style="font-family:Arial,sans-serif;padding:20px;color:#333">
        <div style="text-align:center;border-bottom:3px solid #16a34a;padding-bottom:14px;margin-bottom:18px">
          <h2 style="margin:0;color:#14532d;font-size:20px">VISCO BODY SHOP</h2>
          <p style="color:#16a34a;margin:4px 0;font-weight:700;font-size:13px">ACTIVE JOB CARDS REPORT</p>
          <p style="color:#999;font-size:11px;margin:2px 0">Generated: ${now} &nbsp;|&nbsp; Total Active: ${activeCards.length}</p>
        </div>
        ${bodyHtml}
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch(e) {
      Alert.alert("Error", "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCalcPress = (val) => { if (val === 'C') { setCalcInput(''); } else if (val === 'DEL') { setCalcInput(prev => prev.slice(0, -1)); } else if (val === '=') { try { setCalcInput(String(new Function('return ' + calcInput.replace(/×/g, '*').replace(/÷/g, '/'))())); } catch (e) { setCalcInput('Error'); } } else { if (calcInput === 'Error') { setCalcInput(val); return; } setCalcInput(prev => prev + val); } };
  const CalcButton = ({ title, color = '#333', bg }) => { const bgColor = bg || (isDark ? '#1e2433' : '#f1f2f6'); return (<TouchableOpacity style={[S.calcBtn, { backgroundColor: bgColor }]} onPress={() => handleCalcPress(title)}><Text style={[S.calcBtnText, { color }]}>{title}</Text></TouchableOpacity>); };

  const saveImageToGallery   = async (uri) => { try { const { status } = await MediaLibrary.requestPermissionsAsync(); if (status !== 'granted') return Alert.alert("Permission denied", "Need gallery access to save."); let localUri = uri; if (uri.startsWith('http')) { const downloadRes = await FileSystem.downloadAsync(uri, FileSystem.cacheDirectory + 'temp_img.jpg'); localUri = downloadRes.uri; } await MediaLibrary.saveToLibraryAsync(localUri); Alert.alert("Success", "Image saved to gallery!"); } catch(e) { Alert.alert("Error", "Failed to save image."); } };
  const shareImageToWhatsApp = async (uri) => { try { let localUri = uri; if (uri.startsWith('http')) { const downloadRes = await FileSystem.downloadAsync(uri, FileSystem.cacheDirectory + 'share_img.jpg'); localUri = downloadRes.uri; } await Sharing.shareAsync(localUri, { dialogTitle: 'Share Image' }); } catch(e) { Alert.alert("Error", "Failed to share image."); } };
  const formatSafeDate = (d) => { if (!d) return '-'; if (typeof d === 'number' || !isNaN(Number(d))) return new Date(Number(d)).toISOString().split('T')[0]; return String(d).split('T')[0].split(' ')[0]; };

  // ── Derived counts ──────────────────────────────────────────────
  const activeCount  = jobCards.filter(c => !INACTIVE_STATUSES.includes(c.status)).length;
  // todoCount uses allTodoCards when loaded (all todos from backend), else falls back to loaded cards
  const todoCount    = allTodoCards.length > 0
    ? allTodoCards.length
    : jobCards.filter(c => (c.todos || []).some(t => !t.completed)).length;
  const todoCards    = allTodoCards.length > 0 ? allTodoCards : jobCards.filter(c => (c.todos || []).some(t => !t.completed));

  // ── #6 Sort — Active (newest first) → Inactive+Todos → Inactive (no todos) ──
  const getSortDate = (c) => {
    // receiveDate is the business date staff edits — must match backend sort. Falls back to createdAt.
    const d = c.receiveDate || c.jobCardDate || c.createdAt;
    if (!d) return 0;
    // Fix: "YYYY-MM-DD HH:mm" format Android eke parse karanne nehe — space T ekata change karanawa
    const normalized = String(d).replace(' ', 'T');
    const t = new Date(normalized).getTime();
    return isNaN(t) ? 0 : t;
  };
  const hasOpenTodos = (c) => (c.todos || []).some(t => !t.completed);

  const sortedJobCards = [...jobCards].sort((a, b) => {
    // ✅ Pinned card always first — new/clone karapu eka top ekata
    if (pinnedCardId && String(a._id) === String(pinnedCardId)) return -1;
    if (pinnedCardId && String(b._id) === String(pinnedCardId)) return 1;

    const aInactive = INACTIVE_STATUSES.includes(a.status);
    const bInactive = INACTIVE_STATUSES.includes(b.status);

    const aGroup = !aInactive ? 0 : (hasOpenTodos(a) ? 1 : 2);
    const bGroup = !bInactive ? 0 : (hasOpenTodos(b) ? 1 : 2);

    if (aGroup !== bGroup) return aGroup - bGroup;
    return getSortDate(b) - getSortDate(a);
  });

  if (authChecking) return (<View style={{ flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#16a34a" /></View>);
  if (!currentUser) return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={S.container} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0B0E14" : "#ffffff"} />

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <Animated.View style={[S.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={S.sidebarHeader}>
              <Image source={currentUser?.profileImage ? { uri: currentUser?.profileImage } : require('./assets/logo.png')} style={S.sidebarAvatar} />
              <Text style={S.sidebarName}>{currentUser?.name}</Text>
              <Text style={S.sidebarRole}>{currentUser?.role}</Text>
            </View>
            <View style={S.sidebarMenu}>
              <TouchableOpacity style={[S.sidebarLink, currentScreen === 'home'     && S.sidebarLinkActive]} onPress={() => navigateTo('home')}><Text style={[S.sidebarLinkText, currentScreen === 'home'     && { color: C.accent }]}>🏠  Dashboard</Text></TouchableOpacity>
              {currentUser?.role !== 'Owner' && <TouchableOpacity style={[S.sidebarLink, currentScreen === 'settings' && S.sidebarLinkActive]} onPress={() => navigateTo('settings')}><Text style={[S.sidebarLinkText, currentScreen === 'settings' && { color: C.accent }]}>⚙️  Profile Settings</Text></TouchableOpacity>}
              {currentUser?.role === 'Admin' && <TouchableOpacity style={[S.sidebarLink, currentScreen === 'finance' && S.sidebarLinkActive]} onPress={() => navigateTo('finance')}><Text style={[S.sidebarLinkText, currentScreen === 'finance' && { color: C.accent }]}>💵  Finance Report</Text></TouchableOpacity>}
              {currentUser?.role === 'Admin' && <TouchableOpacity style={[S.sidebarLink, currentScreen === 'reports' && S.sidebarLinkActive]} onPress={() => navigateTo('reports')}><Text style={[S.sidebarLinkText, currentScreen === 'reports' && { color: C.accent }]}>📊  Earnings Report</Text></TouchableOpacity>}
              {currentUser?.role !== 'Owner' && todoCount > 0 && <TouchableOpacity style={[S.sidebarLink, currentScreen === 'todos' && S.sidebarLinkActive]} onPress={() => navigateTo('todos')}><Text style={[S.sidebarLinkText, currentScreen === 'todos' && { color: C.accent }]}>📋  To-Do's <Text style={{ color: C.accent, fontWeight: '900' }}>({todoCount})</Text></Text></TouchableOpacity>}
              {currentUser?.role === 'Admin' && <TouchableOpacity style={[S.sidebarLink, currentScreen === 'admin' && S.sidebarLinkActive]} onPress={() => navigateTo('admin')}><Text style={[S.sidebarLinkText, currentScreen === 'admin' && { color: C.accent }]}>🛡️  Admin Control</Text></TouchableOpacity>}
            </View>
            <TouchableOpacity style={S.sidebarLogoutBtn} onPress={handleLogout}><Text style={{ color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>🚪  LOGOUT</Text></TouchableOpacity>
          </SafeAreaView>
        </Animated.View>

        {isSidebarOpen && <TouchableOpacity style={S.sidebarOverlay} activeOpacity={1} onPress={toggleSidebar} />}

        {/* ── HEADER ──────────────────────────────────────── */}
        <View style={S.header}>
          {!isSearchOpen ? (
            <View style={S.headerContentWrapper}>
              <TouchableOpacity onPress={toggleSidebar} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Image source={require('./assets/logo.png')} style={S.logoImage} />
                <View style={S.headerTextWrapper}>
                  <Text style={S.headerTitleMain} numberOfLines={1}>VISCO BODY SHOP</Text>
                  <Text style={S.headerTitleSub}>Digital ERP  •  <Text style={{ color: C.accent }}>{formattedDateString}</Text></Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[S.slidingSearchContainer, { width: searchAnim, backgroundColor: isDark ? '#13161f' : '#ffffff' }]}>
              <TextInput
                style={[S.searchBarInput, { color: isDark ? '#f1f5f9' : '#0f172a' }]}
                placeholder="Search plate, model, status..."
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </Animated.View>
          )}
        </View>

        {/* ── FINANCE BANNER — clickable ───────────────────── */}
        {currentScreen === 'home' && currentUser?.role === 'Admin' && (
          <TouchableOpacity onPress={() => setCurrentScreen('finance')} activeOpacity={0.8}>
            <View style={S.financeBannerBox}>
              <View>
                <Text style={S.financeBannerTitle}>TOTAL OUTSTANDING BALANCE</Text>
                <Text style={S.financeBannerSub}>{financeSummary.unpaidCount} Pending Vehicles  •  Tap to view details</Text>
              </View>
              <Text style={S.financeBannerAmount}>AED {financeSummary.totalOutstanding || 0}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── SCREEN ROUTING ──────────────────────────────── */}
        {currentScreen === 'finance' ? (
          <FinanceScreen
            onBack={() => setCurrentScreen('home')}
            isDark={isDark}
            onCardPress={(card) => { setCurrentScreen('home'); setTimeout(() => setSelectedCard(card), 300); }}
          />
        ) : currentScreen === 'reports' ? (
          <ReportsScreen
            onBack={() => setCurrentScreen('home')}
            isDark={isDark}
            onCardPress={(card) => { setCurrentScreen('home'); setTimeout(() => setSelectedCard(card), 300); }}
          />
        ) : currentScreen === 'todos' ? (
          <TodoScreen
            todoCards={todoCards}
            onBack={() => setCurrentScreen('home')}
            isDark={isDark}
            onCardPress={(card) => { setCurrentScreen('home'); setTimeout(() => setSelectedCard(card), 300); }}
          />
        ) : currentScreen === 'admin' ? (
          <AdminScreen adminPartTab={adminPartTab} setAdminPartTab={setAdminPartTab} usersList={usersList} openNewUserModal={openNewUserModal} openEditUserModal={openEditUserModal} handleDeleteUser={handleDeleteUser} toggleUserActive={toggleUserActive} dbPartsCatalog={dbPartsCatalog} newGroupName={newGroupName} setNewGroupName={setNewGroupName} handleAddGroup={handleAddGroup} selectedAdminGroupId={selectedAdminGroupId} setSelectedAdminGroupId={setSelectedAdminGroupId} newItemName={newItemName} setNewItemName={setNewItemName} handleAddItem={handleAddItem} handleDeleteGroup={handleDeleteGroup} handleDeleteItem={handleDeleteItem} />
        ) : currentScreen === 'settings' ? (
          <SettingsScreen currentUser={currentUser} setCurrentUser={setCurrentUser} newPassword={newPassword} setNewPassword={setNewPassword} changeProfilePic={changeProfilePic} handleProfileUpdate={handleProfileUpdate} />
        ) : (
          loading && !refreshing && jobCards.length === 0 ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              style={{ backgroundColor: isDark ? '#0f1117' : '#f0fdf4' }}
              data={sortedJobCards}
              keyExtractor={(item) => String(item._id)}
              numColumns={3}
              columnWrapperStyle={S.rowWrapper}
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH }}>
                  <JobCardItem item={item} onPress={setSelectedCard} isDark={isDark} />
                </View>
              )}
              contentContainerStyle={S.flatListPadding}
            />
          )
        )}

        {/* ── FAB BUTTONS ─────────────────────────────────── */}
        {currentScreen === 'home' && (
          <View style={S.floatingActionGroup}>
            {currentUser?.role !== 'Owner' && <AnimatedIconBtn icon="🧮" onPress={() => setShowCalc(true)}       isDark={isDark} />}
            {currentUser?.role !== 'Owner' && <AnimatedIconBtn icon="🖨️" onPress={() => setShowPrintModal(true)} isDark={isDark} />}
            <AnimatedIconBtn icon="🔍" onPress={toggleSearch} isDark={isDark} />
            {hasPerm('canCreateCard') && <AddFabButton onPress={() => { resetForm(); setShowForm(true); }} isDark={isDark} />}
          </View>
        )}

        {/* ── BOTTOM BANNER ───────────────────────────────── */}
        {currentScreen === 'home' && (
          <View style={S.bottomBannerFixed}>
            <Text style={S.bottomBannerText}>
              🚗 Active: <Text style={{ color: '#fbbf24', fontWeight: '800' }}>{totalActiveCount || activeCount}</Text>
            </Text>
            {currentUser?.role !== 'Owner' && todoCount > 0 && (
              <TouchableOpacity onPress={() => setCurrentScreen('todos')}>
                <Text style={S.bottomBannerText}>
                  📋 <Text style={{ color: '#16a34a', fontWeight: '800' }}>{todoCount}</Text> todos
                </Text>
              </TouchableOpacity>
            )}
            <Text style={S.bottomBannerText}>
              by <Text style={{ color: '#fbbf24', fontWeight: '800' }}>EC</Text>
            </Text>
          </View>
        )}

        {/* ── MODALS ──────────────────────────────────────── */}
        <JobCardDetailModal selectedCard={selectedCard} setSelectedCard={setSelectedCard} currentUser={currentUser} hasPerm={hasPerm} onClose={() => setSelectedCard(null)} handleEdit={handleEdit} handleClone={handleClone} handleDelete={handleDelete} handleSaveFinanceAmount={handleSaveFinanceAmount} setDropdownMode={setDropdownMode} setShowStatusDropdown={setShowStatusDropdown} printInspectionReportPDF={printInspectionReportPDF} requestPricingWhatsApp={requestPricingWhatsApp} setFullScreenImg={setFullScreenImg} handleTogglePartReceived={handleTogglePartReceived} formatSafeDate={formatSafeDate} initiateDirectReminderUpdate={initiateDirectReminderUpdate} handleToggleVoiceCompleted={handleToggleVoiceCompleted} isDark={isDark} />

        <JobCardFormModal showForm={showForm} setShowForm={setShowForm} isEditing={isEditing} handleSave={handleSave} loading={loading} formTab={formTab} setFormTab={setFormTab} formData={formData} setFormData={setFormData} setDropdownMode={setDropdownMode} setShowStatusDropdown={setShowStatusDropdown} showJobCardDatePicker={showJobCardDatePicker} setShowJobCardDatePicker={setShowJobCardDatePicker} showDeliveryDatePicker={showDeliveryDatePicker} setShowDeliveryDatePicker={setShowDeliveryDatePicker} tempDateObj={tempDateObj} setTempDateObj={setTempDateObj} showReminderDatePicker={showReminderDatePicker} setShowReminderDatePicker={setShowReminderDatePicker} showReminderTimePicker={showReminderTimePicker} setShowReminderTimePicker={setShowReminderTimePicker} renderImageSection={renderNewImageSection} openContactList={openContactList} quickVoice={quickVoice} setQuickVoice={setQuickVoice} updateDynamicList={updateDynamicList} activeNavGroup={activeNavGroup} setActiveNavGroup={setActiveNavGroup} activeNavSubGroup={activeNavSubGroup} setActiveNavSubGroup={setActiveNavSubGroup} dbPartsCatalog={dbPartsCatalog} partSelections={partSelections} toggleCatalogPart={toggleCatalogPart} customParts={customParts} updateDynamicCustomPart={updateDynamicCustomPart} removeCustomPart={removeCustomPart} usersList={usersList} isDark={isDark} />

        {showDirectReminderDatePicker && (<DateTimePicker value={tempDateObj} mode="date" display="default" onChange={(e, d) => { setShowDirectReminderDatePicker(false); if (d) { setTempDateObj(d); setShowDirectReminderTimePicker(true); } }} />)}
        {showDirectReminderTimePicker && (<DateTimePicker value={tempDateObj} mode="time" display="default" onChange={async (e, t) => { setShowDirectReminderTimePicker(false); if (t && directReminderCard) { const fd = new Date(tempDateObj); fd.setHours(t.getHours()); fd.setMinutes(t.getMinutes()); const os = fd.getTimezoneOffset() * 60000; const newTime = (new Date(fd - os)).toISOString().slice(0, -1).replace('T', ' ').substring(0, 16); const updatedCard = { ...directReminderCard, reminderTime: newTime }; setSelectedCard(updatedCard); setJobCards(prev => prev.map(c => c._id === updatedCard._id ? updatedCard : c)); try { await axios.put(`${API_URL}/${updatedCard._id}`, { reminderTime: newTime }); } catch(err) {} } }} />)}

        <Modal visible={showStatusDropdown} transparent animationType="fade" onRequestClose={() => setShowStatusDropdown(false)}>
          <View style={S.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowStatusDropdown(false)} />
            <View style={S.dropdownModalBox}>
              <ScrollView>
                {STATUS_OPTIONS.map(status => (
                  <TouchableOpacity key={status} style={S.statusOptionRow} onPress={() => { if (dropdownMode === 'form') { setFormData({ ...formData, status }); } else if (dropdownMode === 'detail' && selectedCard) { handleUpdateStatusFromDetail(selectedCard, status); } setShowStatusDropdown(false); }}>
                    <View style={[S.statusColorDot, { backgroundColor: getStatusColor(status) }]} />
                    <Text style={S.statusOptionText}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={showUserModal} animationType="slide" onRequestClose={() => setShowUserModal(false)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0E14' : '#f4f7f8' }} edges={['top', 'left', 'right']}>
              <View style={S.modalHeader}>
                <Text style={S.modalTitle}>{editingUserId ? 'Edit Staff Account' : 'Register New Staff'}</Text>
                <TouchableOpacity style={S.largeCloseBtn} onPress={() => { setShowUserModal(false); resetUserModal(); }}><Text style={S.largeCloseText}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 20 }}>
                <Text style={S.formInputLabel}>Full Name</Text><TextInput style={S.input} value={newUser.name} onChangeText={(v) => setNewUser({ ...newUser, name: v })} />
                <Text style={S.formInputLabel}>Username (Login ID)</Text><TextInput style={S.input} autoCapitalize="none" value={newUser.username} onChangeText={(v) => setNewUser({ ...newUser, username: v.replace(/\s/g, '') })} />
                <Text style={S.formInputLabel}>{editingUserId ? 'New Password (leave blank to keep current)' : 'Initial Password'}</Text>
                <TextInput style={S.input} secureTextEntry value={newUser.password} onChangeText={(v) => setNewUser({ ...newUser, password: v })} />
                <Text style={S.formInputLabel}>User Role</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10, flexWrap: 'wrap' }}>
                  {['Admin', 'Owner', 'Technician', 'User'].map(r => (
                    <TouchableOpacity key={r} style={[S.tabBtn, newUser.role === r && S.tabBtnActive, { borderWidth: 1, borderColor: isDark ? '#374151' : '#ddd' }]} onPress={() => setNewUser({ ...newUser, role: r })}>
                      <Text style={{ fontWeight: '700', color: newUser.role === r ? '#16a34a' : (isDark ? '#94a3b8' : '#555') }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[S.saveBtn, { marginTop: 30 }]} onPress={handleCreateUser}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{editingUserId ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}</Text></TouchableOpacity>
                {editingUserId && (
                  <TouchableOpacity style={{ marginTop: 14, padding: 14, alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8 }} onPress={() => { const u = usersList.find(u => u._id === editingUserId); setShowUserModal(false); handleDeleteUser(u); }}>
                    <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 13 }}>🗑️ DELETE THIS ACCOUNT</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 50 }} />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showPrintModal} transparent animationType="fade" onRequestClose={() => setShowPrintModal(false)}>
          <View style={S.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPrintModal(false)} />
            <View style={[S.dropdownModalBox, { padding: 28 }]}>
              <Text style={{ fontWeight: '800', fontSize: 17, marginBottom: 18, textAlign: 'center', color: isDark ? '#f1f5f9' : '#000' }}>Print Active Schedules</Text>
              <TouchableOpacity style={S.printOptionBtn} onPress={() => printPDF('grid')}><Text style={{ fontSize: 22, marginRight: 14 }}>🖼️</Text><Text style={S.printOptionTitle}>Grid View Report</Text></TouchableOpacity>
              <TouchableOpacity style={S.printOptionBtn} onPress={() => printPDF('table')}><Text style={{ fontSize: 22, marginRight: 14 }}>📊</Text><Text style={S.printOptionTitle}>Active Jobs Report</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showCalc} transparent animationType="slide" onRequestClose={() => setShowCalc(false)}>
          <View style={S.calcOverlay}>
            <View style={S.calcBox}>
              <TextInput style={S.calcInputDisplay} value={calcInput} editable={false} />
              <View style={S.calcRow}><CalcButton title="C" color="#ef4444" /><CalcButton title="DEL" color="#ef4444" /><CalcButton title="%" color="#3b82f6" /><CalcButton title="÷" color="#3b82f6" /></View>
              <View style={S.calcRow}><CalcButton title="7" /><CalcButton title="8" /><CalcButton title="9" /><CalcButton title="×" color="#3b82f6" /></View>
              <View style={S.calcRow}><CalcButton title="4" /><CalcButton title="5" /><CalcButton title="6" /><CalcButton title="-" color="#3b82f6" /></View>
              <View style={S.calcRow}><CalcButton title="1" /><CalcButton title="2" /><CalcButton title="3" /><CalcButton title="+" color="#3b82f6" /></View>
              <View style={S.calcRow}><CalcButton title="00" /><CalcButton title="0" /><CalcButton title="." /><CalcButton title="=" color="#fff" bg="#000" /></View>
            </View>
          </View>
        </Modal>

        <Modal visible={showContactModal} animationType="slide" onRequestClose={() => setShowContactModal(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B0E14' : '#fff' }} edges={['top', 'left', 'right']}>
            <View style={S.contactSearchWrapper}>
              <TextInput style={S.contactSearchInputField} placeholder="🔍 Search contacts..." placeholderTextColor="#90a4ae" value={contactSearchQuery} onChangeText={handleContactSearch} />
            </View>
            <FlatList data={filteredContacts} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => (
              <TouchableOpacity style={S.contactItemRow} onPress={() => selectContact(item)}>
                <View style={S.contactAvatarBox}><Text style={S.avatarLetter}>{item.name ? String(item.name)[0].toUpperCase() : '👤'}</Text></View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={S.contactMainName}>{String(item.name || '')}</Text>
                  <Text style={S.contactSubPhone}>{item.phoneNumbers?.[0]?.number || 'No number'}</Text>
                </View>
              </TouchableOpacity>
            )} />
          </SafeAreaView>
        </Modal>

        <Modal visible={!!fullScreenImg} transparent animationType="fade" onRequestClose={() => setFullScreenImg(null)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <ImageViewer imageUrls={fullScreenImg ? [{ url: fullScreenImg }] : []} enableSwipeDown onSwipeDown={() => setFullScreenImg(null)} onClick={() => setFullScreenImg(null)} renderIndicator={() => null} />
            <View style={{ position: 'absolute', bottom: 50, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 15, zIndex: 100 }}>
              <TouchableOpacity style={{ backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5, flexDirection: 'row', alignItems: 'center' }} onPress={() => shareImageToWhatsApp(fullScreenImg)}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>📲 Share</Text></TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#16a34a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5, flexDirection: 'row', alignItems: 'center' }} onPress={() => saveImageToGallery(fullScreenImg)}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>💾 Save</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const StyleSheet_unused = StyleSheet.create({});