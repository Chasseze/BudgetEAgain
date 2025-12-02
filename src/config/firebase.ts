// Firebase configuration
// Replace these placeholder values with your actual Firebase project credentials
// You can find these values in your Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project (or create a new one)
// 3. Click the gear icon (Settings) > Project settings
// 4. Scroll down to "Your apps" section
// 5. If you haven't added a web app, click "Add app" and select Web (</>)
// 6. Copy the configuration values below

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: Replace these values with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyClXQJGhOfvJmbvGve_CdGIYuDrgjlpjf4",
  authDomain: "budget-expense-app-c8262.firebaseapp.com",
  projectId: "budget-expense-app-c8262",
  storageBucket: "budget-expense-app-c8262.firebasestorage.app",
  messagingSenderId: "281688261944",
  appId: "1:281688261944:web:b02d31529d1fc84bfeadcd"
};

// Validate configuration before initializing
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field as keyof typeof firebaseConfig] ||
    firebaseConfig[field as keyof typeof firebaseConfig]?.includes('YOUR_')
  );

  if (missingFields.length > 0) {
    console.warn(
      `⚠️ Firebase configuration incomplete. Please update src/config/firebase.ts with your Firebase credentials.\n` +
      `Missing or placeholder fields: ${missingFields.join(', ')}\n` +
      `The app will work offline with localStorage, but cloud features will be disabled.`
    );
    return false;
  }
  return true;
};

// Initialize Firebase only if config is valid
let app: ReturnType<typeof initializeApp> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

const isConfigValid = validateConfig();

if (isConfigValid) {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Firestore (database)
    db = getFirestore(app);

    // Initialize Authentication
    auth = getAuth(app);

    // Initialize Storage (for receipts/images)
    storage = getStorage(app);

    // Initialize Analytics (only in browser and if supported)
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported && app) {
          analytics = getAnalytics(app);
          console.log('✅ Firebase Analytics initialized');
        }
      });
    }

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
  }
} else {
  console.log('ℹ️ Running in offline mode with localStorage');
}

// Export Firebase services
export { app, analytics, db, auth, storage };

// Export a helper to check if Firebase is available
export const isFirebaseAvailable = () => isConfigValid && app !== null;

// Export the config for reference (without sensitive data in production)
export const getFirebaseConfig = () => ({
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

export default app;
