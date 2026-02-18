import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [bugunCiro, setBugunCiro] = useState(0);
  const [aylikCiro, setAylikCiro] = useState(0);
  const [tumZamanlarCiro, setTumZamanlarCiro] = useState(0);
  const [gunlukCiroVerileri, setGunlukCiroVerileri] = useState([]);

  const hosgeldinMetni = () => {
    const saat = new Date().getHours();
    if (saat < 12) return 'Günaydın';
    if (saat < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const kullaniciAdi = user?.email?.split('@')[0] || 'Patron';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'hizmetler'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hizmetListesi = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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

  return (
    <div className="glass-bg pb-24">
      {/* Top bar */}
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
        {/* Hoşgeldin */}
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#26a9e0] to-[#0c4a6e] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-sky-500/25">
              {kullaniciAdi.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">{hosgeldinMetni()}!</p>
              <h1 className="text-xl font-bold text-slate-800">{kullaniciAdi}</h1>
            </div>
          </div>
        </div>

        {/* Grafik */}
        <div className="glass-card rounded-3xl p-5 mb-4">
          <div className="mb-3">
            <p className="text-slate-400 text-xs font-medium">Haftalık performans</p>
            <h2 className="text-base font-bold text-slate-800">Günlük ciro</h2>
          </div>
          {gunlukCiroVerileri.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={gunlukCiroVerileri} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <defs>
                  <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26a9e0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#26a9e0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="gun" stroke="#94a3b8" style={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontSize: 13 }}
                  formatter={(v) => [`${fmt(v)} ₺`, 'Ciro']}
                  labelFormatter={(_, p) => p?.[0]?.payload?.tarih || ''}
                />
                <Area type="natural" dataKey="ciro" stroke="#26a9e0" strokeWidth={2.5} fill="url(#ciroGrad)" fillOpacity={1} animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
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
