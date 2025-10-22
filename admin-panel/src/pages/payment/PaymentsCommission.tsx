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
  Chip,
  Button,
  Grid  as Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Booking } from '../../types';
import MainLayout from '../../components/layout/MainLayout';
import { TrendingUp, Payment, PendingActions } from '@mui/icons-material';

const PaymentsCommission: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const data = snapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as Booking[];
      
      setBookings(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Booking[]) => {
    const totalRevenue = data.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalCommission = data.reduce((sum, b) => sum + (b.commission_amount || 0), 0);
    const pendingPayouts = data.filter(b => !b.commission_paid_to_owner).reduce((sum, b) => sum + (b.total_amount - b.commission_amount), 0);
    const completedPayouts = data.filter(b => b.commission_paid_to_owner).reduce((sum, b) => sum + (b.total_amount - b.commission_amount), 0);

    setStats({ totalRevenue, totalCommission, pendingPayouts, completedPayouts });
  };

  const markAsPaid = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        commission_paid_to_owner: true
      });
      fetchData();
    } catch (error) {
      console.error('Error updating payout:', error);
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
          Payments & Commission
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp color='primary' />
                  <Typography variant='body2' color='text.secondary'>Total Revenue</Typography>
                </Box>
                <Typography variant='h4'>₹{stats.totalRevenue.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Payment color='success' />
                  <Typography variant='body2' color='text.secondary'>Total Commission</Typography>
                </Box>
                <Typography variant='h4' color='success.main'>₹{stats.totalCommission.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PendingActions color='warning' />
                  <Typography variant='body2' color='text.secondary'>Pending Payouts</Typography>
                </Box>
                <Typography variant='h4' color='warning.main'>₹{stats.pendingPayouts.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Payment color='info' />
                  <Typography variant='body2' color='text.secondary'>Completed Payouts</Typography>
                </Box>
                <Typography variant='h4' color='info.main'>₹{stats.completedPayouts.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant='h6' fontWeight='bold' gutterBottom>
          Pending Payouts
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Farmhouse</TableCell>
                <TableCell>Booking Amount</TableCell>
                <TableCell>Commission</TableCell>
                <TableCell>Net Payout</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.filter(b => !b.commission_paid_to_owner && b.booking_id).map((booking) => (
                <TableRow key={booking.booking_id}>
                  <TableCell>{booking.booking_id?.substring(0, 8) || 'N/A'}</TableCell>
                  <TableCell>{booking.farmhouse_id?.substring(0, 8) || 'N/A'}</TableCell>
                  <TableCell>₹{booking.total_amount || 0}</TableCell>
                  <TableCell>₹{booking.commission_amount || 0}</TableCell>
                  <TableCell>
                    <strong>₹{(booking.total_amount || 0) - (booking.commission_amount || 0)}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip label='Pending' color='warning' size='small' />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size='small' 
                      variant='contained' 
                      onClick={() => markAsPaid(booking.booking_id)}
                    >
                      Mark as Paid
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </MainLayout>
  );
};

export default PaymentsCommission;