// src/hooks/useFinance.js
// Finance summary + parts catalog fetching.

import { useState } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';

export default function useFinance(currentUser) {
  const [financeSummary, setFinanceSummary] = useState({ totalOutstanding: 0, unpaidCount: 0 });
  const [dbPartsCatalog, setDbPartsCatalog] = useState([]);

  const fetchFinanceAndParts = async () => {
    try {
      const resParts = await axios.get(`${API_BASE}/parts`);
      setDbPartsCatalog(resParts.data);
      if (currentUser?.role === 'Admin' || currentUser?.role === 'Owner') {
        const resFinance = await axios.get(`${API_BASE}/finances/summary`);
        setFinanceSummary(resFinance.data);
      }
    } catch (e) {
      console.log('Finance/parts sync error:', e);
    }
  };

  const handleAddGroup = async (groupName, setGroupName) => {
    if (!groupName.trim()) return Alert.alert('Error', 'Enter Group Name');
    try {
      await axios.post(`${API_BASE}/parts`, { groupName: groupName.trim(), subGroups: [], items: [] });
      setGroupName('');
      await fetchFinanceAndParts();
      Alert.alert('Success', 'New Parts Group Created!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Group creation failed');
    }
  };

  const handleAddItem = async (groupId, itemName, setItemName, catalog) => {
    if (!groupId || !itemName.trim()) return Alert.alert('Error', 'Select a Group and enter Item Name');
    try {
      const group = catalog.find(g => g._id === groupId);
      const updatedItems = [...(group.items || []), itemName.trim()];
      await axios.put(`${API_BASE}/parts/${groupId}`, { items: updatedItems });
      setItemName('');
      await fetchFinanceAndParts();
      Alert.alert('Success', 'Item successfully added!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Item creation failed');
    }
  };

  const handleDeleteItem = async (groupId, itemIndex, catalog) => {
    try {
      const group = catalog.find(g => g._id === groupId);
      const updatedItems = [...(group.items || [])];
      updatedItems.splice(itemIndex, 1);
      await axios.put(`${API_BASE}/parts/${groupId}`, { items: updatedItems });
      await fetchFinanceAndParts();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Item deletion failed');
    }
  };

  const handleDeleteGroup = async (id) => {
    Alert.alert('Delete', 'Delete this entire group and all its parts?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await axios.delete(`${API_BASE}/parts/${id}`);
          await fetchFinanceAndParts();
        },
      },
    ]);
  };

  return {
    financeSummary, dbPartsCatalog,
    fetchFinanceAndParts,
    handleAddGroup, handleAddItem, handleDeleteItem, handleDeleteGroup,
  };
}