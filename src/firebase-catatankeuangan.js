// firebase-catatankeuangan.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, set, update, remove, onValue } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Konfigurasi Firebase
const firebaseConfig = {
 apiKey: "AIzaSyBW2AkEx4vNatvQQK5NkDnWa42T8x093z8",
  authDomain: "data-pengeluaran-9ca6f.firebaseapp.com",
  databaseURL: "https://data-pengeluaran-9ca6f-default-rtdb.firebaseio.com",
  projectId: "data-pengeluaran-9ca6f",
  storageBucket: "data-pengeluaran-9ca6f.firebasestorage.app",
  messagingSenderId: "363976000223",
  appId: "1:363976000223:web:00f6ce545de9bb4ffa1f6a",
  measurementId: "G-635Z5QNCB5"
};

// Inisialisasi Firebase hanya jika belum ada
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const analytics = getAnalytics(app);

// Export
export { db, ref, get, set, update, remove, onValue };
