import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage, auth } from '../firebaseConfig';

const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch URI: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('uriToBlob error:', error);
    throw new Error(`Failed to convert URI to blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadImage = async (uri: string, path: string): Promise<string> => {
  if (!uri || !path) {
    throw new Error('URI and path are required for upload');
  }

  try {
    const blob = await uriToBlob(uri);

    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error: any) {
    console.error('Upload error:', error.code, error.message);
    throw error;
  }
};

export const uploadDocument = async (fileObj: any, path: string): Promise<string | null> => {
  if (!fileObj || !fileObj.uri || !path) {
    return null;
  }

  try {
    const blob = await uriToBlob(fileObj.uri);

    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error: any) {
    console.error('Document upload error:', error.code, error.message);
    throw error;
  }
};

export const saveFarmRegistration = async (farmData: any): Promise<{ farmId: string; userId: string }> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('ERROR: User not authenticated');
    throw new Error('User must be authenticated to register a farm');
  }

  const userId = currentUser.uid;
  const timestamp = Date.now();

  const photoUrls: string[] = [];
  for (let i = 0; i < farmData.photos.length; i++) {
    const photo = farmData.photos[i];
    const photoPath = `farms/${userId}/${timestamp}/photos/photo_${i}.jpg`;
    try {
      const photoUrl = await uploadImage(photo.uri, photoPath);
      photoUrls.push(photoUrl);
    } catch (error) {
      console.error(`Failed to upload photo ${i + 1}:`, error);
      throw new Error(`Failed to upload photo ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Person 1 ID Proof uploads (NO AADHAAR)
  const person1IdProofFrontUrl = farmData.kyc.person1.idProofFront
    ? await uploadDocument(
        farmData.kyc.person1.idProofFront,
        `farms/${userId}/${timestamp}/kyc/person1_id_proof_front`
      )
    : null;

  const person1IdProofBackUrl = farmData.kyc.person1.idProofBack
    ? await uploadDocument(
        farmData.kyc.person1.idProofBack,
        `farms/${userId}/${timestamp}/kyc/person1_id_proof_back`
      )
    : null;

  // Person 2 ID Proof uploads (NO AADHAAR)
  const person2IdProofFrontUrl = farmData.kyc.person2.idProofFront
    ? await uploadDocument(
        farmData.kyc.person2.idProofFront,
        `farms/${userId}/${timestamp}/kyc/person2_id_proof_front`
      )
    : null;

  const person2IdProofBackUrl = farmData.kyc.person2.idProofBack
    ? await uploadDocument(
        farmData.kyc.person2.idProofBack,
        `farms/${userId}/${timestamp}/kyc/person2_id_proof_back`
      )
    : null;

  const companyPANUrl = farmData.kyc.companyPAN
    ? await uploadDocument(
        farmData.kyc.companyPAN,
        `farms/${userId}/${timestamp}/kyc/company_pan`
      )
    : null;

  const labourDocUrl = farmData.kyc.labourDoc
    ? await uploadDocument(
        farmData.kyc.labourDoc,
        `farms/${userId}/${timestamp}/kyc/labour_doc`
      )
    : null;

  // Encrypt sensitive bank details server-side (ENCRYPTION_SECRET never leaves Cloud Functions)
  const encryptBankDetailsFn = httpsCallable<
    { accountNumber: string; ifscCode: string },
    { encryptedAccountNumber: string; encryptedIFSC: string }
  >(getFunctions(), 'encryptBankDetails');
  const encryptResult = await encryptBankDetailsFn({
    accountNumber: farmData.kyc.bankDetails.accountNumber,
    ifscCode: farmData.kyc.bankDetails.ifscCode,
  });
  const encryptedAccountNumber = encryptResult.data.encryptedAccountNumber;
  const encryptedIFSC = encryptResult.data.encryptedIFSC;
  const farmDoc = {
    propertyType: farmData.propertyType || 'farmhouse',
    basicDetails: {
      name: farmData.name,
      contactPhone1: farmData.contactPhone1,
      contactPhone2: farmData.contactPhone2 || null,
      city: farmData.city,
      area: farmData.area,
      locationText: farmData.locationText,
      mapLink: farmData.mapLink || null,
      bedrooms: parseInt(farmData.bedrooms) || 0,
      capacity: parseInt(farmData.capacity) || 0,
      description: farmData.description,
    },
    pricing: {
      weeklyDay: parseInt(farmData.pricing.weeklyDay) || 0,
      weeklyNight: parseInt(farmData.pricing.weeklyNight) || 0,
      weekendDay: parseInt(farmData.pricing.weekendDay) || 0,
      weekendNight: parseInt(farmData.pricing.weekendNight) || 0,
      customPricing: farmData.pricing.customPricing?.map((cp: any) => ({
        name: cp.name || '',
        price: parseInt(cp.price) || 0
      })) || [],
    },
    photoUrls,
    amenities: {
      wifi: farmData.amenities.wifi || false,
      ac: farmData.amenities.ac || false,
      parking: farmData.amenities.parking || false,
      kitchen: farmData.amenities.kitchen || false,
      tv: farmData.amenities.tv ? 1 : 0,
      geyser: farmData.amenities.geyser ? 1 : 0,
      pool: farmData.amenities.pool || false,
      bonfire: farmData.amenities.bonfire ? 1 : 0,
      bbq: farmData.amenities.bbq || false,
      outdoorSeating: farmData.amenities.outdoorSeating || false,
      hotTub: farmData.amenities.hotTub || false,
      djMusicSystem: farmData.amenities.djMusicSystem || false,
      projector: farmData.amenities.projector || false,
      restaurant: farmData.amenities.restaurant || false,
      foodPrepOnDemand: farmData.amenities.foodPrepOnDemand || false,
      decorService: farmData.amenities.decorService || false,
      chess: farmData.amenities.chess ? 1 : 0,
      carroms: farmData.amenities.carrom ? 1 : 0,
      volleyball: farmData.amenities.volleyball ? 1 : 0,
      badminton: farmData.amenities.badminton || false,
      tableTennis: farmData.amenities.tableTennis || false,
      cricket: farmData.amenities.cricket || false,
      customAmenities: farmData.amenities.customAmenities || null,
    },
    rules: {
      petsNotAllowed: farmData.rules.petsNotAllowed,
      customRules: farmData.rules.customRules || null,
    },
    kyc: {
      person1: {
        name: farmData.kyc.person1.name,
        phone: farmData.kyc.person1.phone,
        panCard: farmData.kyc.person1.panCard,
        idProofType: farmData.kyc.person1.idProofType,
        idProofNumber: farmData.kyc.person1.idProofNumber,
        idProofFrontUrl: person1IdProofFrontUrl,
        idProofBackUrl: person1IdProofBackUrl,
      },
      person2: {
        name: farmData.kyc.person2.name || null,
        phone: farmData.kyc.person2.phone || null,
        panCard: farmData.kyc.person2.panCard || null,
        idProofType: farmData.kyc.person2.idProofType || null,
        idProofNumber: farmData.kyc.person2.idProofNumber || null,
        idProofFrontUrl: person2IdProofFrontUrl,
        idProofBackUrl: person2IdProofBackUrl,
      },
      panNumber: farmData.kyc.panNumber,
      companyPANUrl,
      labourDocUrl,
      bankDetails: {
        accountHolderName: farmData.kyc.bankDetails.accountHolderName,
        accountNumber: encryptedAccountNumber, // ENCRYPTED
        ifscCode: encryptedIFSC, // ENCRYPTED
        branchName: farmData.kyc.bankDetails.branchName,
        encrypted: true, // Flag to indicate encryption
      },
      agreedToTerms: farmData.kyc.agreedToTerms,
    },
    ownerId: userId,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  try {
    const farmsCollection = collection(db, 'farmhouses');

    const docRef = await addDoc(farmsCollection, farmDoc);

    return {
      farmId: docRef.id,
      userId,
    };
  } catch (firestoreError: any) {
    console.error('Firestore save error:', firestoreError.code, firestoreError.message);
    throw new Error(`Failed to save to Firestore: ${firestoreError.message}`);
  }
};