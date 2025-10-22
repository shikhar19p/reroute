import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Grid as Grid,
  Chip,
  Button,
  Divider,
  ImageList,
  ImageListItem,
  CircularProgress,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tabs,
  Tab,
  IconButton,
  Paper,
  Stack,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Farmhouse, User } from '../../types';
import { 
  Close, 
  CheckCircle, 
  Cancel,
  ZoomIn,
  LocationOn,
  History,
  Comment,
  Warning,
  TrendingUp,
  ExpandMore,
  Flag
} from '@mui/icons-material';
import ApprovalDialog from './ApprovalDialog';

interface FarmhouseDetailModalProps {
  open: boolean;
  farmhouse: Farmhouse;
  onClose: () => void;
  onApprovalComplete: () => void;
}

interface OwnerStats {
  totalProperties: number;
  approvedProperties: number;
  rejectedProperties: number;
  totalBookings: number;
  averageRating: number;
}

interface VerificationChecklist {
  aadhaarVerified: boolean;
  panVerified: boolean;
  licenceVerified: boolean;
  photosQuality: boolean;
  pricingReasonable: boolean;
  locationVerified: boolean;
}

const FarmhouseDetailModal: React.FC<FarmhouseDetailModalProps> = ({
  open,
  farmhouse,
  onClose,
  onApprovalComplete
}) => {
  const { currentUser } = useAuth();
  const [ownerData, setOwnerData] = useState<User | null>(null);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [checklist, setChecklist] = useState<VerificationChecklist>({
    aadhaarVerified: false,
    panVerified: false,
    licenceVerified: false,
    photosQuality: false,
    pricingReasonable: false,
    locationVerified: false
  });
  const [rejectionHistory, setRejectionHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && farmhouse) {
      fetchAllData();
    }
  }, [open, farmhouse]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOwnerData(),
        fetchOwnerStats(),
        fetchRejectionHistory()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerData = async () => {
    const ownerDoc = await getDoc(doc(db, 'users', farmhouse.owner_id));
    if (ownerDoc.exists()) {
      setOwnerData({ user_id: ownerDoc.id, ...ownerDoc.data() } as User);
    }
  };

  const fetchOwnerStats = async () => {
    const propertiesQuery = query(
      collection(db, 'farmhouses'),
      where('owner_id', '==', farmhouse.owner_id)
    );
    const propertiesSnap = await getDocs(propertiesQuery);
    
    const approved = propertiesSnap.docs.filter(doc => doc.data().status === 'active').length;
    const rejected = propertiesSnap.docs.filter(doc => doc.data().status === 'rejected').length;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('farmhouse_id', '==', farmhouse.farmhouse_id)
    );
    const bookingsSnap = await getDocs(bookingsQuery);

    setOwnerStats({
      totalProperties: propertiesSnap.size,
      approvedProperties: approved,
      rejectedProperties: rejected,
      totalBookings: bookingsSnap.size,
      averageRating: 0
    });
  };

  const fetchRejectionHistory = async () => {
    const historyQuery = query(
      collection(db, 'approval_history'),
      where('farmhouse_id', '==', farmhouse.farmhouse_id),
      where('action', '==', 'rejected')
    );
    const historySnap = await getDocs(historyQuery);
    setRejectionHistory(historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleChecklistChange = (key: keyof VerificationChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAdminNotes = async () => {
    try {
      await addDoc(collection(db, 'admin_notes'), {
        farmhouse_id: farmhouse.farmhouse_id,
        note: adminNotes,
        created_by: currentUser?.uid,
        created_at: serverTimestamp()
      });
      setAdminNotes('');
      alert('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleApprove = () => {
    const allChecked = Object.values(checklist).every(v => v);
    if (!allChecked) {
      alert('Please complete all verification checklist items before approving');
      return;
    }
    setApprovalType('approve');
    setApprovalDialogOpen(true);
  };

  const handleReject = () => {
    setApprovalType('reject');
    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = async (commission?: number, reason?: string) => {
    try {
      const farmhouseRef = doc(db, 'farmhouses', farmhouse.farmhouse_id);
      
      if (approvalType === 'approve' && commission) {
        await updateDoc(farmhouseRef, {
          status: 'active',
          commission_percentage: commission,
          approved_by: currentUser?.uid,
          approved_at: serverTimestamp()
        });

        if (ownerData?.owner_kyc) {
          const ownerRef = doc(db, 'users', farmhouse.owner_id);
          await updateDoc(ownerRef, {
            'owner_kyc.status': 'approved',
            kyc_status: 'approved'
          });
        }

        await addDoc(collection(db, 'approval_history'), {
          farmhouse_id: farmhouse.farmhouse_id,
          action: 'approved',
          commission_percentage: commission,
          approved_by: currentUser?.uid,
          timestamp: serverTimestamp()
        });
      } else if (approvalType === 'reject' && reason) {
        await updateDoc(farmhouseRef, {
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: currentUser?.uid,
          rejected_at: serverTimestamp()
        });

        await addDoc(collection(db, 'approval_history'), {
          farmhouse_id: farmhouse.farmhouse_id,
          action: 'rejected',
          reason,
          rejected_by: currentUser?.uid,
          timestamp: serverTimestamp()
        });
      }

      setApprovalDialogOpen(false);
      onApprovalComplete();
    } catch (error) {
      console.error('Error updating farmhouse:', error);
    }
  };

  const isChecklistComplete = Object.values(checklist).every(v => v);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='h5' fontWeight='bold'>
            Farmhouse Review
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label='Property Details' />
                <Tab label='KYC Documents' />
                <Tab label='Owner Info' />
                <Tab label='Verification' />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    {farmhouse.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocationOn fontSize='small' color='action' />
                    <Typography variant='body2' color='text.secondary'>
                      {farmhouse.location}
                    </Typography>
                  </Box>
                  
                  <Typography variant='body1' sx={{ mb: 3 }}>
                    {farmhouse.description}
                  </Typography>

                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Images ({farmhouse.images.length})
                  </Typography>
                  <ImageList cols={4} gap={8} sx={{ mb: 3 }}>
                    {farmhouse.images.map((image, index) => (
                      <ImageListItem key={index} sx={{ cursor: 'pointer' }}>
                        <img
                          src={image}
                          alt={`Farmhouse ${index + 1}`}
                          loading='lazy'
                          style={{ borderRadius: 8, height: 150, objectFit: 'cover' }}
                          onClick={() => setSelectedImage(image)}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>

                  <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                    <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                      Pricing
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant='body2' color='text.secondary'>Base Rate</Typography>
                        <Typography variant='h6'>₹{farmhouse.base_rate}/night</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant='body2' color='text.secondary'>Weekend Rate</Typography>
                        <Typography variant='h6'>₹{farmhouse.weekend_rate}/night</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant='body2' color='text.secondary'>Max Guests</Typography>
                        <Typography variant='h6'>{farmhouse.max_guests}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Amenities
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                    {farmhouse.amenities.map((amenity, index) => (
                      <Chip key={index} label={amenity} size='small' />
                    ))}
                  </Box>

                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    House Rules
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    {farmhouse.rules.map((rule, index) => (
                      <Typography key={index} variant='body2' sx={{ mb: 0.5 }}>
                        • {rule}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    Owner KYC Documents
                  </Typography>
                  
                  {!ownerData?.owner_kyc ? (
                    <Alert severity='warning'>No KYC documents found for this owner.</Alert>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Person 1
                          </Typography>
                          <Typography variant='body2'>Name: {ownerData.owner_kyc.person1_name}</Typography>
                          <Typography variant='body2'>Phone: {ownerData.owner_kyc.person1_phone}</Typography>
                          <Button
                            variant='contained'
                            size='small'
                            href={ownerData.owner_kyc.person1_aadhaar_url}
                            target='_blank'
                            sx={{ mt: 2 }}
                            fullWidth
                          >
                            View Aadhaar Document
                          </Button>
                        </Paper>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Person 2
                          </Typography>
                          <Typography variant='body2'>Name: {ownerData.owner_kyc.person2_name}</Typography>
                          <Typography variant='body2'>Phone: {ownerData.owner_kyc.person2_phone}</Typography>
                          <Button
                            variant='contained'
                            size='small'
                            href={ownerData.owner_kyc.person2_aadhaar_url}
                            target='_blank'
                            sx={{ mt: 2 }}
                            fullWidth
                          >
                            View Aadhaar Document
                          </Button>
                        </Paper>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Company PAN
                          </Typography>
                          <Button
                            variant='contained'
                            size='small'
                            href={ownerData.owner_kyc.company_pan_url}
                            target='_blank'
                            fullWidth
                          >
                            View PAN Card
                          </Button>
                        </Paper>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Labour Licence
                          </Typography>
                          <Button
                            variant='contained'
                            size='small'
                            href={ownerData.owner_kyc.labour_licence_url}
                            target='_blank'
                            fullWidth
                          >
                            View Licence Document
                          </Button>
                        </Paper>
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}

              {activeTab === 2 && ownerStats && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    Owner Statistics
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='primary'>{ownerStats.totalProperties}</Typography>
                        <Typography variant='body2'>Total Properties</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='success.main'>{ownerStats.approvedProperties}</Typography>
                        <Typography variant='body2'>Approved</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='error.main'>{ownerStats.rejectedProperties}</Typography>
                        <Typography variant='body2'>Rejected</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4'>{ownerStats.totalBookings}</Typography>
                        <Typography variant='body2'>Total Bookings</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeTab === 3 && (
                <Box>
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Complete all verification steps before approving the farmhouse
                  </Alert>

                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      Verification Checklist
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.aadhaarVerified}
                            onChange={() => handleChecklistChange('aadhaarVerified')}
                          />
                        }
                        label='Aadhaar documents verified and valid'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.panVerified}
                            onChange={() => handleChecklistChange('panVerified')}
                          />
                        }
                        label='PAN card verified and matches company details'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.licenceVerified}
                            onChange={() => handleChecklistChange('licenceVerified')}
                          />
                        }
                        label='Labour licence verified and active'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.photosQuality}
                            onChange={() => handleChecklistChange('photosQuality')}
                          />
                        }
                        label='Photos are of good quality and represent the property accurately'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.pricingReasonable}
                            onChange={() => handleChecklistChange('pricingReasonable')}
                          />
                        }
                        label='Pricing is reasonable and competitive'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.locationVerified}
                            onChange={() => handleChecklistChange('locationVerified')}
                          />
                        }
                        label='Location verified on Google Maps'
                      />
                    </FormGroup>

                    {!isChecklistComplete && (
                      <Alert severity='warning' sx={{ mt: 2 }}>
                        <Warning sx={{ mr: 1 }} />
                        Please complete all checklist items to enable approval
                      </Alert>
                    )}
                  </Paper>

                  <Paper sx={{ p: 3 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      Internal Admin Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder='Add any internal notes...'
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      variant='outlined' 
                      onClick={saveAdminNotes}
                      disabled={!adminNotes.trim()}
                    >
                      Save Note
                    </Button>
                  </Paper>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button
                  variant='contained'
                  color='success'
                  startIcon={<CheckCircle />}
                  fullWidth
                  onClick={handleApprove}
                  disabled={!isChecklistComplete}
                >
                  Approve Farmhouse
                </Button>
                <Button
                  variant='contained'
                  color='error'
                  startIcon={<Cancel />}
                  fullWidth
                  onClick={handleReject}
                >
                  Reject Farmhouse
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth='md'>
        <DialogContent>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt='Zoomed' 
              style={{ width: '100%', height: 'auto' }} 
            />
          )}
        </DialogContent>
      </Dialog>

      <ApprovalDialog
        open={approvalDialogOpen}
        type={approvalType}
        farmhouseName={farmhouse.name}
        onClose={() => setApprovalDialogOpen(false)}
        onConfirm={handleConfirmApproval}
      />
    </>
  );
};

export default FarmhouseDetailModal;