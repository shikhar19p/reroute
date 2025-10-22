import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import FarmhouseApprovals from './pages/farmhouse/FarmhouseApprovals';
import AllFarmhouses from './pages/farmhouse/AllFarmhouses';
import CouponsManagement from './pages/coupon/CouponsManagement';
import UsersManagement from './pages/user/UsersManagement';
import BookingsManagement from './pages/booking/BookingsManagement';
import PaymentsCommission from './pages/payment/PaymentsCommission';
import RevenueDashboard from './pages/dashboard/RevenueDashboard';
import AnalyticsDashboard from './pages/dashboard/AnalyticsDashboard';
import ReviewManagement from './pages/ReviewManagement';
import CommunicationCenter from './pages/CommunicationCenter';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4CAF50',
    },
    secondary: {
      main: '#2196F3',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path='/login' element={<Login />} />
            
            <Route path='/dashboard' element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path='/farmhouse-approvals' element={<PrivateRoute><FarmhouseApprovals /></PrivateRoute>} />
            <Route path='/farmhouses' element={<PrivateRoute><AllFarmhouses /></PrivateRoute>} />
            <Route path='/coupons' element={<PrivateRoute><CouponsManagement /></PrivateRoute>} />
            <Route path='/users' element={<PrivateRoute><UsersManagement /></PrivateRoute>} />
            <Route path='/bookings' element={<PrivateRoute><BookingsManagement /></PrivateRoute>} />
            <Route path='/payments' element={<PrivateRoute><PaymentsCommission /></PrivateRoute>} />
            <Route path='/revenue' element={<PrivateRoute><RevenueDashboard /></PrivateRoute>} />
            <Route path='/analytics' element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
            <Route path='/reviews' element={<PrivateRoute><ReviewManagement /></PrivateRoute>} />
            <Route path='/communications' element={<PrivateRoute><CommunicationCenter /></PrivateRoute>} />
            
            <Route path='/' element={<Navigate to='/dashboard' replace />} />
            <Route path='*' element={<Navigate to='/dashboard' replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;