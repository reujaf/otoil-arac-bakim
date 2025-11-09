# GitHub - Netlify Entegrasyonu Kurulum Rehberi

Bu rehber, Netlify'ı GitHub repository'nize bağlayarak otomatik deploy kurulumunu açıklar.

## Adım 1: Netlify Dashboard'a Giriş

1. https://app.netlify.com adresine gidin
2. Hesabınıza giriş yapın

## Adım 2: Site Ayarlarına Git

1. Dashboard'da **otoil-arac-bakim** sitesini bulun
2. Site'ın üzerine tıklayın
3. Sol menüden **Site settings** seçin

## Adım 3: Build & Deploy Ayarları

1. **Build & deploy** sekmesine tıklayın
2. **Continuous Deployment** bölümüne gidin
3. **Link to Git provider** butonuna tıklayın

## Adım 4: GitHub Bağlantısı

1. **GitHub** seçeneğini seçin
2. GitHub hesabınızla giriş yapın (gerekirse)
3. Repository erişim izni verin
4. **otoil-arac-bakim** repository'sini seçin

## Adım 5: Build Ayarlarını Kontrol Et

Netlify otomatik olarak `netlify.toml` dosyasındaki ayarları kullanacak:

```toml
[build]
  base = "arac-bakim-web-sitesi"
  command = "npm install && npm run build"
  publish = "arac-bakim-web-sitesi/dist"
```

## Adım 6: İlk Deploy

1. **Trigger deploy** butonuna tıklayın
2. Veya GitHub'a bir commit push edin
3. Netlify otomatik olarak deploy edecek

## Sonuç

✅ Artık her `git push` işlemi otomatik olarak Netlify'a deploy edilecek
✅ Netlify CLI kullanmaya gerek yok
✅ Ücretsiz plan için build minutes limiti var ama genelde yeterli

## Notlar

- Netlify ücretsiz planında aylık 300 build minutes var
- Her deploy yaklaşık 2-3 dakika sürer
- GitHub entegrasyonu kurulduktan sonra `deploy.sh` script'i sadece Git push için kullanılabilir

## Alternatif: Sadece Git Push

GitHub entegrasyonu kurulduktan sonra deploy script'ini sadece Git push için kullanabilirsiniz:

```bash
# Sadece Git push (Netlify otomatik deploy edecek)
git add .
git commit -m "Mesaj"
git push
```

