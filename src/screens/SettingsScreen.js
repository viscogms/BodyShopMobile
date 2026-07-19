import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { API_KEY } from '../utils/config';

const API_BASE_URL = 'https://visco-api.onrender.com';

export default function SettingsScreen({ currentUser, setCurrentUser, newPassword, setNewPassword, changeProfilePic, handleProfileUpdate }) {

  const [backupLoading,  setBackupLoading]  = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ── BACKUP ──────────────────────────────────────────────────────
  const handleManualBackup = async () => {
    Alert.alert(
      'Manual Backup',
      'Are you sure you want to send a backup to your backup email?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Backup',
          onPress: async () => {
            setBackupLoading(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/backup`, {
                method:  'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert(
                  'Backup Sent!',
                  `Backup email sent successfully!\n\nJob Cards: ${data.details.jobCards}\nParts: ${data.details.parts}\nUsers: ${data.details.users}\nFile: ${data.details.fileName}`
                );
              } else {
                Alert.alert('Backup Failed', data.message || 'Please try again.');
              }
            } catch (err) {
              Alert.alert('Connection Error', 'Could not connect to the server. Please check your internet connection.');
            } finally {
              setBackupLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── SAFE MERGE RESTORE ──────────────────────────────────────────
  const handleRestore = async () => {
    Alert.alert(
      'Restore from Backup',
      'This will add any missing records from the backup file to your current database.\n\nExisting records will NOT be changed or deleted. Only missing records will be added.\n\nDo you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick Backup File',
          onPress: async () => {
            try {
              // Open file picker
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled) return;

              const file = result.assets[0];

              // Read file content
              const response = await fetch(file.uri);
              const text     = await response.text();
              let backupData;

              try {
                backupData = JSON.parse(text);
              } catch {
                Alert.alert('Invalid File', 'The selected file is not a valid Body Shop backup JSON file.');
                return;
              }

              // Validate structure
              if (!backupData.jobCards || !backupData.users || !backupData.parts) {
                Alert.alert('Invalid Backup', 'This file does not appear to be a valid Body Shop backup. Please select the correct file.');
                return;
              }

              // Show counts and confirm
              Alert.alert(
                'Confirm Restore',
                `Backup file contains:\n\nJob Cards: ${backupData.jobCards.length}\nParts: ${backupData.parts.length}\nUsers: ${backupData.users.length}\n\nOnly records missing from your current database will be added. Proceed?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Restore Now',
                    onPress: async () => {
                      setRestoreLoading(true);
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/restore`, {
                          method:  'POST',
                          headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                          body:    JSON.stringify(backupData),
                        });
                        const data = await res.json();
                        if (data.success) {
                          Alert.alert(
                            'Restore Complete!',
                            `Missing records successfully added!\n\nAdded:\nJob Cards: +${data.details.jobCards}\nParts: +${data.details.parts}\nUsers: +${data.details.users}\n\nSkipped (already existed):\nJob Cards: ${data.details.skipped.jobCards}\nParts: ${data.details.skipped.parts}\nUsers: ${data.details.skipped.users}`
                          );
                        } else {
                          Alert.alert('Restore Failed', data.message || 'Please try again.');
                        }
                      } catch (err) {
                        Alert.alert('Connection Error', 'Could not connect to the server. Please check your internet connection.');
                      } finally {
                        setRestoreLoading(false);
                      }
                    },
                  },
                ]
              );

            } catch (err) {
              Alert.alert('Error', 'Could not open the file picker. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f4f7f8', padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>Profile Settings</Text>

      {/* Profile Card */}
      <View style={styles.settingCard}>
        <Text style={styles.settingCardTitle}>Edit User Baseline</Text>
        <View style={{ alignItems: 'center', marginVertical: 15 }}>
          <Image
            source={currentUser?.profileImage ? { uri: currentUser?.profileImage } : require('../../assets/logo.png')}
            style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#e1e5eb' }}
          />
          <TouchableOpacity style={styles.whatsappBtn} onPress={changeProfilePic}>
            <Text style={styles.whatsappBtnText}>📸 Update Profile Pic</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.formInputLabel}>Display Full Name</Text>
        <TextInput
          style={styles.input}
          value={currentUser?.name || ''}
          onChangeText={(v) => setCurrentUser({ ...currentUser, name: v })}
        />
        <Text style={styles.formInputLabel}>Update Password (Optional)</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Leave empty to keep current password"
          placeholderTextColor="#aaa"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { marginTop: 15 }]}
          onPress={() => handleProfileUpdate({ name: currentUser?.name, password: newPassword })}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>CONFIRM CHANGES</Text>
        </TouchableOpacity>
      </View>

      {/* Backup & Restore Card */}
      <View style={styles.settingCard}>
        <Text style={styles.settingCardTitle}>Data Management</Text>
        <Text style={styles.sectionDesc}>
          Use the buttons below to backup or restore your system data.
        </Text>

        {/* Backup Button */}
        <TouchableOpacity
          style={[styles.backupBtn, backupLoading && styles.btnDisabled]}
          onPress={handleManualBackup}
          disabled={backupLoading}
        >
          {backupLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>🛡️  Send Backup Now</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.btnHint}>Sends Job Cards, Parts and Users data as a JSON file to your backup email</Text>

        <View style={styles.divider} />

        {/* Restore Button */}
        <TouchableOpacity
          style={[styles.restoreBtn, restoreLoading && styles.btnDisabled]}
          onPress={handleRestore}
          disabled={restoreLoading}
        >
          {restoreLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>♻️  Restore from Backup</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.btnHint}>Safely adds missing records from a backup file — existing data is never deleted</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  settingCard:      { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 15 },
  settingCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 10 },
  formInputLabel:   { fontSize: 11, fontWeight: 'bold', color: '#546e7a', marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:            { borderBottomWidth: 1, borderBottomColor: '#ccc', padding: 10, marginTop: 5, marginBottom: 12, fontSize: 16, backgroundColor: '#fff' },
  saveBtn:          { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', width: '100%' },
  whatsappBtn:      { backgroundColor: '#25D366', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  whatsappBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sectionDesc:      { fontSize: 13, color: '#7f8c8d', marginBottom: 16, lineHeight: 20 },
  backupBtn:        { backgroundColor: '#1a56db', padding: 16, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  restoreBtn:       { backgroundColor: '#0e9f6e', padding: 16, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  btnDisabled:      { opacity: 0.6 },
  btnText:          { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnHint:          { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 4 },
  divider:          { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
});