import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { parseImagesToArray, getCustomerNameOnly, getStatusColor } from '../utils/helpers';
import { INACTIVE_STATUSES } from '../utils/constants';

export default function JobCardItem({ item, onPress, isDark = false }) {
  const rearImg     = parseImagesToArray(item.rearImage)[0];
  const displayName = getCustomerNameOnly(item.carModel) || '';
  const isInactive  = INACTIVE_STATUSES.includes(item.status);
  const isPaid      = item.paymentStatus === 'Paid' || (item.invoiceAmount > 0 && item.paidAmount >= item.invoiceAmount);
  const isUnpaid    = !isPaid && item.invoiceAmount > 0;
  const statusColor = getStatusColor(item.status) || '#f59e0b';
  const todoCount   = (item.todos || []).filter(t => !t.completed).length;

  const formatSafeDate = (d) => {
    if (!d) return '';
    if (typeof d === 'number' || !isNaN(Number(d))) return new Date(Number(d)).toISOString().split('T')[0];
    return String(d).split('T')[0].split(' ')[0];
  };

  const cardBg    = isDark ? '#0f1117' : '#f7fdf9';
  const borderClr = isDark ? '#1a1f2e' : '#86efac';
  const plateTxt  = isDark ? '#e2e8f0' : '#0f172a';
  const subTxt    = isDark ? '#334155' : '#94a3b8';
  const dateTxt   = isDark ? '#475569' : '#94a3b8';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: borderClr },
        isInactive && styles.inactiveCard,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Image area */}
      <View style={styles.imageWrap}>
        {rearImg ? (
          <ExpoImage
            source={{ uri: rearImg }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={[styles.image, { backgroundColor: isDark ? '#141820' : '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 26, opacity: 0.25 }}>🚗</Text>
          </View>
        )}

        {/* Dark overlay on inactive */}
        {isInactive && <View style={styles.inactiveOverlay} />}

        {/* Status badge */}
        {!isInactive && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusTxt} numberOfLines={1}>{item.status}</Text>
          </View>
        )}

        {/* Delivered tick */}
        {isInactive && (
          <View style={styles.deliveredBadge}>
            <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '900' }}>✓</Text>
          </View>
        )}

        {/* Unpaid red dot */}
        {isUnpaid && <View style={styles.unpaidDot} />}

        {/* Todo badge */}
        {todoCount > 0 && (
          <View style={styles.todoBadge}>
            <Text style={styles.todoTxt}>{todoCount}</Text>
          </View>
        )}
      </View>

      {/* Color accent line */}
      <View style={[styles.accentLine, { backgroundColor: isInactive ? (isDark ? '#1a1f2e' : '#e2e8f0') : statusColor }]} />

      {/* Card content */}
      <View style={styles.content}>
        <Text style={[styles.plate, { color: plateTxt }]} numberOfLines={1}>
          {item.plateNumber || 'NO PLATE'}
        </Text>
        <Text style={[styles.date, { color: dateTxt }]} numberOfLines={1}>
          {formatSafeDate(item.receiveDate)}
        </Text>
        {displayName ? (
          <Text style={[styles.customer, { color: subTxt }]} numberOfLines={1}>
            {displayName}
          </Text>
        ) : null}
        {item.jobDoneBy ? (
          <Text style={[styles.mechanic, { color: isDark ? '#16a34a' : '#16a34a' }]} numberOfLines={1}>
            🔧 {item.jobDoneBy}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: 192,
    elevation: 5,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  inactiveCard: {
    opacity: 0.38,
  },
  imageWrap: {
    width: '100%',
    height: 116,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  inactiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statusBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    maxWidth: '90%',
  },
  statusTxt: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  deliveredBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unpaidDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  todoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#16a34a',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  todoTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  accentLine: {
    height: 2,
    width: '100%',
  },
  content: {
    paddingHorizontal: 7,
    paddingTop: 7,
    paddingBottom: 6,
    gap: 2,
  },
  plate: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  customer: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  mechanic: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
});