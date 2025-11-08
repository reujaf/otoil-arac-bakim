# Araç Bakım Kayıt Web Uygulaması

Modern web teknolojileri kullanılarak geliştirilmiş araç bakım kayıt sistemi.

## Teknolojiler

- **Frontend**: React (Vite ile)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **PDF Oluşturma**: jsPDF & jsPDF-autotable
- **Stil**: Tailwind CSS
- **Routing**: React Router DOM

## Kurulum

1. Projeyi klonlayın veya indirin
2. Bağımlılıkları kurun:
```bash
cd arac-bakim-web-sitesi
npm install
```

3. Firebase yapılandırması:
   - Firebase konsoluna gidin (https://console.firebase.google.com)
   - Yeni bir proje oluşturun
   - Authentication (Email/Password), Firestore Database ve Storage servislerini etkinleştirin
   - Web uygulaması için config bilgilerini alın
   - `src/firebaseConfig.js` dosyasındaki placeholder değerleri Firebase config bilgilerinizle değiştirin

4. Firestore Index oluşturma:
   - Firestore konsolunda, "hizmetler" koleksiyonu için bir index oluşturun:
   - Collection: `hizmetler`
   - Fields: `kullaniciId` (Ascending), `hizmetTarihi` (Descending)

5. Uygulamayı çalıştırın:
```bash
npm run dev
```

## Özellikler

### Faz 1: Kimlik Doğrulama
- Email/şifre ile giriş yapma
- Yeni kullanıcı kaydı
- Protected route yapısı

### Faz 2: Hizmet Kayıt Formu
- Müşteri bilgileri (isim, soyisim)
- Araç bilgileri (plaka, model)
- Hizmet bilgileri (tarih, yapılan işlemler, ücret)
- Araç fotoğrafı yükleme

### Faz 3: Veritabanı Entegrasyonu
- Firebase Firestore'a veri kaydetme
- Firebase Storage'a fotoğraf yükleme
- Kullanıcı bazlı veri izolasyonu

### Faz 4: Kayıt Listeleme
- Tüm hizmet kayıtlarını görüntüleme
- Detaylı bilgi görüntüleme
- Tarih sıralaması

### Faz 5: PDF ve WhatsApp Entegrasyonu
- PDF hizmet formu oluşturma
- WhatsApp ile paylaşım linki

### Faz 6: Periyodik Bakım Hatırlatıcısı
- Otomatik bakım tarihi hesaplama (6 ay)
- Yaklaşan bakımlar için bildirim sistemi
- 1 hafta içindeki bakımlar için uyarı

## Kullanım

1. Uygulamaya giriş yapın veya yeni hesap oluşturun
2. Ana sayfada yeni hizmet kaydı oluşturun
3. Kayıtları listeleyin ve detaylarını görüntüleyin
4. PDF oluşturun veya WhatsApp ile paylaşın
5. Bildirimler bölümünden yaklaşan bakımları takip edin

## Notlar

- Firebase Storage kurallarını yapılandırmanız gerekebilir
- Firestore güvenlik kurallarını yapılandırmanız önerilir
- WhatsApp paylaşımı sadece metin gönderir, PDF'i manuel olarak eklemeniz gerekir

## Lisans

Bu proje özel kullanım içindir.
