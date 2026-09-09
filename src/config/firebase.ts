// Firebase configuration
// Replace these placeholder values with your actual Firebase project credentials
// You can find these values in your Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project (or create a new one)
// 3. Click the gear icon (Settings) > Project settings
// 4. Scroll down to "Your apps" section
// 5. If you haven't added a web app, click "Add app" and select Web (</>)
// 6. Copy the configuration values below

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  setAnalyticsCollectionEnabled,
} from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration — loaded from .env (see .env.example)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration before initializing
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field as keyof typeof firebaseConfig]
  );

  if (missingFields.length > 0) {
    console.warn(
      `⚠️ Firebase configuration incomplete. Please copy .env.example to .env and fill in your Firebase credentials.\n` +
      `Missing fields: ${missingFields.join(', ')}\n` +
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
    // Initialize Firebase (reuse the existing app on hot-reload instead of
    // throwing app/duplicate-app and leaving every handle null)
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    // Initialize Firestore (database)
    db = getFirestore(app);

    // Initialize Authentication
    auth = getAuth(app);

    // Initialize Storage (for receipts/images)
    storage = getStorage(app);

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

// Local mode is useful for deliberate, single-device demos, but it must never
// silently replace a configured account. Opt in explicitly in a local env file
// with `VITE_ENABLE_LOCAL_MODE=true`.
export const isLocalModeEnabled =
  import.meta.env.VITE_ENABLE_LOCAL_MODE === "true";

/**
 * Firebase Analytics is opt-in. It is not initialized until an authenticated
 * user explicitly enables it in Settings. No financial records are logged as
 * analytics events by this app.
 */
export const setAnalyticsConsent = async (consented: boolean): Promise<void> => {
  if (!app || !firebaseConfig.measurementId || typeof window === 'undefined') {
    return;
  }

  const supported = await isSupported();
  if (!supported) return;

  if (consented && !analytics) {
    analytics = getAnalytics(app);
  }
  if (analytics) {
    setAnalyticsCollectionEnabled(analytics, consented);
  }
};

// Export the config for reference (without sensitive data in production)
export const getFirebaseConfig = () => ({
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

export default app;
