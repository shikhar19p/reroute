import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';

const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    console.log('Fetching URI:', uri);
    const response = await fetch(uri);
    console.log('Fetch response status:', response.status, response.statusText);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      throw new Error(`Failed to fetch URI: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('Blob created successfully');
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
    console.log('Storage instance:', storage);
    console.log('Storage bucket:', storage.app.options.storageBucket);
    console.log('Converting URI to blob:', uri);
    const blob = await uriToBlob(uri);
    console.log('Blob created, size:', blob.size, 'type:', blob.type);

    console.log('Creating storage reference:', path);
    const storageRef = ref(storage, path);
    console.log('Storage reference created, fullPath:', storageRef.fullPath);
    console.log('Storage reference bucket:', storageRef.bucket);

    console.log('Uploading bytes to storage...');
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('Upload complete, getting download URL...');

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('Upload error details:', {
      code: error.code,
      message: error.message,
      serverResponse: error.serverResponse,
      customData: error.customData,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      storageInfo: {
        bucket: storage.app.options.storageBucket,
        path: path
      }
    });
    throw error;
  }
};

export const uploadDocument = async (fileObj: any, path: string): Promise<string | null> => {
  if (!fileObj || !fileObj.uri || !path) {
    return null;
  }

  try {
    console.log('Converting document URI to blob:', fileObj.uri);
    const blob = await uriToBlob(fileObj.uri);
    console.log('Document blob created, size:', blob.size, 'type:', blob.type);

    console.log('Creating storage reference for document:', path);
    const storageRef = ref(storage, path);
    console.log('Storage reference created, fullPath:', storageRef.fullPath);

    console.log('Uploading document bytes to storage...');
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('Document upload complete, getting download URL...');

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Document download URL obtained:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('Document upload error details:', {
      code: error.code,
      message: error.message,
      serverResponse: error.serverResponse,
      customData: error.customData,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      path: path,
      fileInfo: {
        uri: fileObj.uri,
        name: fileObj.name,
        mimeType: fileObj.mimeType,
        size: fileObj.size
      }
    });
    throw error;
  }
};

export const saveFarmRegistration = async (farmData: any): Promise<{ farmId: string; userId: string }> => {
  console.log('========================================');
  console.log('Starting farm registration save...');
  console.log('Farm data:', JSON.stringify(farmData, null, 2));

  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('ERROR: User not authenticated');
    throw new Error('User must be authenticated to register a farm');
  }

  const userId = currentUser.uid;
  const timestamp = Date.now();
  console.log('User ID:', userId, 'Timestamp:', timestamp);

  console.log('Uploading photos to Storage...');
  console.log('Number of photos to upload:', farmData.photos.length);

  const photoUrls: string[] = [];
  for (let i = 0; i < farmData.photos.length; i++) {
    const photo = farmData.photos[i];
    const photoPath = `farms/${userId}/${timestamp}/photos/photo_${i}.jpg`;
    console.log(`Uploading photo ${i + 1}/${farmData.photos.length}...`);
    try {
      const photoUrl = await uploadImage(photo.uri, photoPath);
      photoUrls.push(photoUrl);
      console.log(`Photo ${i + 1} uploaded successfully`);
    } catch (error) {
      console.error(`Failed to upload photo ${i + 1}:`, error);
      throw new Error(`Failed to upload photo ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('All photos uploaded successfully!');
  console.log('Photo URLs:', photoUrls);
  console.log('Now uploading KYC documents to Storage...');

  const person1AadhaarFrontUrl = farmData.kyc.person1.aadhaarFront
    ? await uploadDocument(
        farmData.kyc.person1.aadhaarFront,
        `farms/${userId}/${timestamp}/kyc/person1_aadhaar_front`
      )
    : null;

  const person1AadhaarBackUrl = farmData.kyc.person1.aadhaarBack
    ? await uploadDocument(
        farmData.kyc.person1.aadhaarBack,
        `farms/${userId}/${timestamp}/kyc/person1_aadhaar_back`
      )
    : null;

  const person2AadhaarFrontUrl = farmData.kyc.person2.aadhaarFront
    ? await uploadDocument(
        farmData.kyc.person2.aadhaarFront,
        `farms/${userId}/${timestamp}/kyc/person2_aadhaar_front`
      )
    : null;

  const person2AadhaarBackUrl = farmData.kyc.person2.aadhaarBack
    ? await uploadDocument(
        farmData.kyc.person2.aadhaarBack,
        `farms/${userId}/${timestamp}/kyc/person2_aadhaar_back`
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

  const farmDoc = {
    basicDetails: {
      name: farmData.name,
      contactPhone1: farmData.contactPhone1,
      contactPhone2: farmData.contactPhone2 || null,
      city: farmData.city,
      area: farmData.area,
      locationText: farmData.locationText,
      mapLink: farmData.mapLink || null,
      bedrooms: farmData.bedrooms,
      capacity: farmData.capacity,
      description: farmData.description,
    },
    pricing: {
      weeklyDay: farmData.pricing.weeklyDay,
      weeklyNight: farmData.pricing.weeklyNight,
      weekendDay: farmData.pricing.weekendDay,
      weekendNight: farmData.pricing.weekendNight,
      customPricing: farmData.pricing.customPricing || [],
    },
    photoUrls,
    amenities: {
      tv: farmData.amenities.tv,
      geyser: farmData.amenities.geyser,
      bonfire: farmData.amenities.bonfire,
      pool: farmData.amenities.pool || false,
      chess: farmData.amenities.chess,
      carroms: farmData.amenities.carroms,
      volleyball: farmData.amenities.volleyball,
      customAmenities: farmData.amenities.customAmenities || null,
    },
    rules: {
      unmarriedNotAllowed: farmData.rules.unmarriedNotAllowed,
      petsNotAllowed: farmData.rules.petsNotAllowed,
      quietHours: farmData.rules.quietHours || null,
      customRules: farmData.rules.customRules || null,
    },
    kyc: {
      person1: {
        name: farmData.kyc.person1.name,
        phone: farmData.kyc.person1.phone,
        aadhaarNumber: farmData.kyc.person1.aadhaarNumber,
        aadhaarFrontUrl: person1AadhaarFrontUrl,
        aadhaarBackUrl: person1AadhaarBackUrl,
      },
      person2: {
        name: farmData.kyc.person2.name || null,
        phone: farmData.kyc.person2.phone || null,
        aadhaarNumber: farmData.kyc.person2.aadhaarNumber || null,
        aadhaarFrontUrl: person2AadhaarFrontUrl,
        aadhaarBackUrl: person2AadhaarBackUrl,
      },
      panNumber: farmData.kyc.panNumber,
      companyPANUrl,
      labourDocUrl,
      bankDetails: {
        accountHolderName: farmData.kyc.bankDetails.accountHolderName,
        accountNumber: farmData.kyc.bankDetails.accountNumber,
        ifscCode: farmData.kyc.bankDetails.ifscCode,
        branchName: farmData.kyc.bankDetails.branchName,
      },
      agreedToTerms: farmData.kyc.agreedToTerms,
    },
    ownerId: userId,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  console.log('Saving to Firestore...');
  console.log('Farm document to be saved:', JSON.stringify(farmDoc, null, 2));

  try {
    const farmsCollection = collection(db, 'farmhouses');
    console.log('Firestore collection reference created');

    const docRef = await addDoc(farmsCollection, farmDoc);
    console.log('Farm saved successfully! Document ID:', docRef.id);

    return {
      farmId: docRef.id,
      userId,
    };
  } catch (firestoreError: any) {
    console.error('Firestore save error:', {
      code: firestoreError.code,
      message: firestoreError.message,
      details: JSON.stringify(firestoreError, Object.getOwnPropertyNames(firestoreError))
    });
    throw new Error(`Failed to save to Firestore: ${firestoreError.message}`);
  }
};
