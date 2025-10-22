import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Grid as Grid,
  Alert
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Coupon } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const CouponsManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed_amount',
    discount_value: 0,
    valid_from: '',
    valid_until: '',
    min_booking_amount: 0,
    description: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'coupons'));
      const data = snapshot.docs.map(doc => ({
        coupon_id: doc.id,
        ...doc.data()
      })) as Coupon[];
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await addDoc(collection(db, 'coupons'), {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        valid_from: new Date(formData.valid_from),
        valid_until: new Date(formData.valid_until),
        max_uses: 1,
        current_uses: 0,
        is_active: true,
        min_booking_amount: formData.min_booking_amount,
        description: formData.description,
        created_at: serverTimestamp()
      });
      setDialogOpen(false);
      fetchCoupons();
      resetForm();
    } catch (error) {
      console.error('Error creating coupon:', error);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      await updateDoc(doc(db, 'coupons', couponId), {
        is_active: false
      });
      fetchCoupons();
    } catch (error) {
      console.error('Error deactivating coupon:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'fixed_amount',
      discount_value: 0,
      valid_from: '',
      valid_until: '',
      min_booking_amount: 0,
      description: ''
    });
  };

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant='h4' fontWeight='bold'>
            Coupons Management
          </Typography>
          <Button variant='contained' startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Create Coupon
          </Button>
        </Box>

        <Alert severity='info' sx={{ mb: 3 }}>
          All coupons are one-time use only. Once used, they cannot be reused even if booking is cancelled.
        </Alert>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Valid Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.coupon_id}>
                  <TableCell>
                    <Typography fontWeight='bold'>{coupon.code}</Typography>
                  </TableCell>
                  <TableCell>
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : `₹${coupon.discount_value}`}
                  </TableCell>
                  <TableCell>
                    {new Date(coupon.valid_from?.toDate?.()).toLocaleDateString()} - {new Date(coupon.valid_until?.toDate?.()).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={coupon.is_active ? 'Active' : 'Inactive'} 
                      color={coupon.is_active ? 'success' : 'default'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>{coupon.current_uses}/{coupon.max_uses}</TableCell>
                  <TableCell>
                    {coupon.is_active && (
                      <IconButton size='small' onClick={() => handleDeactivate(coupon.coupon_id)}>
                        <Delete />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
          <DialogTitle>Create New Coupon</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label='Coupon Code'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder='DIWALI50'
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <MenuItem value='fixed_amount'>Fixed Amount</MenuItem>
                    <MenuItem value='percentage'>Percentage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Discount Value'
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Valid From'
                  InputLabelProps={{ shrink: true }}
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Valid Until'
                  InputLabelProps={{ shrink: true }}
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Minimum Booking Amount'
                  value={formData.min_booking_amount}
                  onChange={(e) => setFormData({ ...formData, min_booking_amount: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label='Description'
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} variant='contained'>Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default CouponsManagement;