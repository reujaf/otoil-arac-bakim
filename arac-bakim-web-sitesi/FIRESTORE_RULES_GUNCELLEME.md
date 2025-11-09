# Firestore Güvenlik Kuralları Güncelleme Rehberi

## Sorun
Şu anda Firestore güvenlik kuralları sadece kendi kayıtlarınızı görmenize izin veriyor. Bu yüzden farklı kullanıcılarla giriş yaptığınızda önceki kayıtlar görünmüyor.

## Çözüm
Firebase Console'dan güvenlik kurallarını güncellemeniz gerekiyor.

### Adımlar:

1. **Firebase Console'a gidin:**
   - https://console.firebase.google.com
   - Projenizi seçin: **otoil-db-4cc57**

2. **Firestore Database'e gidin:**
   - Sol menüden **Firestore Database** → **Rules** sekmesine tıklayın

3. **Güvenlik kurallarını güncelleyin:**
   Aşağıdaki kuralları kopyalayıp yapıştırın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hizmetler koleksiyonu - tüm giriş yapmış kullanıcılar tüm kayıtları görebilir ve ekleyebilir
    match /hizmetler/{hizmetId} {
      allow read, write, create, update, delete: if request.auth != null;
    }
  }
}
```

4. **Kuralları yayınlayın:**
   - **Publish** butonuna tıklayın
   - Onay mesajını bekleyin

5. **Test edin:**
   - Uygulamayı yenileyin
   - Artık tüm kullanıcılar tüm kayıtları görebilecek

## Önemli Notlar

- Bu kurallar, giriş yapmış tüm kullanıcıların tüm kayıtları görmesine ve düzenlemesine izin verir
- Güvenlik için sadece giriş yapmış kullanıcılar erişebilir (`request.auth != null`)
- Eğer daha sıkı güvenlik istiyorsanız, kuralları daha detaylı yapılandırabilirsiniz

## Alternatif: Firebase CLI ile Güncelleme

Eğer Firebase CLI kuruluysa, terminalden şu komutu çalıştırabilirsiniz:

```bash
cd arac-bakim-web-sitesi
firebase deploy --only firestore:rules
```

Bu komut `firestore.rules` dosyasındaki kuralları otomatik olarak Firebase'e yükler.

