import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyATh2uKenWApY2DjKxz8A09BCTg_thfF94",
  authDomain: "tranzit-9e2b2.firebaseapp.com",
  projectId: "tranzit-9e2b2",
  storageBucket: "tranzit-9e2b2.firebasestorage.app",
  messagingSenderId: "231222687837",
  appId: "1:231222687837:web:34c9997b0c9be14bdff5b4",
  measurementId: "G-2SRT9KF58Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app; 