# Netlify "Project has been paused" Sorunu Çözümü

## Sorun
Netlify Dashboard'da "Project has been paused" mesajı görünüyor.

## Neden Olur?
1. **Build minutes limiti aşıldı** (ücretsiz plan: 300 dakika/ay)
2. **Hesap askıya alındı**
3. **Ödeme sorunu**

## Çözüm Adımları

### 1. Netlify Dashboard'a Giriş
- https://app.netlify.com adresine gidin
- Hesabınıza giriş yapın

### 2. Site Ayarlarını Kontrol Et
1. Site'ınızı seçin (otoil-arac-bakim)
2. **Site settings** → **General** sekmesine gidin
3. **Site details** bölümünde durumu kontrol edin

### 3. Projeyi Aktif Hale Getirme

#### Seçenek A: Build Minutes Limitini Kontrol Et
1. Dashboard'da üst menüden **Team overview** veya **Billing** seçin
2. **Build minutes** kullanımını kontrol edin
3. Limit aşıldıysa:
   - Yeni ay başlamasını bekleyin (aylık limit sıfırlanır)
   - Veya **Pro plan**'a geçin (1000 dakika/ay)

#### Seçenek B: Site'ı Unpause Et
1. Site settings → **General** sekmesine gidin
2. **Site details** bölümünde **Unpause site** butonunu arayın
3. Varsa tıklayın

#### Seçenek C: Yeni Site Oluştur (Geçici Çözüm)
1. Netlify Dashboard'da **Add new site** → **Import an existing project**
2. GitHub repository'nizi tekrar bağlayın
3. Build ayarlarını yapın
4. Yeni site aktif olacak

### 4. Build Minutes Tasarrufu İçin Öneriler
- Gereksiz deploy'ları azaltın
- Sadece `main` branch'ine deploy yapın
- Preview deploy'ları devre dışı bırakın (isteğe bağlı)

## Alternatif: Manuel Deploy (Geçici Çözüm)

Build minutes limiti aşıldıysa, manuel deploy yapabilirsiniz:

```bash
cd arac-bakim-web-sitesi
npm run build
# dist klasörünü Netlify Dashboard'dan manuel yükleyin
```

## Kalıcı Çözüm

1. **Netlify Pro Plan** ($19/ay) - 1000 build minutes
2. **Netlify Team Plan** - Daha fazla build minutes
3. **Build minutes satın al** - Ekstra minutes ekleyin

## Kontrol Listesi

- [ ] Netlify Dashboard'a giriş yapıldı
- [ ] Build minutes kullanımı kontrol edildi
- [ ] Site settings kontrol edildi
- [ ] Unpause butonu arandı
- [ ] Gerekirse yeni ay bekleniyor veya plan yükseltildi

