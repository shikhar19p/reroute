import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Calendar, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOwnerBookings } from '../../GlobalDataContext';
import { useAuth } from '../../authContext';
import { useDialog } from '../../components/CustomDialog';
import { Booking } from '../../services/bookingService';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

type NotificationItem = {
  id: string;
  type: 'new_booking' | 'cancelled' | 'confirmed' | 'completed' | 'admin';
  booking?: Booking;
  timestamp: string;
  adminTitle?: string;
  adminBody?: string;
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val?.toDate) return val.toDate(); // Firestore Timestamp
  if (typeof val === 'number') return new Date(val);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function timeAgo(val: any): string {
  try {
    const d = toDate(val);
    if (!d) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

const TYPE_CONFIG = {
  new_booking: {
    icon: (color: string) => <Clock size={20} color={color} />,
    color: '#F59E0B',
    label: 'New Booking Request',
  },
  confirmed: {
    icon: (color: string) => <CheckCircle size={20} color={color} />,
    color: '#10B981',
    label: 'Booking Confirmed',
  },
  cancelled: {
    icon: (color: string) => <XCircle size={20} color={color} />,
    color: '#EF4444',
    label: 'Booking Cancelled',
  },
  completed: {
    icon: (color: string) => <CheckCircle size={20} color={color} />,
    color: '#6B7280',
    label: 'Booking Completed',
  },
  admin: {
    icon: (color: string) => <Bell size={20} color={color} />,
    color: '#6366F1',
    label: 'Notification',
  },
};

export default function OwnerNotificationsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showDialog } = useDialog();
  const { data: bookings, loading, refreshing, refresh: onRefresh } = useOwnerBookings();
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchAdminNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setAdminNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [user]);

  useEffect(() => { fetchAdminNotifications(); }, [fetchAdminNotifications]);

  const allNotifications: NotificationItem[] = useMemo(() => {
    const bookingItems = [...bookings]
      .filter(b => b.paymentStatus !== 'failed') // exclude failed payments entirely
      .sort((a, b) => {
        const ta = toDate((a as any).createdAt)?.getTime() ?? 0;
        const tb = toDate((b as any).createdAt)?.getTime() ?? 0;
        return tb - ta;
      })
      .map(b => {
        let type: NotificationItem['type'] = 'new_booking';
        if (b.status === 'confirmed') type = 'confirmed';
        else if (b.status === 'cancelled') type = 'cancelled';
        else if (b.status === 'completed') type = 'completed';
        return {
          id: b.id,
          type,
          booking: b,
          timestamp: (b as any).createdAt || b.checkInDate,
        };
      });

    const adminItems: NotificationItem[] = adminNotifications.map(n => ({
      id: `admin_${n.id}`,
      type: 'admin' as const,
      timestamp: n.createdAt?.toDate ? n.createdAt.toDate().toISOString() : (n.createdAt || ''),
      adminTitle: n.title || 'Notification',
      adminBody: n.body || '',
    }));

    return [...bookingItems, ...adminItems].sort((a, b) => {
      const ta = toDate(a.timestamp)?.getTime() ?? 0;
      const tb = toDate(b.timestamp)?.getTime() ?? 0;
      return tb - ta;
    });
  }, [bookings, adminNotifications]);

  const notifications = useMemo(
    () => allNotifications.filter(n => !clearedIds.has(n.id)),
    [allNotifications, clearedIds]
  );

  const handleClearAll = useCallback(() => {
    showDialog({
      title: 'Clear Notifications',
      message: 'Remove all notifications from this view?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: () => setClearedIds(prev => {
            const next = new Set(prev);
            notifications.forEach(n => next.add(n.id));
            return next;
          }),
        },
      ],
    });
  }, [notifications, showDialog]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const cfg = TYPE_CONFIG[item.type];
    if (item.type === 'admin') {
      const isExpanded = expandedIds.has(item.id);
      const isLong = (item.adminBody || '').length > 120;
      const toggleExpand = () => setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={isLong ? toggleExpand : undefined}
          activeOpacity={isLong ? 0.75 : 1}
        >
          <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
            {cfg.icon(cfg.color)}
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.adminTitle}</Text>
            <Text style={[styles.metaText, { color: colors.placeholder }]} numberOfLines={isExpanded ? undefined : 3}>{item.adminBody}</Text>
            {isLong && (
              <Text style={{ fontSize: 11, color: cfg.color, marginTop: 4 }}>
                {isExpanded ? 'Show less' : 'Show more'}
              </Text>
            )}
          </View>
          <Text style={[styles.timeAgo, { color: colors.placeholder }]}>{timeAgo(item.timestamp)}</Text>
        </TouchableOpacity>
      );
    }
    const b = item.booking!;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('OwnerBookingDetails', { booking: b })}
        activeOpacity={0.75}
      >
        <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
          {cfg.icon(cfg.color)}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{cfg.label}</Text>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {b.farmhouseName}
          </Text>
          <View style={styles.metaRow}>
            <Calendar size={12} color={colors.placeholder} />
            <Text style={[styles.metaText, { color: colors.placeholder }]}>
              {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.placeholder }]}>
            {b.userName} · {b.guests} guest{b.guests !== 1 ? 's' : ''} · ₹{b.totalPrice}
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: colors.placeholder }]}>
          {timeAgo(item.timestamp)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Trash2 size={18} color={colors.placeholder} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color={colors.placeholder} />
          <Text style={[styles.emptyText, { color: colors.placeholder }]}>No notifications yet</Text>
          <Text style={[styles.emptySubText, { color: colors.placeholder }]}>
            Booking activity will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={['#D4AF37']} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8 },
  clearBtn: { padding: 8, width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText: { fontSize: 12 },
  timeAgo: { fontSize: 11, flexShrink: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySubText: { fontSize: 13 },
});
