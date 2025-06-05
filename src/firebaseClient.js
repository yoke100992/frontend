// src/firebaseClient.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update, remove, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC6iwCaNPzQhSp9kIUyTKH__R2bb2vV7ic",
  authDomain: "yoketech-bd9f1.firebaseapp.com",
  databaseURL: "https://yoketech-bd9f1-default-rtdb.firebaseio.com",
  projectId: "yoketech-bd9f1",
  storageBucket: "yoketech-bd9f1.firebasestorage.app",
  messagingSenderId: "825616467735",
  appId: "1:825616467735:web:99d8fce476f1c386169952",
  measurementId: "G-VWHDT9PLPE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, get, set, update, remove, onValue };
