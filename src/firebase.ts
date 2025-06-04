import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNjhoxKN5ddNtVqoezi3eijlHlysequmE",
  authDomain: "tranzitti-90210.firebaseapp.com",
  projectId: "tranzitti-90210",
  storageBucket: "tranzitti-90210.appspot.com",
  messagingSenderId: "243323136379",
  appId: "1:243323136379:web:f79eaf66561d11e3c1b5de",
  measurementId: "G-H05C1FWDH7"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);