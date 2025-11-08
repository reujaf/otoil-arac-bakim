# Deploy Kullanım Kılavuzu

## Hızlı Deploy

### Yöntem 1: Script ile (Önerilen)
```bash
cd /Users/burak/Desktop/otoil-arac-bakim
./deploy.sh "Commit mesajınız buraya"
```

### Yöntem 2: NPM Script ile
```bash
cd /Users/burak/Desktop/otoil-arac-bakim/arac-bakim-web-sitesi
npm run deploy
```
(Not: NPM script commit mesajı için "Güncelleme" kullanır)

## Manuel Deploy

Eğer script kullanmak istemezseniz:

```bash
# 1. Git durumunu kontrol et
cd /Users/burak/Desktop/otoil-arac-bakim
git status

# 2. Değişiklikleri ekle
git add .

# 3. Commit yap
git commit -m "Commit mesajınız"

# 4. Push yap
git push

# 5. Build ve deploy
cd arac-bakim-web-sitesi
npm run build
netlify deploy --prod --dir=dist
```

## Script Özellikleri

- ✅ Otomatik git add, commit, push
- ✅ Otomatik build
- ✅ Otomatik Netlify deploy
- ✅ Renkli çıktı
- ✅ Hata kontrolü

