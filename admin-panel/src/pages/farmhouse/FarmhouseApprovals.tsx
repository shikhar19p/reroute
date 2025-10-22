import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid as Grid,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Farmhouse } from '../../types';
import MainLayout from '../../components/layout/MainLayout';
import FarmhouseDetailModal from '../../components/farmhouse/FarmhouseDetailModal';

const FarmhouseApprovals: React.FC = () => {
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<Farmhouse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingFarmhouses();
  }, []);

  const fetchPendingFarmhouses = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'farmhouses'),
        where('status', '==', 'pending_approval')
      );
      const snapshot = await getDocs(q);
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

  const handleViewDetails = (farmhouse: Farmhouse) => {
    setSelectedFarmhouse(farmhouse);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFarmhouse(null);
  };

  const handleApprovalComplete = () => {
    fetchPendingFarmhouses();
    handleCloseModal();
  };

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
    <MainLayout pendingCount={farmhouses.length}>
      <Box>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Farmhouse Approvals
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
          Review and approve pending farmhouse registrations
        </Typography>

        {farmhouses.length === 0 ? (
          <Alert severity='info'>No pending farmhouse approvals at the moment.</Alert>
        ) : (
          <Grid container spacing={3}>
            {farmhouses.map((farmhouse) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={farmhouse.farmhouse_id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component='img'
                    height='200'
                    image={farmhouse.images[0] || 'https://via.placeholder.com/400x200?text=No+Image'}
                    alt={farmhouse.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      {farmhouse.name}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' gutterBottom>
                      {farmhouse.location}
                    </Typography>
                    <Typography variant='body2' sx={{ mb: 2 }}>
                      {farmhouse.description.substring(0, 100)}...
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip label={`₹${farmhouse.base_rate}/night`} size='small' color='primary' />
                      <Chip label={`Max: ${farmhouse.max_guests} guests`} size='small' />
                      <Chip label='Pending' size='small' color='warning' />
                    </Box>

                    <Button
                      fullWidth
                      variant='contained'
                      onClick={() => handleViewDetails(farmhouse)}
                    >
                      Review & Approve
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {selectedFarmhouse && (
          <FarmhouseDetailModal
            open={modalOpen}
            farmhouse={selectedFarmhouse}
            onClose={handleCloseModal}
            onApprovalComplete={handleApprovalComplete}
          />
        )}
      </Box>
    </MainLayout>
  );
};

export default FarmhouseApprovals;