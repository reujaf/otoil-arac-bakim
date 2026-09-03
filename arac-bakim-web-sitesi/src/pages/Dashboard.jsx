import { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import logo from '../assets/otoil-logo.png';

const OTOILAI_WORKER_URL = import.meta.env.VITE_OTOILAI_WORKER_URL || 'https://otoil-gemini.burakksipahi.workers.dev';
const OTOILAI_CACHE_KEY_DATE = 'otoil_ai_last_fetch_date';
const OTOILAI_CACHE_KEY_TEXT = 'otoil_ai_last_text';
const OTOILAI_CACHE_KEY_TRUNCATED = 'otoil_ai_truncated';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Sayıyı 0'dan hedef değere hızlıca animasyonlu şekilde sayar.
 */
function AnimatedNumber({ value, format = (v) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(null);

  useEffect(() => {
    const to = Number(value) || 0;
    // İlk çalıştırmada 0'dan başla, sonrakinde önceki değerden
    const from = prevValue.current === null ? 0 : prevValue.current;
    prevValue.current = to;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const duration = 2000;
    const startTime = performance.now();
    let raf;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // easeInOutQuint: çok belirgin yavaş başlangıç ve bitiş
      const eased = progress < 0.5
        ? 16 * progress ** 5
        : 1 - Math.pow(-2 * progress + 2, 5) / 2;
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(to); // Tam değeri garanti yaz
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tabular-nums">{format(display)}</span>;
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
  const [menuAcik, setMenuAcik] = useState(false); // hesap menüsü açık mı

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

  // Bugünün tarihi/selamlama
  const now = new Date();
  const saat = now.getHours();
  const selam = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  const bugunStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const haftalikToplam = gunlukCiroVerileri.reduce((t, g) => t + g.ciro, 0);
  const hizmetSayisiBugun = hizmetlerListesi.filter((h) => {
    if (!h.hizmetTarihi) return false;
    const d = h.hizmetTarihi.toDate();
    const b = new Date(); b.setHours(0, 0, 0, 0);
    return d >= b;
  }).length;

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-28">
      {/* HERO HEADER */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-16">
        {/* Üstten aşağı yumuşak beyaz geçiş (fade) */}
        <div className="header-fade-overlay" />
        {/* dekoratif şekiller */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />
        <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full border border-white/15" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-start justify-between mb-7">
            <img src={logo} alt="OTOIL" className="h-9 w-auto cursor-pointer" onClick={() => navigate('/')} />
            <div className="relative z-10 flex items-center gap-2">
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  menuAcik ? 'max-w-40 opacity-100 translate-x-0' : 'max-w-0 opacity-0 translate-x-4'
                }`}
              >
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-white text-[#0c4a6e] px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm hover:bg-sky-50 transition-colors active:scale-95 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Hesap Değiştir
                </button>
              </div>
              <button
                onClick={() => setMenuAcik((v) => !v)}
                title="Hesap"
                className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-white/70 hover:bg-white text-[#0c4a6e] transition-all active:scale-95 ${menuAcik ? 'ring-2 ring-white' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-white/70 text-sm font-medium">{selam} 👋</p>
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 capitalize">{bugunStr}</h1>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sky-100/80 text-xs font-semibold uppercase tracking-wider">Bugünün Cirosu</p>
              <p className="text-white text-4xl font-extrabold mt-1 tracking-tight">
                <AnimatedNumber value={bugunCiro} /> <span className="text-2xl text-sky-200">₺</span>
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-md px-4 py-2.5 text-center">
              <p className="text-white text-xl font-bold tabular-nums"><AnimatedNumber value={hizmetSayisiBugun} format={(v) => Math.round(v).toString()} /></p>
              <p className="text-sky-100/80 text-[10px] font-medium uppercase tracking-wide">Bugünkü İşlem</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-10 relative z-20 space-y-4">
        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="group bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:ring-slate-300">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Aylık Ciro</p>
            <p className="text-slate-800 text-xl font-bold mt-0.5"><AnimatedNumber value={aylikCiro} /> ₺</p>
          </div>
          <div className="group bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:ring-slate-300">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#26a9e0] to-indigo-500 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Toplam Ciro</p>
            <p className="text-slate-800 text-xl font-bold mt-0.5"><AnimatedNumber value={tumZamanlarCiro} /> ₺</p>
          </div>
        </div>

        {/* GRAFİK */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Haftalık Performans</p>
              <h2 className="text-base font-bold text-slate-800">Son 7 Gün</h2>
            </div>
            <div className="bg-sky-50 rounded-md px-3 py-1.5 ring-1 ring-sky-100">
              <span className="text-[#1273a8] text-xs font-bold tabular-nums">{fmt(haftalikToplam)} ₺</span>
            </div>
          </div>
          {gunlukCiroVerileri.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={gunlukCiroVerileri} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26a9e0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#26a9e0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="gun" stroke="#94a3b8" style={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 16, boxShadow: '0 8px 30px rgba(15,23,42,0.12)', fontSize: 13, padding: '10px 14px' }}
                  formatter={(v) => [`${fmt(v)} ₺`, 'Ciro']}
                  labelFormatter={(_, p) => p?.[0]?.payload?.tarih || ''}
                />
                <Area type="monotone" dataKey="ciro" stroke="#26a9e0" strokeWidth={3} fill="url(#ciroGrad)" fillOpacity={1} animationDuration={800} baseValue={0}
                  activeDot={{ r: 5, fill: '#fff', stroke: '#26a9e0', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[190px] flex items-center justify-center text-slate-400 text-sm animate-pulse">Veri yükleniyor...</div>
          )}
        </div>

        {/* OtoilAI */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-[#0c4a6e] rounded-lg p-5">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#26a9e0]/20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#26a9e0] to-indigo-500 flex items-center justify-center ring-1 ring-white/20">
                <span className="text-white text-lg font-extrabold">AI</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  OtoilAI
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-white/10 text-sky-300 px-2 py-0.5 rounded-sm ring-1 ring-white/15">Beta</span>
                </h2>
                <p className="text-slate-400 text-xs">Kayıtlarınıza göre günlük iş stratejileri</p>
              </div>
            </div>
            {OTOILAI_WORKER_URL ? (
              <>
                <button
                  onClick={fetchOtoilAiStrategies}
                  disabled={otoilAiLoading || (!!otoilAiText && otoilAiCacheUsed)}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4] hover:brightness-110 text-white px-5 py-3 rounded-md text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
                    <>✓ Bugünkü stratejiler yüklendi</>
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
                  <p className="mt-3 text-sm text-red-300 bg-red-500/10 ring-1 ring-red-500/20 rounded-md px-4 py-2.5">{otoilAiError}</p>
                )}
                {otoilAiText && (
                <div className="mt-4 rounded-md bg-white/[0.06] ring-1 ring-white/10 overflow-hidden backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setOtoilAiExpanded((e) => !e)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-200">
                        Günlük stratejiler {otoilAiCacheUsed && <span className="text-slate-500 font-normal">(günde bir kez güncellenir)</span>}
                      </span>
                      <svg
                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${otoilAiExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {otoilAiExpanded && (
                      <>
                        {otoilAiTruncated && (
                          <p className="px-4 pb-2 text-amber-300 text-xs bg-amber-500/10 border-b border-white/5">
                            Metin API token limiti nedeniyle kesilmiş olabilir.
                          </p>
                        )}
                        <div className="px-4 pb-4 pt-1 max-h-[60vh] min-h-[120px] overflow-y-auto text-slate-300 text-sm whitespace-pre-wrap leading-relaxed scroll-smooth">
                          {otoilAiText}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">
                OtoilAI için Cloudflare Worker kurulumu ve <code className="bg-white/10 px-1.5 py-0.5 rounded-sm text-sky-300">VITE_OTOILAI_WORKER_URL</code> ayarı gerekiyor.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
