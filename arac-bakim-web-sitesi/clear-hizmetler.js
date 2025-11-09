// Firestore hizmetler koleksiyonunu temizleme scripti
// Kullanım: node clear-hizmetler.js
// 
// ÖNCE: Firebase Console'dan serviceAccountKey.json dosyasını indirin:
// 1. https://console.firebase.google.com/project/otoil-db-4cc57/settings/serviceaccounts/adminsdk
// 2. "Generate New Private Key" butonuna tıklayın
// 3. İndirilen JSON dosyasını proje kök dizinine "serviceAccountKey.json" olarak kaydedin

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service Account Key dosyasını kontrol et
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json dosyası bulunamadı!');
  console.error('\nLütfen şu adımları izleyin:');
  console.error('1. Firebase Console\'a gidin:');
  console.error('   https://console.firebase.google.com/project/otoil-db-4cc57/settings/serviceaccounts/adminsdk');
  console.error('2. "Generate New Private Key" butonuna tıklayın');
  console.error('3. İndirilen JSON dosyasını proje kök dizinine "serviceAccountKey.json" olarak kaydedin');
  console.error('4. Scripti tekrar çalıştırın');
  process.exit(1);
}

// Firebase Admin SDK'yı başlat
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'otoil-db-4cc57'
  });
  console.log('✅ Firebase Admin SDK başlatıldı\n');
} catch (error) {
  console.error('❌ Firebase Admin SDK başlatılamadı:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function deleteCollection(collectionPath) {
  try {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      console.log(`✅ ${collectionPath} koleksiyonunda silinecek kayıt yok.`);
      return;
    }
    
    console.log(`📋 ${snapshot.size} kayıt bulundu. Siliniyor...\n`);
    
    // Batch işlemleri için (500'lük gruplar halinde)
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const docs = snapshot.docs.slice(i, i + batchSize);
      
      docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += docs.length;
      console.log(`✅ ${deletedCount}/${snapshot.size} kayıt silindi...`);
    }
    
    console.log(`\n🎉 Toplam ${deletedCount} kayıt başarıyla silindi!`);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔥 Firestore hizmetler koleksiyonu temizleniyor...\n');
    await deleteCollection('hizmetler');
    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ İşlem başarısız:', error.message);
    process.exit(1);
  }
}

main();
