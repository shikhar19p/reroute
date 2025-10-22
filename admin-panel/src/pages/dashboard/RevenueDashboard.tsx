import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid as Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Booking } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const RevenueDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    averageBookingValue: 0,
    growthRate: 0
  });

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const bookings = snapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as Booking[];

      processRevenueData(bookings);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRevenueData = (bookings: Booking[]) => {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.total_amount, 0);
    const totalCommission = bookings.reduce((sum, b) => sum + b.commission_amount, 0);
    const averageBookingValue = totalRevenue / bookings.length || 0;

    setStats({
      totalRevenue,
      totalCommission,
      averageBookingValue,
      growthRate: 12.5
    });

    // Group by date
    const grouped = bookings.reduce((acc: any, booking) => {
      const date = new Date(booking.created_at?.toDate?.()).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, commission: 0 };
      }
      acc[date].revenue += booking.total_amount;
      acc[date].commission += booking.commission_amount;
      return acc;
    }, {});

    setRevenueData(Object.values(grouped));
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant='h4' fontWeight='bold'>
            Revenue Dashboard
          </Typography>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value='7days'>Last 7 Days</MenuItem>
              <MenuItem value='30days'>Last 30 Days</MenuItem>
              <MenuItem value='90days'>Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Total Revenue</Typography>
                <Typography variant='h4'>₹{stats.totalRevenue.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Total Commission</Typography>
                <Typography variant='h4' color='success.main'>₹{stats.totalCommission.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Avg Booking Value</Typography>
                <Typography variant='h4'>₹{Math.round(stats.averageBookingValue).toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Growth Rate</Typography>
                <Typography variant='h4' color='primary'>{stats.growthRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant='h6' gutterBottom>Revenue Trend</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis />
              <Tooltip />
              <Line type='monotone' dataKey='revenue' stroke='#4CAF50' strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant='h6' gutterBottom>Commission Overview</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis />
              <Tooltip />
              <Bar dataKey='commission' fill='#2196F3' />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default RevenueDashboard;