import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid as Grid,
  TextField,
  Button,
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
  Chip,
  CircularProgress
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import MainLayout from '../components/layout/MainLayout';
interface Communication {
  id: string;
  recipient_type: string;
  subject: string;
  message: string;
  sent_at: any;
  sent_by: string;
}

const CommunicationCenter: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState('all_users');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'communications'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Communication[];
      setCommunications(data);
    } catch (error) {
      console.error('Error fetching communications:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!subject || !message) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'communications'), {
        recipient_type: recipientType,
        subject,
        message,
        sent_at: serverTimestamp(),
        sent_by: 'admin'
      });

      setSubject('');
      setMessage('');
      fetchCommunications();
      alert('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Communication Center
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>Send Notification</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Recipients</InputLabel>
                <Select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                >
                  <MenuItem value='all_users'>All Users</MenuItem>
                  <MenuItem value='all_owners'>All Owners</MenuItem>
                  <MenuItem value='active_users'>Active Users Only</MenuItem>
                  <MenuItem value='specific_user'>Specific User</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label='Subject'
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label='Message'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant='contained'
                startIcon={<Send />}
                onClick={handleSendMessage}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>Message Templates</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setSubject('Welcome to ReRoute!');
                    setMessage('Thank you for joining our platform...');
                  }}
                >
                  Welcome Message
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setSubject('Booking Confirmation');
                    setMessage('Your booking has been confirmed...');
                  }}
                >
                  Booking Confirmation
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setSubject('Special Offer');
                    setMessage('We have a special offer for you...');
                  }}
                >
                  Promotional Offer
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' gutterBottom sx={{ mt: 3 }}>
              Communication History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Recipients</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {communications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        {new Date(comm.sent_at?.toDate?.()).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={comm.recipient_type} size='small' />
                      </TableCell>
                      <TableCell>{comm.subject}</TableCell>
                      <TableCell>{comm.message.substring(0, 50)}...</TableCell>
                      <TableCell>
                        <Chip label='Sent' color='success' size='small' />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default CommunicationCenter;