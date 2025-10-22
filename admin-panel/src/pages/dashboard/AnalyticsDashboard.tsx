import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid as Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bookingStatusData, setBookingStatusData] = useState<any[]>([]);
  const [popularFarmhouses, setPopularFarmhouses] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const farmhousesSnap = await getDocs(collection(db, 'farmhouses'));
      const usersSnap = await getDocs(collection(db, 'users'));

      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Booking status distribution
      const statusCounts = bookings.reduce((acc: any, booking: any) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});
      
      setBookingStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // Popular farmhouses
      const farmhouseCounts = bookings.reduce((acc: any, booking: any) => {
        acc[booking.farmhouse_id] = (acc[booking.farmhouse_id] || 0) + 1;
        return acc;
      }, {});

      setPopularFarmhouses(
        Object.entries(farmhouseCounts)
          .map(([id, count]) => ({ name: id.substring(0, 8), bookings: count }))
          .sort((a: any, b: any) => b.bookings - a.bookings)
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336'];

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
          Analytics Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>Booking Status Distribution</Typography>
              <ResponsiveContainer width='100%' height={300}>
                <PieChart>
                  <Pie
                    data={bookingStatusData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='value'
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>Top 5 Popular Farmhouses</Typography>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={popularFarmhouses}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey='bookings' fill='#4CAF50' />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default AnalyticsDashboard;