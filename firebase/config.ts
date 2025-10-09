import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCalAEZ3eyZOj6uPG5oMwP0yjwsbqJO5v4",
  authDomain: "kebo-motos-28138.firebaseapp.com",
  projectId: "kebo-motos-28138",
  storageBucket: "kebo-motos-28138.firebasestorage.app",
  messagingSenderId: "221611983403",
  appId: "1:221611983403:web:8196d617a6fa1f43cd206e",
  measurementId: "G-GRG874QZRL"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
