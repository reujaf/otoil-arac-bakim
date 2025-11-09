# Cloudflare Pages Deploy Kurulum Rehberi

Bu proje **React + Vite** ile yazılmıştır.

## Cloudflare Pages Ayarları

Cloudflare Pages dashboard'unda aşağıdaki ayarları yapın:

### Build Ayarları

1. **Framework preset**: `Vite` veya `React` seçin
2. **Build command**: `npm run build`
3. **Build output directory**: `dist`
4. **Root directory**: `arac-bakim-web-sitesi` (eğer monorepo ise)

### Alternatif Manuel Ayarlar

Eğer framework preset seçeneği yoksa:

- **Build command**: `cd arac-bakim-web-sitesi && npm install && npm run build`
- **Build output directory**: `arac-bakim-web-sitesi/dist`
- **Root directory**: (boş bırakın veya proje root'u)

### Ortam Değişkenleri

Eğer Firebase veya başka environment variable'lar kullanıyorsanız, Cloudflare Pages'de **Environment variables** bölümünden ekleyin.

### Önemli Notlar

1. **Base Path**: Cloudflare Pages için `vite.config.js`'de base path `/` olmalı (GitHub Pages için `/otoil-arac-bakim/` idi)
2. **404 Sayfası**: SPA routing için `dist/404.html` dosyası oluşturulmalı (package.json'da build:404 script'i var)
3. **Node Version**: Cloudflare Pages genellikle Node.js 18+ kullanır

## Build Komutu Detayları

```bash
cd arac-bakim-web-sitesi
npm install
npm run build
```

Build çıktısı `arac-bakim-web-sitesi/dist` klasöründe oluşacak.

## Vite Config Güncellemesi

Cloudflare Pages için base path'i `/` yapmalısınız. `vite.config.js` dosyasını kontrol edin:

```javascript
const basePath = process.env.NODE_ENV === 'production' ? '/' : '/';
```

Eğer GitHub Pages'den Cloudflare Pages'e geçiyorsanız, base path'i `/` yapın.

