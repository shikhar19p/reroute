import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Chip,
  CircularProgress
} from '@mui/material';
import { CheckCircle, Cancel, Flag } from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import MainLayout from '../components/layout/MainLayout';

interface Review {
  review_id: string;
  user_id: string;
  farmhouse_id: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: any;
}

const ReviewManagement: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const data = snapshot.docs.map(doc => ({
        review_id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status });
      fetchReviews();
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleRespondToReview = async () => {
    if (!selectedReview) return;
    try {
      await updateDoc(doc(db, 'reviews', selectedReview.review_id), {
        admin_response: adminResponse
      });
      setDialogOpen(false);
      setAdminResponse('');
      fetchReviews();
    } catch (error) {
      console.error('Error responding to review:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Review Management
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Farmhouse</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.review_id}>
                  <TableCell>{review.user_id.substring(0, 8)}</TableCell>
                  <TableCell>{review.farmhouse_id.substring(0, 8)}</TableCell>
                  <TableCell>
                    <Rating value={review.rating} readOnly size='small' />
                  </TableCell>
                  <TableCell>{review.comment?.substring(0, 50)}...</TableCell>
                  <TableCell>
                    <Chip 
                      label={review.status} 
                      color={review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'error' : 'warning'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>
                    {review.status === 'pending' && (
                      <>
                        <IconButton 
                          size='small' 
                          color='success'
                          onClick={() => handleUpdateStatus(review.review_id, 'approved')}
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton 
                          size='small' 
                          color='error'
                          onClick={() => handleUpdateStatus(review.review_id, 'rejected')}
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                    <IconButton 
                      size='small' 
                      onClick={() => handleUpdateStatus(review.review_id, 'flagged')}
                    >
                      <Flag />
                    </IconButton>
                    <Button
                      size='small'
                      onClick={() => {
                        setSelectedReview(review);
                        setDialogOpen(true);
                      }}
                    >
                      Respond
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
          <DialogTitle>Admin Response</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder='Write your response...'
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRespondToReview} variant='contained'>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default ReviewManagement;