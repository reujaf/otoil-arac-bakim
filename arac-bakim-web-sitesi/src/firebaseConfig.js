// Firebase yapılandırma dosyası
// Firebase konsolundan (https://console.firebase.google.com) aldığınız ayarları buraya yapıştırın

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase yapılandırma nesnesi
const firebaseConfig = {
  apiKey: "AIzaSyAC2PTqodqeO5ICJSSAF9LHc8lW44Y9VJ8",
  authDomain: "otoil-db-4cc57.firebaseapp.com",
  projectId: "otoil-db-4cc57",
  storageBucket: "otoil-db-4cc57.firebasestorage.app",
  messagingSenderId: "1050355758783",
  appId: "1:1050355758783:web:ca88093ed688875973f80a"
};

// Firebase'i başlat
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Fallback: try to initialize anyway
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (fallbackError) {
    console.error('Firebase fallback initialization also failed:', fallbackError);
  }
}

// Firebase servislerini başlat ve dışa aktar
export { auth, db, storage };
export default app;
