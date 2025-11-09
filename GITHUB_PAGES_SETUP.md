# GitHub Pages Deploy Kurulum Rehberi

Bu proje artık GitHub Pages'e otomatik deploy ediliyor.

## Otomatik Deploy

Her `git push` işlemi GitHub Actions tarafından otomatik olarak:
1. Projeyi build eder
2. GitHub Pages'e deploy eder

## Site URL

- **GitHub Pages URL**: https://reujaf.github.io/otoil-arac-bakim/
- **Deploy durumu**: https://github.com/reujaf/otoil-arac-bakim/actions

## GitHub Pages Ayarları

### 1. Repository Settings'e Git
1. GitHub repository'nize gidin: https://github.com/reujaf/otoil-arac-bakim
2. **Settings** sekmesine tıklayın
3. Sol menüden **Pages** seçin

### 2. Source Ayarları
1. **Source** bölümünde:
   - **Deploy from a branch** seçin
   - **Branch**: `gh-pages` veya **GitHub Actions** seçin
   - **Folder**: `/ (root)` veya `/dist` (GitHub Actions kullanıyorsanız otomatik)

### 3. GitHub Actions Kullanımı (Önerilen)
- `.github/workflows/deploy.yml` dosyası otomatik deploy yapacak
- Her push'ta otomatik build ve deploy
- Build durumunu Actions sekmesinden takip edebilirsiniz

## Deploy Komutu

```bash
# Sadece Git push yapın, GitHub Actions otomatik deploy edecek
./deploy.sh "Commit mesajı"
```

veya

```bash
git add .
git commit -m "Mesaj"
git push
```

## Build Ayarları

- **Base path**: `/otoil-arac-bakim/` (vite.config.js'de ayarlandı)
- **Build command**: `npm run build`
- **Output directory**: `arac-bakim-web-sitesi/dist`

## Önemli Notlar

1. **Base Path**: GitHub Pages için base path `/otoil-arac-bakim/` olarak ayarlandı
2. **Custom Domain**: Eğer custom domain kullanmak isterseniz:
   - Repository Settings → Pages → Custom domain
   - Domain'i ekleyin
   - `vite.config.js`'de base path'i `/` yapın

3. **Firebase**: Firebase yapılandırması aynı kalacak, sadece hosting GitHub Pages'e taşındı

## Sorun Giderme

### Deploy çalışmıyor
1. GitHub Actions sekmesine gidin
2. Son workflow'u kontrol edin
3. Hata mesajlarını inceleyin

### Site açılmıyor
1. Repository Settings → Pages kontrol edin
2. Source'un doğru ayarlandığından emin olun
3. GitHub Actions'ın tamamlandığını kontrol edin

### Base path sorunu
- Eğer custom domain kullanıyorsanız `vite.config.js`'de base path'i `/` yapın
- GitHub Pages subpath kullanıyorsanız `/otoil-arac-bakim/` olarak kalmalı

