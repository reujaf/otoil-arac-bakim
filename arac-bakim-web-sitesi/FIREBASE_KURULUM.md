# Firebase Kurulum Rehberi

Bu rehber, Firebase projesini kurmak ve yapılandırmak için adım adım talimatlar içerir.

## Adım 1: Firebase Konsolunda Proje Oluşturma

1. https://console.firebase.google.com adresine gidin
2. Google hesabınızla giriş yapın
3. "Add project" (Proje Ekle) butonuna tıklayın
4. Proje adını girin (örn: "arac-bakim-sistemi")
5. Google Analytics'i etkinleştirmek isteyip istemediğinize karar verin (isteğe bağlı)
6. "Create project" (Proje Oluştur) butonuna tıklayın

## Adım 2: Firebase Servislerini Etkinleştirme

### Authentication (Kimlik Doğrulama)
1. Firebase konsolunda sol menüden "Authentication" seçin
2. "Get started" (Başlayın) butonuna tıklayın
3. "Sign-in method" (Giriş yöntemi) sekmesine gidin
4. "Email/Password" seçeneğini bulun ve "Enable" (Etkinleştir) butonuna tıklayın
5. "Save" (Kaydet) butonuna tıklayın

### Firestore Database
1. Sol menüden "Firestore Database" seçin
2. "Create database" (Veritabanı oluştur) butonuna tıklayın
3. "Start in test mode" (Test modunda başlat) seçeneğini seçin (güvenlik kuralları zaten hazır)
4. Veritabanı konumunu seçin (örn: europe-west1)
5. "Enable" (Etkinleştir) butonuna tıklayın

### Storage
1. Sol menüden "Storage" seçin
2. "Get started" (Başlayın) butonuna tıklayın
3. Güvenlik kuralları için "Start in test mode" seçeneğini seçin (güvenlik kuralları zaten hazır)
4. "Next" (İleri) ve "Done" (Tamam) butonlarına tıklayın

## Adım 3: Web Uygulaması Ekleme

1. Firebase konsolunda, proje ayarlarına gidin (⚙️ ikonu)
2. "Project settings" (Proje ayarları) sekmesinde aşağı kaydırın
3. "Your apps" (Uygulamalarınız) bölümünde web ikonuna (</>) tıklayın
4. Uygulama adını girin (örn: "Araç Bakım Web")
5. "Register app" (Uygulamayı kaydet) butonuna tıklayın
6. **ÖNEMLİ:** Açılan config kodunu kopyalayın (apiKey, authDomain, vb.)

## Adım 4: Firebase Config Bilgilerini Güncelleme

1. Projenizde `src/firebaseConfig.js` dosyasını açın
2. Firebase konsolundan kopyaladığınız config bilgilerini yapıştırın:

```javascript
const firebaseConfig = {
  apiKey: "AIza...", // Firebase konsolundan kopyalayın
  authDomain: "your-project.firebaseapp.com", // Firebase konsolundan kopyalayın
  projectId: "your-project-id", // Firebase konsolundan kopyalayın
  storageBucket: "your-project.appspot.com", // Firebase konsolundan kopyalayın
  messagingSenderId: "123456789", // Firebase konsolundan kopyalayın
  appId: "1:123456789:web:abcdef" // Firebase konsolundan kopyalayın
};
```

## Adım 5: Firebase CLI ile Giriş Yapma

Terminal'de şu komutu çalıştırın:

```bash
npm run firebase:login
```

Bu komut sizi tarayıcıda Firebase'e giriş yapmanız için yönlendirecektir.

## Adım 6: Firebase Proje ID'sini Güncelleme

1. `.firebaserc` dosyasını açın
2. `YOUR_PROJECT_ID` yerine Firebase konsolundan aldığınız proje ID'sini yazın:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Adım 7: Firestore Index Oluşturma

Firestore konsolunda:
1. "Firestore Database" > "Indexes" sekmesine gidin
2. "Create Index" (Index Oluştur) butonuna tıklayın
3. Collection ID: `hizmetler`
4. Fields:
   - `kullaniciId` - Ascending
   - `hizmetTarihi` - Descending
5. "Create" (Oluştur) butonuna tıklayın

**VEYA** otomatik olarak oluşturmak için:

```bash
firebase deploy --only firestore:indexes
```

## Adım 8: Güvenlik Kurallarını Deploy Etme

Güvenlik kurallarını Firebase'e yüklemek için:

```bash
npm run firebase:deploy:firestore
npm run firebase:deploy:storage
```

## Adım 9: Test Etme

1. Uygulamayı çalıştırın: `npm run dev`
2. Tarayıcıda http://localhost:5173 adresine gidin
3. Yeni bir hesap oluşturmayı deneyin
4. Giriş yapmayı deneyin

## Sorun Giderme

### "API key not valid" hatası
- `src/firebaseConfig.js` dosyasındaki config bilgilerinin doğru olduğundan emin olun
- Firebase konsolundan config bilgilerini tekrar kopyalayın

### "Permission denied" hatası
- Firestore ve Storage güvenlik kurallarını deploy ettiğinizden emin olun
- `npm run firebase:deploy:firestore` ve `npm run firebase:deploy:storage` komutlarını çalıştırın

### Index hatası
- Firestore konsolunda index'in oluşturulduğundan emin olun
- Index oluşturma işlemi birkaç dakika sürebilir

## Ek Komutlar

- **Firebase'e giriş yap:** `npm run firebase:login`
- **Tüm servisleri deploy et:** `npm run firebase:deploy`
- **Sadece hosting deploy:** `npm run firebase:deploy:hosting`
- **Sadece Firestore deploy:** `npm run firebase:deploy:firestore`
- **Sadece Storage deploy:** `npm run firebase:deploy:storage`

