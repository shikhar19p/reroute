import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Configure notification behavior (skip on web - not supported)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export interface NotificationData {
  userId: string;
  title: string;
  body: string;
  data?: any;
  type: 'booking' | 'payment' | 'cancellation' | 'reminder' | 'promotion';
  createdAt: any;
  read: boolean;
}

/**
 * Request notification permissions
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})
    ).data;

    return token;
  } catch (error) {
    // Suppress FCM configuration errors - they're optional for development
    return null;
  }
}

/**
 * Send local notification (displayed immediately on device)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // null means show immediately
    });
    return notificationId;
  } catch (error) {
    console.error('Error sending local notification:', error);
    throw error;
  }
}

/**
 * Schedule notification for future delivery
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: any
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: triggerDate as any,
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Cancel scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
    throw error;
  }
}

/**
 * Save notification to Firestore for history
 */
export async function saveNotificationToFirestore(
  notification: Omit<NotificationData, 'createdAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
}

/**
 * Get user notifications from Firestore
 */
export async function getUserNotifications(userId: string): Promise<NotificationData[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as unknown as NotificationData));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// ============================================
// Booking-specific notification functions
// ============================================

/**
 * Send booking confirmation notification
 */
export async function sendBookingConfirmationNotification(
  userId: string,
  bookingId: string,
  farmhouseName: string,
  checkInDate: string
): Promise<void> {
  const title = 'Booking Confirmed! 🎉';
  const body = `Your booking for ${farmhouseName} has been confirmed. Check-in: ${new Date(checkInDate).toLocaleDateString()}`;

  await sendLocalNotification(title, body, { bookingId, type: 'booking_confirmation' });

  await saveNotificationToFirestore({
    userId,
    title,
    body,
    data: { bookingId, farmhouseName },
    type: 'booking',
    read: false,
  });
}

/**
 * Send payment successful notification
 */
export async function sendPaymentSuccessNotification(
  userId: string,
  bookingId: string,
  amount: number,
  paymentId: string
): Promise<void> {
  const title = 'Payment Successful ✅';
  const body = `₹${amount} paid successfully for booking #${bookingId.substring(0, 8)}`;

  await sendLocalNotification(title, body, { bookingId, paymentId, type: 'payment_success' });

  await saveNotificationToFirestore({
    userId,
    title,
    body,
    data: { bookingId, amount, paymentId },
    type: 'payment',
    read: false,
  });
}

/**
 * Send cancellation confirmation notification
 */
export async function sendCancellationNotification(
  userId: string,
  bookingId: string,
  farmhouseName: string,
  refundAmount?: number
): Promise<void> {
  const title = 'Booking Cancelled';
  const body = refundAmount
    ? `Your booking for ${farmhouseName} has been cancelled. Refund of ₹${refundAmount} will be processed in 5-7 business days.`
    : `Your booking for ${farmhouseName} has been cancelled.`;

  await sendLocalNotification(title, body, { bookingId, type: 'cancellation' });

  await saveNotificationToFirestore({
    userId,
    title,
    body,
    data: { bookingId, farmhouseName, refundAmount },
    type: 'cancellation',
    read: false,
  });
}

/**
 * Send booking reminder notification (24 hours before check-in)
 */
export async function scheduleBookingReminder(
  userId: string,
  bookingId: string,
  farmhouseName: string,
  checkInDate: Date
): Promise<void> {
  const reminderDate = new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

  if (reminderDate > new Date()) {
    const title = 'Upcoming Booking Reminder 📅';
    const body = `Your booking at ${farmhouseName} is tomorrow! Don't forget to check-in.`;

    const notificationId = await scheduleNotification(
      title,
      body,
      reminderDate,
      { bookingId, type: 'booking_reminder' }
    );

    await saveNotificationToFirestore({
      userId,
      title,
      body,
      data: { bookingId, farmhouseName, scheduledFor: reminderDate.toISOString() },
      type: 'reminder',
      read: false,
    });

  }
}

/**
 * Send owner new booking notification
 */
export async function sendOwnerBookingNotification(
  ownerId: string,
  farmhouseName: string,
  guestName: string,
  checkInDate: string,
  bookingId: string
): Promise<void> {
  const title = 'New Booking Received! 💼';
  const body = `${guestName} booked ${farmhouseName} for ${new Date(checkInDate).toLocaleDateString()}`;

  await sendLocalNotification(title, body, { bookingId, type: 'owner_booking' });

  await saveNotificationToFirestore({
    userId: ownerId,
    title,
    body,
    data: { bookingId, farmhouseName, guestName },
    type: 'booking',
    read: false,
  });
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationPressed?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationPressed?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get badge count (unread notifications)
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}
