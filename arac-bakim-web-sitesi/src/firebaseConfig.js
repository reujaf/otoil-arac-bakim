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
const app = initializeApp(firebaseConfig);

// Firebase servislerini başlat ve dışa aktar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

