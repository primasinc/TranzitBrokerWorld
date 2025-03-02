import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBljl59gSeG04uyFZhJ3_JedfTpkJL1LZY",
  authDomain: "tranzit-79cbe.firebaseapp.com",
  projectId: "tranzit-79cbe",
  storageBucket: "tranzit-79cbe.firebasestorage.app",
  messagingSenderId: "66664073176",
  appId: "1:66664073176:web:c02ff09203eea58b9114ad",
  measurementId: "G-HHL1D9GQDM"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize services
const firebaseStorage = getStorage(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);

export { firebaseApp, firebaseStorage, firebaseAuth }; 