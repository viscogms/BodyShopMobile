import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StatusBar, Alert, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../utils/config';

export default function LoginScreen({ onLoginSuccess }) {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      return Alert.alert("Error", "Please enter username and password");
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: loginUsername.trim().toLowerCase(),
        password: loginPassword,
      });
      const { token, ...userData } = res.data;
      await AsyncStorage.setItem('bodyshop_user', JSON.stringify(userData));
      if (token) await AsyncStorage.setItem('bodyshop_token', token);
      onLoginSuccess(userData);
    } catch (e) {
      Alert.alert("Login Failed", e.response?.data?.error || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />
        <View style={styles.loginBox}>
          <Image source={require('../../assets/logo.png')} style={styles.loginLogo} />
          <Text style={styles.loginTitle}>VISCO BODY SHOP</Text>
          <Text style={styles.loginSub}>Body Shop ERP & Management System</Text>

          <TextInput
            style={styles.loginInput}
            placeholder="Username"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            autoCorrect={false}
            value={loginUsername}
            onChangeText={setLoginUsername}
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              value={loginPassword}
              onChangeText={setLoginPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginBtnText}>{loading ? 'CONNECTING...' : 'LOGIN TO SYSTEM'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loginContainer:  { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginBox:        { width: '100%', backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#f0fdf4' },
  loginLogo:       { width: 80, height: 80, marginBottom: 15, borderRadius: 15 },
  loginTitle:      { fontSize: 22, fontWeight: '900', color: '#14532d', marginBottom: 5 },
  loginSub:        { fontSize: 13, color: '#7c6fae', marginBottom: 25 },
  loginInput:      { width: '100%', borderBottomWidth: 1, borderBottomColor: '#bbf7d0', paddingVertical: 10, marginBottom: 20, fontSize: 16, color: '#14532d' },
  passwordWrapper: { width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#bbf7d0', marginBottom: 20 },
  passwordInput:   { flex: 1, paddingVertical: 10, fontSize: 16, color: '#14532d' },
  eyeIcon:         { padding: 10 },
  loginBtn:        { backgroundColor: '#16a34a', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});