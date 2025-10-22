import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid as Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  HomeWork,
  People,
  BookOnline,
  LocalOffer,
  CheckCircle,
  TrendingUp,
  ArrowForward
} from '@mui/icons-material';
import MainLayout from '../../components/layout/MainLayout';
import { useDashboardStats } from '../../hooks/useDashboardStats';

const Dashboard: React.FC = () => {
  const { stats, loading } = useDashboardStats();
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Total Farmhouses',
      value: stats.totalFarmhouses,
      icon: <HomeWork sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      path: '/farmhouses'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingFarmhouses,
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      path: '/farmhouse-approvals',
      highlight: stats.pendingFarmhouses > 0
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      path: '/users'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <BookOnline sx={{ fontSize: 40 }} />,
      color: '#9C27B0',
      path: '/bookings'
    },
    {
      title: 'Active Coupons',
      value: stats.activeCoupons,
      icon: <LocalOffer sx={{ fontSize: 40 }} />,
      color: '#F44336',
      path: '/coupons'
    }
  ];

  const bookingStats = [
    { label: 'Today', value: stats.todayBookings },
    { label: 'This Week', value: stats.weekBookings },
    { label: 'This Month', value: stats.monthBookings }
  ];

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout pendingCount={stats.pendingFarmhouses}>
      <Box>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Dashboard
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
          Welcome to ReRoute Admin Panel
        </Typography>

        <Grid container spacing={3}>
          {statCards.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: card.highlight ? `2px solid ${card.color}` : 'none',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate(card.path)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant='body2' color='text.secondary' gutterBottom>
                        {card.title}
                      </Typography>
                      <Typography variant='h3' fontWeight='bold'>
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        backgroundColor: `${card.color}15`,
                        borderRadius: 2,
                        p: 1.5,
                        color: card.color
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: card.color }}>
                    <Typography variant='caption' fontWeight='medium'>
                      View Details
                    </Typography>
                    <ArrowForward sx={{ fontSize: 16, ml: 0.5 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendingUp sx={{ mr: 1, color: '#4CAF50' }} />
                <Typography variant='h6' fontWeight='bold'>
                  Booking Statistics
                </Typography>
              </Box>
              {bookingStats.map((stat, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    py: 2,
                    borderBottom: index < bookingStats.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <Typography variant='body1' color='text.secondary'>
                    {stat.label}
                  </Typography>
                  <Typography variant='h5' fontWeight='bold' color='primary'>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant='h6' fontWeight='bold' gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                {stats.pendingFarmhouses > 0 && (
                  <Box 
                    onClick={() => navigate('/farmhouse-approvals')}
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#fff3e0', 
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px solid #ffb74d',
                      '&:hover': { backgroundColor: '#ffe0b2' }
                    }}
                  >
                    <Typography variant='body1' fontWeight='medium' color='#f57c00'>
                      {stats.pendingFarmhouses} farmhouse{stats.pendingFarmhouses > 1 ? 's' : ''} waiting for approval
                    </Typography>
                  </Box>
                )}
                <Box 
                  onClick={() => navigate('/coupons')}
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#f3e5f5', 
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '1px solid #ce93d8',
                    '&:hover': { backgroundColor: '#e1bee7' }
                  }}
                >
                  <Typography variant='body1' fontWeight='medium' color='#8e24aa'>
                    Create New Coupon
                  </Typography>
                </Box>
                <Box 
                  onClick={() => navigate('/bookings')}
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#e8f5e9', 
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '1px solid #81c784',
                    '&:hover': { backgroundColor: '#c8e6c9' }
                  }}
                >
                  <Typography variant='body1' fontWeight='medium' color='#388e3c'>
                    View All Bookings
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default Dashboard;