// src/hooks/useAuth.js
// Authentication state + logic — login, logout, profile update, profile pic change.

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE } from '../utils/config';

export default function useAuth() {
  const [currentUser,  setCurrentUser]  = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => { checkLoginStatus(); }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('bodyshop_user');
      if (userData) setCurrentUser(JSON.parse(userData));
    } catch (e) {
      console.log('Auth check error:', e);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogout = (callback) => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('bodyshop_user');
          await AsyncStorage.removeItem('bodyshop_token');
          setCurrentUser(null);
          callback?.();
        },
      },
    ]);
  };

  const hasPerm = (perm) => {
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Owner') return true;
    return currentUser?.permissions?.[perm] === true;
  };

  const handleProfileUpdate = async (updateData) => {
    try {
      const payload = { ...updateData };
      if (!payload.password) delete payload.password;
      const res = await axios.put(`${API_BASE}/users/${currentUser?._id}`, payload);
      const updated = { ...currentUser, ...res.data };
      setCurrentUser(updated);
      await AsyncStorage.setItem('bodyshop_user', JSON.stringify(updated));
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const changeProfilePic = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Gallery access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5, aspect: [1, 1] });
    if (!result.canceled && result.assets.length > 0) {
      try {
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop();
        const type = `image/${filename.split('.').pop()}`;
        const imageForm = new FormData();
        imageForm.append('image', { uri: localUri, name: filename, type });
        const uploadRes = await axios.post(`${API_BASE}/upload`, imageForm, { headers: { 'Content-Type': 'multipart/form-data' } });
        await handleProfileUpdate({ profileImage: uploadRes.data.imageUrl });
      } catch (e) {
        Alert.alert('Error', 'Upload failed');
      }
    }
  };

  return {
    currentUser, setCurrentUser,
    authChecking,
    handleLogout, hasPerm,
    handleProfileUpdate, changeProfilePic,
  };
}