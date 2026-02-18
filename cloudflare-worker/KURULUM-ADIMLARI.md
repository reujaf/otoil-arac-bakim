# OtoilAI Worker – Adım Adım Kurulum

API anahtarınız hazır. Aşağıdaki adımları **sırayla** kendi terminalinizde (PowerShell veya CMD) çalıştırın.

---

## Adım 1: Worker klasörüne gir

```powershell
cd C:\Users\BLale\otoil\otoil-arac-bakim\cloudflare-worker
```

---

## Adım 2: Wrangler’ı yükle

```powershell
npm install
```

(Bu komut `package.json` içindeki `wrangler` paketini yükler.)

---

## Adım 3: Cloudflare’e giriş yap

```powershell
npx wrangler login
```

- Tarayıcı açılacak; Cloudflare hesabınızla giriş yapın.
- Hesabınız yoksa https://dash.cloudflare.com/sign-up ile ücretsiz oluşturun.
- Girişten sonra terminalde “Successfully logged in” benzeri bir mesaj göreceksiniz.

---

## Adım 4: Gemini API anahtarını Worker’a secret olarak ekle

```powershell
npx wrangler secret put GEMINI_API_KEY
```

- Komut çalışınca **Enter a secret value:** yazacak.
- Buraya **aldığınız Gemini API anahtarını** yapıştırın (Ctrl+V) ve Enter’a basın.
- Anahtar ekranda görünmez; bu normal.

---

## Adım 5: Worker’ı yayına al

```powershell
npx wrangler deploy
```

- İlk seferde “Create project?” gibi bir soru çıkarsa **y** deyip Enter’a basın.
- En sonda şöyle bir satır göreceksiniz:
  - **Published otoil-gemini (x.xx sec)**
  - **https://otoil-gemini.<sizin-kullanici-adiniz>.workers.dev**

Bu **https://...** adresini kopyalayın.

---

## Adım 6: Frontend’e Worker adresini yaz

1. `arac-bakim-web-sitesi` klasöründe `.env` dosyası oluşturun (yoksa).
2. İçine şunu yazın (URL’yi kendi Worker adresinizle değiştirin):

```env
VITE_OTOILAI_WORKER_URL=https://otoil-gemini.SIZIN-KULLANICI-ADINIZ.workers.dev
```

3. Projeyi yeniden başlatın:

```powershell
cd C:\Users\BLale\otoil\otoil-arac-bakim\arac-bakim-web-sitesi
npm run dev
```

---

## Özet

| Adım | Komut / İşlem |
|------|----------------|
| 1 | `cd ...\cloudflare-worker` |
| 2 | `npm install` |
| 3 | `npx wrangler login` (tarayıcıda giriş) |
| 4 | `npx wrangler secret put GEMINI_API_KEY` (API anahtarını yapıştır) |
| 5 | `npx wrangler deploy` (çıkan URL’yi kopyala) |
| 6 | `.env` içine `VITE_OTOILAI_WORKER_URL=...` yaz, `npm run dev` |

Bir adımda takılırsanız o adımın çıktısını veya hata mesajını paylaşırsanız, bir sonraki komutu birlikte netleştirebiliriz.
