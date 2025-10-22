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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid as Grid,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Farmhouse } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const AllFarmhouses: React.FC = () => {
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [filtered, setFiltered] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchFarmhouses();
  }, []);

  useEffect(() => {
    filterFarmhouses();
  }, [searchTerm, statusFilter, farmhouses]);

  const fetchFarmhouses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'farmhouses'));
      const data = snapshot.docs.map(doc => ({
        farmhouse_id: doc.id,
        ...doc.data()
      })) as Farmhouse[];
      setFarmhouses(data);
    } catch (error) {
      console.error('Error fetching farmhouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFarmhouses = () => {
    let result = farmhouses;

    if (searchTerm) {
      result = result.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }

    setFiltered(result);
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
          All Farmhouses
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder='Search by name or location...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All</MenuItem>
                <MenuItem value='active'>Active</MenuItem>
                <MenuItem value='pending_approval'>Pending</MenuItem>
                <MenuItem value='rejected'>Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Base Rate</TableCell>
                <TableCell>Commission %</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Max Guests</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((farmhouse) => (
                <TableRow key={farmhouse.farmhouse_id}>
                 <TableCell><Typography fontWeight='bold'>{farmhouse.name}</Typography></TableCell>
                  <TableCell>{farmhouse.location}</TableCell>
                  <TableCell>₹{farmhouse.base_rate}</TableCell>
                  <TableCell>{farmhouse.commission_percentage || 0}%</TableCell>
                  <TableCell>
                    <Chip 
                      label={farmhouse.status} 
                      color={farmhouse.status === 'active' ? 'success' : farmhouse.status === 'pending_approval' ? 'warning' : 'error'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>{farmhouse.max_guests}</TableCell>
                  <TableCell>
                    <IconButton size='small'>
                      <Visibility />
                    </IconButton>
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

export default AllFarmhouses;