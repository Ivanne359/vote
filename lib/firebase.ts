import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const validateFirebaseConfig = () => {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ] as const;

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key]
  );

  if (missingKeys.length > 0) {
    console.error(
      "Firebase is not configured. Missing environment variables:",
      missingKeys.map((key) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`)
    );
    return false;
  }

  return true;
};

const createFirebaseApp = (): FirebaseApp | null => {
  if (typeof window === "undefined") return null;
  
  if (!validateFirebaseConfig()) {
    return null;
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

const app = createFirebaseApp();

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

// Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');