import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

const OTOILAI_WORKER_URL = import.meta.env.VITE_OTOILAI_WORKER_URL || 'https://otoil-gemini.burakksipahi.workers.dev';
const OTOILAI_CACHE_KEY_DATE = 'otoil_ai_last_fetch_date';
const OTOILAI_CACHE_KEY_TEXT = 'otoil_ai_last_text';
const OTOILAI_CACHE_KEY_TRUNCATED = 'otoil_ai_truncated';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [bugunCiro, setBugunCiro] = useState(0);
  const [aylikCiro, setAylikCiro] = useState(0);
  const [tumZamanlarCiro, setTumZamanlarCiro] = useState(0);
  const [gunlukCiroVerileri, setGunlukCiroVerileri] = useState([]);
  const [hizmetlerListesi, setHizmetlerListesi] = useState([]);

  const [otoilAiLoading, setOtoilAiLoading] = useState(false);
  const [otoilAiText, setOtoilAiText] = useState('');
  const [otoilAiError, setOtoilAiError] = useState('');
  const [otoilAiCacheUsed, setOtoilAiCacheUsed] = useState(false);
  const [otoilAiTruncated, setOtoilAiTruncated] = useState(false);
  const [otoilAiExpanded, setOtoilAiExpanded] = useState(false); // strateji metni kutusu açık mı

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  // OtoilAI: bugün için önbellekte sonuç varsa sayfa açılışında göster (API çağrısı yapma)
  useEffect(() => {
    if (!OTOILAI_WORKER_URL) return;
    try {
      const lastDate = localStorage.getItem(OTOILAI_CACHE_KEY_DATE);
      const lastText = localStorage.getItem(OTOILAI_CACHE_KEY_TEXT);
      if (lastDate === getTodayKey() && lastText) {
        setOtoilAiText(lastText);
        setOtoilAiCacheUsed(true);
        const truncated = localStorage.getItem(OTOILAI_CACHE_KEY_TRUNCATED);
        setOtoilAiTruncated(truncated === 'true');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'hizmetler'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hizmetListesi = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setHizmetlerListesi(hizmetListesi);

      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);
      const bugunSonu = new Date(bugun);
      bugunSonu.setHours(23, 59, 59, 999);
      const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
      const aySonu = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0, 23, 59, 59, 999);

      setBugunCiro(
        hizmetListesi
          .filter((h) => { if (!h.hizmetTarihi) return false; const d = h.hizmetTarihi.toDate(); return d >= bugun && d <= bugunSonu; })
          .reduce((t, h) => t + (h.alınanUcret || 0), 0)
      );

      setAylikCiro(
        hizmetListesi
          .filter((h) => { if (!h.hizmetTarihi) return false; const d = h.hizmetTarihi.toDate(); return d >= ayBasi && d <= aySonu; })
          .reduce((t, h) => t + (h.alınanUcret || 0), 0)
      );

      setTumZamanlarCiro(hizmetListesi.reduce((t, h) => t + (h.alınanUcret || 0), 0));

      const veriler = [];
      for (let i = 6; i >= 0; i--) {
        const tarih = new Date(bugun);
        tarih.setDate(tarih.getDate() - i);
        const gs = new Date(tarih); gs.setHours(0, 0, 0, 0);
        const ge = new Date(tarih); ge.setHours(23, 59, 59, 999);
        const ciro = hizmetListesi
          .filter((h) => { if (!h.hizmetTarihi) return false; const d = h.hizmetTarihi.toDate(); return d >= gs && d <= ge; })
          .reduce((t, h) => t + (h.alınanUcret || 0), 0);
        veriler.push({
          gun: tarih.toLocaleDateString('tr-TR', { weekday: 'short' }),
          ciro,
          tarih: tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        });
      }
      setGunlukCiroVerileri(veriler);
    }, (error) => console.error('Veri çekme hatası:', error));

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } catch (e) { console.error(e); }
  };

  const fmt = (v) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getMusteriAdi = (h) => h?.adSoyad || (h?.isim || h?.soyisim ? `${h.isim || ''} ${h.soyisim || ''}`.trim() : '-');

  const fetchOtoilAiStrategies = async () => {
    if (!OTOILAI_WORKER_URL) {
      setOtoilAiError('OtoilAI için Worker URL ayarlanmamış. .env dosyasında VITE_OTOILAI_WORKER_URL tanımlayın.');
      return;
    }
    // Günde en fazla 1 istek: bugün için önbellek varsa API çağırma
    try {
      const lastDate = localStorage.getItem(OTOILAI_CACHE_KEY_DATE);
      if (lastDate === getTodayKey()) {
        const cached = localStorage.getItem(OTOILAI_CACHE_KEY_TEXT);
        if (cached) {
          setOtoilAiText(cached);
          setOtoilAiCacheUsed(true);
          setOtoilAiError('');
          return;
        }
      }
    } catch (_) {}
    setOtoilAiError('');
    setOtoilAiText('');
    setOtoilAiCacheUsed(false);
    setOtoilAiLoading(true);

    const haftalikMetin = gunlukCiroVerileri
      .map((g) => `${g.gun}: ${fmt(g.ciro)} ₺`)
      .join(', ');

    const sonKayitlar = hizmetlerListesi
      .slice(0, 30)
      .map((h) => {
        const tarih = h.hizmetTarihi ? h.hizmetTarihi.toDate().toLocaleDateString('tr-TR') : '-';
        const ucret = (h.alınanUcret != null) ? fmt(h.alınanUcret) + ' ₺' : '-';
        const islem = (h.yapilanIslemler || '').slice(0, 80);
        return `- ${h.plaka || '-'} | ${getMusteriAdi(h)} | ${tarih} | ${ucret} | ${islem}${islem.length >= 80 ? '...' : ''}`;
      })
      .join('\n');

    const context = `
Tarih: ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

ÖZET:
- Bugünkü ciro: ${fmt(bugunCiro)} ₺
- Bu ayki ciro: ${fmt(aylikCiro)} ₺
- Tüm zamanlar toplam ciro: ${fmt(tumZamanlarCiro)} ₺
- Toplam hizmet kayıt sayısı: ${hizmetlerListesi.length}

SON 7 GÜN GÜNLÜK CİRO:
${haftalikMetin}

SON KAYITLAR (plaka | müşteri | tarih | tutar | yapılan işlem özeti):
${sonKayitlar || '(Henüz kayıt yok)'}
`.trim();

    try {
      const res = await fetch(OTOILAI_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtoilAiError(data?.error || 'İstek başarısız.');
        return;
      }
      if (data.error) {
        setOtoilAiError(data.error);
        return;
      }
      const text = data.text || '';
      const truncated = data.finishReason === 'MAX_TOKENS';
      setOtoilAiText(text);
      setOtoilAiCacheUsed(true);
      setOtoilAiTruncated(truncated);
      try {
        localStorage.setItem(OTOILAI_CACHE_KEY_DATE, getTodayKey());
        localStorage.setItem(OTOILAI_CACHE_KEY_TEXT, text);
        localStorage.setItem(OTOILAI_CACHE_KEY_TRUNCATED, truncated ? 'true' : 'false');
      } catch (_) {}
    } catch (err) {
      setOtoilAiError('Bağlantı hatası: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setOtoilAiLoading(false);
    }
  };

  return (
    <div className="glass-bg pb-24">
      <nav className="glass-card-solid sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <img src={logo} alt="OTOIL" className="h-9 w-auto cursor-pointer" onClick={() => navigate('/')} />
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</span>
              <button onClick={handleLogout} className="glass-btn-white text-slate-600 px-3 py-1.5 rounded-xl text-xs font-medium">
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* OtoilAI */}
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#26a9e0] to-[#0c4a6e] flex items-center justify-center shadow-lg shadow-sky-500/20">
              <span className="text-white text-lg font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">OtoilAI</h1>
              <p className="text-slate-500 text-xs">Kayıtlarınıza göre günlük iş stratejileri</p>
            </div>
          </div>
          {OTOILAI_WORKER_URL ? (
            <>
              <button
                onClick={fetchOtoilAiStrategies}
                disabled={otoilAiLoading || (!!otoilAiText && otoilAiCacheUsed)}
                className="glass-btn-blue text-white px-4 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {otoilAiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Stratejiler hazırlanıyor...
                  </>
                ) : otoilAiText && otoilAiCacheUsed ? (
                  <>Bugünkü stratejiler yüklendi (yarın tekrar isteyebilirsiniz)</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Stratejileri Getir
                  </>
                )}
              </button>
              {otoilAiError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{otoilAiError}</p>
              )}
              {otoilAiText && (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOtoilAiExpanded((e) => !e)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/80 transition-colors rounded-2xl"
                  >
                    <span className="text-sm font-medium text-slate-600">
                      Günlük stratejiler {otoilAiCacheUsed && <span className="text-slate-400">(günde bir kez güncellenir)</span>}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${otoilAiExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {otoilAiExpanded && (
                    <>
                      {otoilAiTruncated && (
                        <p className="px-4 pb-2 text-amber-700 text-xs bg-amber-50 border-b border-amber-100/80">
                          Metin API token limiti nedeniyle kesilmiş olabilir (daha uzun metin için Worker’da maxOutputTokens artırılabilir).
                        </p>
                      )}
                      <div className="px-4 pb-4 max-h-[70vh] min-h-[120px] overflow-y-auto text-slate-800 text-sm whitespace-pre-wrap leading-relaxed scroll-smooth">
                        {otoilAiText}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              OtoilAI kullanmak için Cloudflare Worker kurulumu ve <code className="bg-slate-100 px-1 rounded">VITE_OTOILAI_WORKER_URL</code> ayarı gerekiyor. Proje içindeki <code className="bg-slate-100 px-1 rounded">cloudflare-worker/README.md</code> dosyasına bakın.
            </p>
          )}
        </div>

        {/* Grafik */}
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="mb-3">
            <p className="text-slate-400 text-xs font-medium">Haftalık performans</p>
            <h2 className="text-base font-bold text-slate-800">Günlük ciro</h2>
          </div>
          {gunlukCiroVerileri.length > 0 ? (
            <div className="overflow-hidden rounded-xl">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={gunlukCiroVerileri} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#26a9e0" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#26a9e0" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="gun" stroke="#94a3b8" style={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: 13 }}
                    formatter={(v) => [`${fmt(v)} ₺`, 'Ciro']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.tarih || ''}
                  />
                  <Area type="monotone" dataKey="ciro" stroke="#26a9e0" strokeWidth={2.5} fill="url(#ciroGrad)" fillOpacity={1} animationDuration={800} baseValue={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">Veri yükleniyor...</div>
          )}
        </div>

        {/* Bugünün cirosu */}
        <div className="rounded-3xl p-6 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #26a9e0 0%, #0c4a6e 100%)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-medium mb-1">Bugünün cirosu</p>
            <p className="text-white text-3xl font-bold">{fmt(bugunCiro)} ₺</p>
          </div>
        </div>

        {/* Aylık / Tüm zamanlar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-3xl p-5">
            <div className="w-9 h-9 rounded-xl bg-sky-100/80 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-[#26a9e0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-xs font-medium mb-0.5">Aylık ciro</p>
            <p className="text-slate-800 text-lg font-bold">{fmt(aylikCiro)} ₺</p>
          </div>
          <div className="glass-card rounded-3xl p-5">
            <div className="w-9 h-9 rounded-xl bg-sky-100/80 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-[#26a9e0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-slate-400 text-xs font-medium mb-0.5">Toplam ciro</p>
            <p className="text-slate-800 text-lg font-bold">{fmt(tumZamanlarCiro)} ₺</p>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default Dashboard;
