import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAyV_Q1_LRH406BKZxxL_db8Phlo9EifM8",
  authDomain: "kebo-motos.firebaseapp.com",
  projectId: "kebo-motos",
  storageBucket: "kebo-motos.firebasestorage.app",
  messagingSenderId: "404928073149",
  appId: "1:404928073149:web:2db5418a7fd2b33d0f16d4",
  measurementId: "G-T7ESPRC77E"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);