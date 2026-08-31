import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, updatePhoneNumber, signInWithCredential, signOut } from 'firebase/auth';
import { auth, firebaseConfig, getPhoneVerifyAuth } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { ensureCompatFirebaseApp } from '../utils/recaptchaCompat';

ensureCompatFirebaseApp(firebaseConfig);

interface PhoneVerificationModalProps {
  visible: boolean;
  /** 10-digit local number, no country code — this component adds +91. */
  phone: string;
  onVerified: (e164Phone: string) => void;
  onClose: () => void;
  /**
   * true (default): links the verified number to the signed-in user's own
   * Firebase Auth profile (e.g. their profile/booking contact number).
   * false: only proves the OTP was correct, via a throwaway secondary auth
   * instance — for numbers unrelated to the signed-in user's own login, e.g.
   * a farmhouse's primary contact number, which must never overwrite it.
   */
  linkToAccount?: boolean;
}

/**
 * Verifies ownership of an Indian mobile number via Firebase Phone Auth (real SMS OTP).
 * Requires the "Phone" sign-in provider to be enabled in the Firebase console for this project.
 */
export default function PhoneVerificationModal({ visible, phone, onVerified, onClose, linkToAccount = true }: PhoneVerificationModalProps) {
  const { colors } = useTheme();
  const verifyAuth = linkToAccount ? auth : getPhoneVerifyAuth();
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [step, setStep] = useState<'send' | 'code'>('send');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const e164Phone = `+91${phone}`;

  const reset = () => {
    setStep('send');
    setCode('');
    setVerificationId('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendOtp = async () => {
    setError('');
    setSending(true);
    try {
      const provider = new PhoneAuthProvider(verifyAuth);
      const id = await provider.verifyPhoneNumber(e164Phone, recaptchaVerifier.current!);
      setVerificationId(id);
      setStep('code');
    } catch (e: any) {
      setError(e?.message || 'Could not send verification code. Try again.');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.trim());
      if (linkToAccount) {
        if (!auth.currentUser) throw new Error('Not signed in.');
        await updatePhoneNumber(auth.currentUser, credential);
      } else {
        // Just proves the code was correct — signs into the throwaway secondary
        // app instance rather than the user's real session, then discards it.
        await signInWithCredential(verifyAuth, credential);
        signOut(verifyAuth).catch(() => {});
      }
      reset();
      onVerified(e164Phone);
    } catch (e: any) {
      if (e?.code === 'auth/credential-already-in-use') {
        setError('This phone number is already verified on another account.');
      } else if (e?.code === 'auth/invalid-verification-code') {
        setError('Incorrect code. Please try again.');
      } else {
        setError(e?.message || 'Could not verify code. Try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification
      />
      <KeyboardAvoidingView
        style={styles.overlay}
        // Android renders Modal as its own native window, which already resizes
        // itself for the keyboard — adding 'height' behavior here double-compensates
        // and fights that native resize, producing a grow/shrink jitter as the
        // keyboard opens/closes. Only iOS needs KeyboardAvoidingView to do anything.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          {step === 'send' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Number</Text>
              <Text style={[styles.subtitle, { color: colors.placeholder }]}>
                We'll send a one-time code via SMS to {e164Phone}.
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.buttonBackground, opacity: sending ? 0.7 : 1 }]}
                onPress={sendOtp}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color={colors.buttonText} />
                  : <Text style={[styles.btnText, { color: colors.buttonText }]}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Enter Verification Code</Text>
              <Text style={[styles.subtitle, { color: colors.placeholder }]}>
                Sent to {e164Phone}.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="6-digit code"
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={t => setCode(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.buttonBackground, opacity: verifying ? 0.7 : 1 }]}
                onPress={verifyOtp}
                disabled={verifying}
              >
                {verifying
                  ? <ActivityIndicator color={colors.buttonText} />
                  : <Text style={[styles.btnText, { color: colors.buttonText }]}>Verify & Continue</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={sendOtp} disabled={sending}>
                <Text style={{ color: colors.placeholder, fontSize: 13 }}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={handleClose}>
            <Text style={{ color: colors.placeholder, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  input: { height: 50, borderRadius: 10, paddingHorizontal: 14, fontSize: 20, letterSpacing: 4, textAlign: 'center', borderWidth: 1, marginBottom: 16 },
  btn: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '600' },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
});
