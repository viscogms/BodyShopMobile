// src/hooks/useJobCards.js
// Job card fetching, pagination, search, CRUD, status updates, reminders.

import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { API_BASE } from '../utils/config';
import { decodePart, encodePart, parseImagesToArray } from '../utils/helpers';
import { INACTIVE_STATUSES } from '../utils/constants';

const API_URL = `${API_BASE}/jobcards`;

export default function useJobCards() {
  const [jobCards,   setJobCards]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const searchTimeout = useRef(null);

  const fetchJobCards = async (pageNum = 1, query = '') => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await axios.get(`${API_URL}?page=${pageNum}&limit=15&search=${query}`);
      if (pageNum === 1) setJobCards(res.data);
      else {
        setJobCards(prev => {
          const existingIds = new Set(prev.map(c => c._id));
          return [...prev, ...res.data.filter(c => !existingIds.has(c._id))];
        });
      }
      setHasMore(res.data.length === 15);
    } catch (e) {
      console.log('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePullToRefresh = (searchQuery) => {
    setRefreshing(true);
    setPage(1);
    fetchJobCards(1, searchQuery);
  };

  const handleLoadMore = (searchQuery) => {
    if (hasMore && !loading && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchJobCards(nextPage, searchQuery);
    }
  };

  const handleDelete = (id, setSelectedCard) => {
    Alert.alert('Delete', 'Are you sure you want to delete this Job Card?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await axios.delete(`${API_URL}/${id}`);
          setSelectedCard(null);
          setPage(1);
          fetchJobCards(1, '');
        },
      },
    ]);
  };

  const handleUpdateStatus = async (card, newStatus, hasPerm, setSelectedCard) => {
    if (!hasPerm('canUpdateStatus')) return Alert.alert('Restricted', 'No permission to change status.');
    const updatedCard = { ...card, status: newStatus };
    setSelectedCard(updatedCard);
    setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c));
    try { await axios.put(`${API_URL}/${card._id}`, { status: newStatus }); }
    catch (e) { Alert.alert('Error', 'Failed to update status.'); }
  };

  const handleTogglePartReceived = async (card, idx, hasPerm, setSelectedCard) => {
    if (!hasPerm('canEditCard')) return Alert.alert('Restricted', 'No permission.');
    const updatedDetails = [...(card.inspectionDetails || [])];
    const dec = decodePart(updatedDetails[idx]);
    dec.received = !dec.received;
    updatedDetails[idx] = encodePart(dec.name, dec.received);
    const updatedCard = { ...card, inspectionDetails: updatedDetails };
    setSelectedCard(updatedCard);
    setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c));
    try { await axios.put(`${API_URL}/${card._id}`, { inspectionDetails: updatedDetails }); } catch (e) {}
  };

  const handleToggleVoiceCompleted = async (card, idx, hasPerm, setSelectedCard) => {
    if (!hasPerm('canEditCard')) return Alert.alert('Restricted', 'No permission.');
    const updatedVoices = [...(card.customerVoice || [])];
    let target = updatedVoices[idx];
    target = typeof target === 'string'
      ? { text: target, completed: true }
      : { ...target, completed: !target.completed };
    updatedVoices[idx] = target;
    const updatedCard = { ...card, customerVoice: updatedVoices };
    setSelectedCard(updatedCard);
    setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c));
    try { await axios.put(`${API_URL}/${card._id}`, { customerVoice: updatedVoices }); } catch (e) {}
  };

  const handleSaveFinance = async (card, invAmount, paidAmt, invNo, setSelectedCard, refreshFinance) => {
    const pStatus = Number(paidAmt) >= Number(invAmount) && Number(invAmount) > 0
      ? 'Paid' : (Number(paidAmt) > 0 ? 'Partial' : 'Pending');
    const updatedCard = { ...card, invoiceAmount: invAmount, paidAmount: paidAmt, invoiceNo: invNo, paymentStatus: pStatus };
    setSelectedCard(updatedCard);
    setJobCards(prev => prev.map(c => c._id === card._id ? updatedCard : c));
    try {
      await axios.put(`${API_URL}/${card._id}`, {
        invoiceAmount: Number(invAmount || 0),
        paidAmount: Number(paidAmt || 0),
        invoiceNo: invNo,
        paymentStatus: pStatus,
      });
      refreshFinance?.();
      Alert.alert('Success', 'Billing updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Billing save failed');
    }
  };

  // Derived data
  const activeCount = jobCards.filter(c => !INACTIVE_STATUSES.includes(c.status)).length;
  const todoCards   = jobCards.filter(c => (c.todos || []).some(t => !t.completed));
  const todoCount   = todoCards.length;

  const sortedJobCards = [...jobCards].sort((a, b) => {
    const getSortDate = (c) => {
      const d = c.receiveDate || c.jobCardDate || c.createdAt;
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };
    const hasOpenTodos = (c) => (c.todos || []).some(t => !t.completed);
    const aInactive = INACTIVE_STATUSES.includes(a.status);
    const bInactive = INACTIVE_STATUSES.includes(b.status);
    const aGroup = !aInactive ? 0 : (hasOpenTodos(a) ? 1 : 2);
    const bGroup = !bInactive ? 0 : (hasOpenTodos(b) ? 1 : 2);
    if (aGroup !== bGroup) return aGroup - bGroup;
    return getSortDate(b) - getSortDate(a);
  });

  return {
    jobCards, setJobCards,
    loading, refreshing,
    page, setPage, hasMore,
    fetchJobCards,
    handlePullToRefresh, handleLoadMore,
    handleDelete, handleUpdateStatus,
    handleTogglePartReceived, handleToggleVoiceCompleted,
    handleSaveFinance,
    activeCount, todoCards, todoCount, sortedJobCards,
  };
}