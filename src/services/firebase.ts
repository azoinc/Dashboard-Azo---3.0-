import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAT_Lw5NJ3l0pL3yIvHJUwO9l_d8xqgrGk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "azo-dash-3-0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "azo-dash-3-0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "azo-dash-3-0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "841923046209",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:841923046209:web:07fd3bb8d2eb7e10dd4fc0",
  measurementId: "G-B37R0BYH3H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Use a specific database ID if provided, otherwise default to azo-dash-3-0
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "azo-dash-3-0";
export const db = getFirestore(app, databaseId);

export const storage = getStorage(app);
