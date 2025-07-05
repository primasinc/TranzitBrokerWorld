import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDNjhoxKN5ddNtVqoezi3eijlHlysequmE",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "tranzitti-90210.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "tranzitti-90210",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "tranzitti-90210.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "243323136379",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:243323136379:web:f79eaf66561d11e3c1b5de",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-H05C1FWDH7"
};

const app = initializeApp(firebaseConfig);

const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app as default, storage, auth, db };