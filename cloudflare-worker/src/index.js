/**
 * Otoil Gemini Proxy Worker
 * Frontend'den gelen istekleri Gemini API'ye iletir. API anahtarı sadece Worker'da tutulur.
 * Not: Her istekte tek bir Gemini çağrısı yapılır; retry veya döngü yok (kota aşımı riski).
 */

// Ücretsiz planda kota: gemini-2.5-flash / gemini-2.5-flash-lite (2.0-flash free tier'da yok).
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.5-flash-lite';

const SYSTEM_PROMPT = `Sen Otoil araç bakım merkezi için günlük iş stratejileri üreten bir asistansın.
Kullanıcı sana işletmenin hizmet kayıtları özetini (ciro, günlük/aylık veriler, son işlemler) verecek.
Buna göre:
- Kısa, uygulanabilir günlük iş geliştirme stratejileri öner (maddeler halinde, 4-6 madde).
- Türkçe yaz, samimi ve profesyonel bir dil kullan.
- Ciro verilerine göre gerçekçi öneriler sun (örn. düşük günlerde müşteri hatırlatma, yüksek günlerde tekrarlayan hizmet vurgulama).
- Ekstra başlık veya "İşte stratejileriniz" gibi giriş cümlesi yazma, doğrudan maddelere geç.`;

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Sadece POST isteği kabul edilir.' }), 405);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: 'GEMINI_API_KEY tanımlı değil.' }), 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Geçersiz JSON.' }), 400);
    }

    const { context } = body;
    if (!context || typeof context !== 'string') {
      return corsResponse(JSON.stringify({ error: 'Body içinde "context" (string) gerekli.' }), 400);
    }

    const userPrompt = `Aşağıda Otoil araç bakım merkezinin güncel kayıt özeti var. Buna göre bugün için iş geliştirme stratejilerini maddeler halinde yaz.\n\n${context}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const geminiUrl = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    try {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        const errMsg = data?.error?.message || geminiRes.statusText;
        return corsResponse(JSON.stringify({ error: 'Gemini hatası: ' + errMsg }), 502);
      }

      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (!text) {
        return corsResponse(JSON.stringify({ error: 'Gemini yanıt üretemedi.' }), 502);
      }

      // finishReason === 'MAX_TOKENS' ise metin token limiti yüzünden kesilmiş demektir
      const finishReason = candidate?.finishReason || null;
      return corsResponse(JSON.stringify({ text, finishReason }));
    } catch (e) {
      return corsResponse(JSON.stringify({ error: 'İstek hatası: ' + e.message }), 502);
    }
  },
};

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
