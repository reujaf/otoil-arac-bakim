# Araç Kontrol Ekranı (Check-up) ve Sekmeli Kayıt Ekleme Planı

Bu plan, Kayıt Ekleme sayfasına tab (sekme) yapısı getirilmesini ve gönderilen görsellerdeki **Araç Kontrol Ekranı (Mekanik Durum, Ötme/Ses Kontrolleri ve Kaçak/Hasar Testleri)** checklist'inin entegre edilmesini kapsamaktadır.

## User Review Required

> [!IMPORTANT]
> **Firestore Veri Yapısı Güncellemesi**:
> Yeni eklenen kontrol ekranındaki veriler `hizmetler` koleksiyonundaki dokümanlara `kontrolListesi` (Map/Object) olarak kaydedilecektir. Eski kayıtlar bu alana sahip olmasa dahi sistem geriye dönük uyumlu çalışacaktır.

> [!TIP]
> **Mobil Kullanılabilirlik (Responsive Design)**:
> Servis ustalarının mobil cihazlarda hızlıca tıklayabilmesi için masaüstünde görseldeki gibi renk kodlu şık tablolar, mobilde ise geniş dokunmatik radyo butonları/pill'ler ve hızlı doldurma ("Tümünü İyi/Yok Yap") seçeneği sunulacaktır.

## Proposed Changes

---

### Frontend Components

#### [MODIFY] [HizmetKayitFormu.jsx](file:///Users/burak/Desktop/otoil-arac-bakim/arac-bakim-web-sitesi/src/components/HizmetKayitFormu.jsx)
- Form üst kısmına 2 Sekmeli (Tab) gezinti eklenecek:
  1. **Genel Hizmet Bilgileri** (Müşteri, Araç, Tarih, Ücret, Yapılan İşlemler)
  2. **Araç Kontrol Ekranı (Check-up)** (Ekran görüntülerindeki tüm mekanik, kaçak ve ses kontrolleri)
- `kontrolListesi` state'i tanımlanacak (İyi/Orta/Kötü, Var/Yok, Yok/Yapılmadı/Var ve Açıklamalar).
- Hızlı doldurma butonu: "Tümünü Normal/İyi İşaretle".
- Kayıt yapıldığında `kontrolListesi` nesnesi de Firestore'a aktarılacak.

#### [MODIFY] [BakimMerkezi.jsx](file:///Users/burak/Desktop/otoil-arac-bakim/arac-bakim-web-sitesi/src/pages/BakimMerkezi.jsx) & [HizmetListesi.jsx](file:///Users/burak/Desktop/otoil-arac-bakim/arac-bakim-web-sitesi/src/components/HizmetListesi.jsx)
- Kayıt detay modalında "Araç Kontrol Ekranı" verilerinin gösterilmesi.
- Düzenleme (Edit) modalında kontrol ekranı verilerinin düzenlenebilmesi.
- PDF oluşturma fonksiyonunda (`handlePDFOlustur`), eğer kontrol ekranında işaretlenmiş/olumsuz veya açıklamalı öğeler varsa bunların PDF formuna profesyonel bir tablo olarak eklenmesi.

---

## Verification Plan

### Automated / Build Tests
- Local Vite dev server başlatılacak (`npm run dev`).
- Lint veya build hatası olup olmadığı kontrol edilecek (`npm run build`).

### Manual Verification
1. Sekmeler (Tabs) arası geçiş düzgün çalışıyor mu?
2. Mobil boyutta (Responsive) butonlar ve inputlar rahat tıklanabiliyor mu?
3. Görsellerdeki tüm 45+ kontrol kalemi (Akü, Balata, Körükler, Kaçaklar, Ötme vb.) doğru kategorilerle listeleniyor mu?
4. Kayıt oluşturulduğunda Firestore'a kaydediliyor mu ve Bakım Merkezi detayında / PDF çıktısında gözüküyor mu?
