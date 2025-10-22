import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth='sm'>
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <AdminPanelSettings sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
              <Typography variant='h4' fontWeight='bold' gutterBottom>
                ReRoute Admin
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Sign in to manage your platform
              </Typography>
            </Box>

            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label='Email Address'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin='normal'
                required
                autoComplete='email'
                autoFocus
              />
              
              <TextField
                fullWidth
                label='Password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin='normal'
                required
                autoComplete='current-password'
              />

              <Button
                type='submit'
                fullWidth
                variant='contained'
                size='large'
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color='inherit' /> : 'Sign In'}
              </Button>
            </form>

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              Admin access only • Contact support if you need assistance
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;