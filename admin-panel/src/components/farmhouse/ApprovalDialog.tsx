import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';

interface ApprovalDialogProps {
  open: boolean;
  type: 'approve' | 'reject';
  farmhouseName: string;
  onClose: () => void;
  onConfirm: (commission?: number, reason?: string) => void;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  open,
  type,
  farmhouseName,
  onClose,
  onConfirm
}) => {
  const [commission, setCommission] = useState<number>(10);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (type === 'approve') {
      if (!commission || commission < 0 || commission > 100) {
        setError('Please enter a valid commission percentage (0-100)');
        return;
      }
      onConfirm(commission);
    } else {
      if (!reason.trim()) {
        setError('Please provide a rejection reason');
        return;
      }
      onConfirm(undefined, reason);
    }
    handleClose();
  };

  const handleClose = () => {
    setCommission(10);
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        {type === 'approve' ? 'Approve Farmhouse' : 'Reject Farmhouse'}
      </DialogTitle>
      
      <DialogContent>
        <Typography variant='body1' sx={{ mb: 3 }}>
          {type === 'approve' 
            ? `You are about to approve "${farmhouseName}". Please set the commission percentage.`
            : `You are about to reject "${farmhouseName}". Please provide a reason.`
          }
        </Typography>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {type === 'approve' ? (
          <TextField
            fullWidth
            label='Commission Percentage (%)'
            type='number'
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            helperText='Set the commission percentage for this farmhouse (0-100)'
            InputProps={{
              inputProps: { min: 0, max: 100, step: 0.5 }
            }}
          />
        ) : (
          <TextField
            fullWidth
            label='Rejection Reason'
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Enter the reason for rejection...'
            helperText='This will be sent to the farmhouse owner'
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color='inherit'>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant='contained'
          color={type === 'approve' ? 'success' : 'error'}
        >
          {type === 'approve' ? 'Approve' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalDialog;