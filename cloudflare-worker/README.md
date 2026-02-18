# Otoil Gemini Worker

Bu Worker, frontend uygulamasından gelen istekleri **Google Gemini 1.5** API'ye iletir. API anahtarınız yalnızca Worker ortamında tutulur, tarayıcıda görünmez.

## Gereksinimler

- [Cloudflare](https://dash.cloudflare.com) hesabı
- [Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden Gemini API anahtarı

## 1. Gemini API anahtarı alma

1. https://aistudio.google.com/app/apikey adresine gidin.
2. Google ile giriş yapın.
3. "Create API key" ile yeni anahtar oluşturun (veya mevcut projeyi seçin).
4. Anahtarı kopyalayın (örn. `AIza...` ile başlar).

## 2. Cloudflare Worker kurulumu

### Wrangler CLI kurulumu (ilk kez)

```bash
npm install -g wrangler
```

Ardından Cloudflare ile giriş yapın:

```bash
wrangler login
```

### Worker dizinine geçin

```bash
cd cloudflare-worker
```

### API anahtarını secret olarak ekleyin

```bash
wrangler secret put GEMINI_API_KEY
```

Komut çalışınca anahtarınızı yapıştırıp Enter'a basın.

### Worker'ı yayına alın

```bash
wrangler deploy
```

Deploy sonunda şuna benzer bir URL göreceksiniz:

```
https://otoil-gemini.<sizin-subdomain>.workers.dev
```

Bu URL'yi kopyalayın; frontend'de `VITE_OTOILAI_WORKER_URL` olarak kullanacaksınız.

## 3. Frontend ayarı

Proje kökünde (arac-bakim-web-sitesi içinde veya bir üst dizinde) `.env` dosyası oluşturun:

```env
VITE_OTOILAI_WORKER_URL=https://otoil-gemini.<sizin-subdomain>.workers.dev
```

Deploy ettiğiniz Worker URL'sini buraya yapıştırın. Uygulamayı yeniden başlatın (`npm run dev`).

## API kullanımı

Frontend'den Worker'a **POST** isteği atılır:

- **URL:** `VITE_OTOILAI_WORKER_URL` (örn. `https://otoil-gemini.xxx.workers.dev`)
- **Body (JSON):** `{ "context": "Buraya kayıt özeti metni..." }`
- **Yanıt:** `{ "text": "Gemini'nin ürettiği strateji metni" }`

Hata durumunda: `{ "error": "Hata mesajı" }` döner.
