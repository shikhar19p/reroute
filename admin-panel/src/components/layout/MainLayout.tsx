import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const drawerWidth = 260;

interface MainLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pendingCount }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar pendingCount={pendingCount} />
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Header />
        <Box sx={{ mt: 8, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;