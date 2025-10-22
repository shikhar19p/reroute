import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Badge
} from '@mui/material';
import {
  Dashboard,
  Home,
  HomeWork,
  BookOnline,
  People,
  LocalOffer,
  Payment,
  CheckCircle,
  TrendingUp,
  BarChart,
  Star,
  Email
} from '@mui/icons-material';

const drawerWidth = 260;

interface SidebarProps {
  pendingCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ pendingCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Farmhouse Approvals', icon: <CheckCircle />, path: '/farmhouse-approvals', badge: pendingCount },
    { text: 'All Farmhouses', icon: <HomeWork />, path: '/farmhouses' },
    { text: 'Bookings', icon: <BookOnline />, path: '/bookings' },
    { text: 'Users', icon: <People />, path: '/users' },
    { text: 'Coupons', icon: <LocalOffer />, path: '/coupons' },
    { text: 'Payments', icon: <Payment />, path: '/payments' },
    { text: 'Revenue', icon: <TrendingUp />, path: '/revenue' },
    { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
    { text: 'Reviews', icon: <Star />, path: '/reviews' },
    { text: 'Communications', icon: <Email />, path: '/communications' }
  ];

  return (
    <Drawer
      variant='permanent'
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1a1a2e',
          color: 'white'
        },
      }}
    >
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Home sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
        <Typography variant='h5' fontWeight='bold'>
          ReRoute
        </Typography>
        <Typography variant='caption' color='#aaa'>
          Admin Panel
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#333' }} />

      <List sx={{ mt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: '#4CAF50',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  },
                },
                '&:hover': {
                  backgroundColor: '#2a2a3e',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.badge && item.badge > 0 ? (
                  <Badge badgeContent={item.badge} color='error'>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;