import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../authContext';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

type RootStackParamList = {
  AllReviews: { farmhouseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'AllReviews'>;

const SAMPLE_REVIEWS: Review[] = [
  { id: '1', userName: 'Rajesh Kumar', rating: 5, comment: 'Amazing place for family gatherings. Clean and well-maintained.', date: '2025-09-15' },
  { id: '2', userName: 'Priya Sharma', rating: 4, comment: 'Good facilities but could improve the kitchen equipment.', date: '2025-09-10' },
  { id: '3', userName: 'Amit Patel', rating: 5, comment: 'Perfect for corporate events. Highly recommended!', date: '2025-09-08' },
  { id: '4', userName: 'Sneha Reddy', rating: 4, comment: 'Beautiful location with great amenities.', date: '2025-09-05' },
  { id: '5', userName: 'Vikram Singh', rating: 5, comment: 'Loved the peaceful environment and hospitality.', date: '2025-09-01' },
];

export default function AllReviewsScreen({ route, navigation }: Props) {
  const { farmhouseId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>(SAMPLE_REVIEWS);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  const handleAddReview = () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      userName: user?.displayName || 'Anonymous',
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews([review, ...reviews]);
    setNewComment('');
    setNewRating(5);
    setShowAddReview(false);
    Alert.alert('Success', 'Review added successfully!');
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

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Reviews</Text>
        <TouchableOpacity onPress={() => setShowAddReview(true)} style={styles.addButton}>
          <Text style={[styles.addIcon, { color: colors.buttonBackground }]}>➕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.averageRating, { color: colors.buttonBackground }]}>{averageRating}</Text>
        {renderStars(Math.round(parseFloat(averageRating)))}
        <Text style={[styles.reviewCount, { color: colors.placeholder }]}>
          Based on {reviews.length} reviews
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reviews.map((review) => (
          <View
            key={review.id}
            style={[styles.reviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <View style={styles.reviewHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.buttonBackground }]}>
                <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                  {review.userName.charAt(0)}
                </Text>
              </View>
              <View style={styles.reviewMeta}>
                <Text style={[styles.userName, { color: colors.text }]}>{review.userName}</Text>
                <Text style={[styles.reviewDate, { color: colors.placeholder }]}>{review.date}</Text>
              </View>
            </View>
            {renderStars(review.rating)}
            <Text style={[styles.reviewComment, { color: colors.text }]}>{review.comment}</Text>
          </View>
        ))}
      </ScrollView>

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
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowAddReview(false);
                  setNewComment('');
                  setNewRating(5);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddReview}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Submit</Text>
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
  summary: { padding: 20, alignItems: 'center', marginVertical: 16, marginHorizontal: 20, borderRadius: 12 },
  averageRating: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  starsContainer: { flexDirection: 'row', gap: 4, marginVertical: 8 },
  starIcon: { fontSize: 24 },
  reviewCount: { fontSize: 14, marginTop: 8 },
  content: { padding: 20 },
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
