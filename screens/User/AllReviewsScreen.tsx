import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';
import { useDialog } from '../../components/CustomDialog';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  farmhouseId: string;
  userId: string;
  createdAt: any;
}

type RootStackParamList = {
  AllReviews: { farmhouseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'AllReviews'>;

export default function AllReviewsScreen({ route, navigation }: Props) {
  const { farmhouseId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showDialog } = useDialog();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ ADDED
  const [showAddReview, setShowAddReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [farmhouseId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('farmhouseId', '==', farmhouseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));
      setReviews(fetchedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      showDialog({
        title: 'Error',
        message: 'Could not load reviews',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  };

  const handleAddReview = async () => {
    if (!newComment.trim()) {
      showDialog({
        title: 'Error',
        message: 'Please enter a comment',
        type: 'warning'
      });
      return;
    }

    if (!user) {
      showDialog({
        title: 'Error',
        message: 'You must be logged in to add a review',
        type: 'error'
      });
      return;
    }

    try {
      setSubmitting(true);
      const reviewData = {
        farmhouseId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating: newRating,
        comment: newComment.trim(),
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      setNewComment('');
      setNewRating(5);
      setShowAddReview(false);
      showDialog({
        title: 'Success',
        message: 'Review added successfully!',
        type: 'success'
      });

      // ✅ AUTOMATIC: Data will refresh automatically if using GlobalDataContext
      await fetchReviews();
    } catch (error) {
      console.error('Error adding review:', error);
      showDialog({
        title: 'Error',
        message: 'Could not add review. Please try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, onPress?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!onPress}
            onPress={() => onPress && onPress(star)}
          >
            <Text style={styles.starIcon}>
              {star <= rating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Reviews</Text>
        <TouchableOpacity onPress={() => setShowAddReview(true)} style={styles.addButton}>
          <Text style={[styles.addIcon, { color: colors.buttonBackground }]}>➕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonBackground} />
        </View>
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.averageRating, { color: colors.buttonBackground }]}>{averageRating}</Text>
            {renderStars(Math.round(parseFloat(averageRating)))}
            <Text style={[styles.reviewCount, { color: colors.placeholder }]}>
              Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </Text>
          </View>

          {/* ✅ ADDED: RefreshControl */}
          <ScrollView 
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.buttonBackground]}
                tintColor={colors.buttonBackground}
              />
            }
          >
            {reviews.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                  No reviews yet. Be the first to review!
                </Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View
                  key={review.id}
                  style={[styles.reviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
                      <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                        {review.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewMeta}>
                      <Text style={[styles.userName, { color: colors.text }]}>{review.userName}</Text>
                      <Text style={[styles.reviewDate, { color: colors.placeholder }]}>
                        {new Date(review.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>
                  </View>
                  {renderStars(review.rating)}
                  <Text style={[styles.reviewComment, { color: colors.text }]}>{review.comment}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* Modal stays the same */}
      <Modal visible={showAddReview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Your Review</Text>

            <Text style={[styles.label, { color: colors.text }]}>Rating</Text>
            {renderStars(newRating, setNewRating)}

            <Text style={[styles.label, { color: colors.text }]}>Your Review</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Share your experience..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              value={newComment}
              onChangeText={setNewComment}
              editable={!submitting}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowAddReview(false);
                  setNewComment('');
                  setNewRating(5);
                }}
                disabled={submitting}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.buttonBackground, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleAddReview}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  backIcon: { fontSize: 24 },
  addButton: { padding: 4 },
  addIcon: { fontSize: 24 },
  title: { fontSize: 20, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summary: { padding: 20, alignItems: 'center', marginVertical: 16, marginHorizontal: 20, borderRadius: 12 },
  averageRating: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  starsContainer: { flexDirection: 'row', gap: 4, marginVertical: 8 },
  starIcon: { fontSize: 24 },
  reviewCount: { fontSize: 14, marginTop: 8 },
  content: { padding: 20 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center' },
  reviewCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  reviewMeta: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  reviewDate: { fontSize: 12, marginTop: 2 },
  reviewComment: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  textInput: { height: 100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, borderWidth: 1, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalButton: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});