import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import logo from '../assets/otoil-logo.png';
import { AnalizSkeleton } from '../components/SkeletonLoader';

// Renk Paleti (Kurumsal OTOIL Teması)
const COLORS = ['#26a9e0', '#0c4a6e', '#1273a8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

// Bilinen Popüler Markalar Listesi (Araç modelinden marka ayıklamak için)
const KNOWN_BRANDS = [
  'Fiat', 'Renault', 'Volkswagen', 'Ford', 'Toyota', 'Hyundai',
  'Opel', 'Peugeot', 'Honda', 'BMW', 'Mercedes', 'Audi', 'Skoda',
  'Seat', 'Nissan', 'Dacia', 'Citroen', 'Kia', 'Volvo', 'Chevrolet', 'Suzuki'
];

function extractBrand(modelStr = '') {
  if (!modelStr) return 'Diğer';
  const clean = modelStr.trim();
  const lower = clean.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  const firstWord = clean.split(' ')[0];
  return firstWord ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase() : 'Diğer';
}

function Analiz() {
  const [hizmetler, setHizmetler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('ay'); // 'hafta' | 'ay' | 'yil' | 'hepsi'
  const [activeTab, setActiveTab] = useState('finans'); // 'finans' | 'markalar' | 'checkup' | 'musteri'
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const navigate = useNavigate();

  // Sayfa kaydırma dinleyicisi (Sticky bar glassmorphism efekti için)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 70);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Oturum kontrolü ve Firestore canlı aboneliği
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate('/login');
      }
    });

    const q = query(collection(db, 'hizmetler'));
    const unsubData = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setHizmetler(list);
      setLoading(false);
    }, (err) => {
      console.error('Veri yüklenirken hata:', err);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubData();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  // Zaman aralığına göre filtrelenmiş kayıtlar
  const filteredHizmetler = useMemo(() => {
    const now = new Date();
    return hizmetler.filter((item) => {
      if (!item.hizmetTarihi) return false;
      const date = item.hizmetTarihi.toDate ? item.hizmetTarihi.toDate() : new Date(item.hizmetTarihi);
      if (!date || isNaN(date.getTime())) return false;

      if (timeRange === 'hafta') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return date >= d;
      }
      if (timeRange === 'ay') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= d;
      }
      if (timeRange === 'yil') {
        const d = new Date(now.getFullYear(), 0, 1);
        return date >= d;
      }
      return true; // 'hepsi'
    });
  }, [hizmetler, timeRange]);

  // Üst Temel Metrikler (KPI'lar)
  const stats = useMemo(() => {
    const toplamCiro = filteredHizmetler.reduce((acc, h) => acc + (Number(h.alınanUcret) || 0), 0);
    const toplamArac = filteredHizmetler.length;
    const ortalamaSepet = toplamArac > 0 ? Math.round(toplamCiro / toplamArac) : 0;

    // Tekrar gelen müşteri oranı (Retention)
    const plakaCounts = {};
    hizmetler.forEach((h) => {
      const p = (h.plaka || '').trim().toUpperCase();
      if (p) plakaCounts[p] = (plakaCounts[p] || 0) + 1;
    });
    const tekrarGelenler = Object.values(plakaCounts).filter((c) => c > 1).length;
    const toplamFarkliPlaka = Object.keys(plakaCounts).length;
    const retentionRate = toplamFarkliPlaka > 0 ? Math.round((tekrarGelenler / toplamFarkliPlaka) * 100) : 0;

    return {
      toplamCiro,
      toplamArac,
      ortalamaSepet,
      retentionRate,
      tekrarGelenler,
      toplamFarkliPlaka
    };
  }, [filteredHizmetler, hizmetler]);

  // Aylık ve Yıllık Büyüme Metrikleri (MoM & YoY)
  const growthStats = useMemo(() => {
    const now = new Date();

    // 1. Bu Ay
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Geçen Ay
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 3. Bu Yıl
    const startThisYear = new Date(now.getFullYear(), 0, 1);
    const endThisYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // 4. Geçen Yıl
    const startPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const endPrevYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    let thisMonthCiro = 0;
    let thisMonthArac = 0;
    let prevMonthCiro = 0;
    let prevMonthArac = 0;

    let thisYearCiro = 0;
    let thisYearArac = 0;
    let prevYearCiro = 0;
    let prevYearArac = 0;

    hizmetler.forEach((h) => {
      if (!h.hizmetTarihi) return;
      const date = h.hizmetTarihi.toDate ? h.hizmetTarihi.toDate() : new Date(h.hizmetTarihi);
      if (!date || isNaN(date.getTime())) return;
      const ucret = Number(h.alınanUcret) || 0;

      // Bu Ay
      if (date >= startThisMonth && date <= endThisMonth) {
        thisMonthCiro += ucret;
        thisMonthArac += 1;
      }
      // Geçen Ay
      if (date >= startPrevMonth && date <= endPrevMonth) {
        prevMonthCiro += ucret;
        prevMonthArac += 1;
      }
      // Bu Yıl
      if (date >= startThisYear && date <= endThisYear) {
        thisYearCiro += ucret;
        thisYearArac += 1;
      }
      // Geçen Yıl
      if (date >= startPrevYear && date <= endPrevYear) {
        prevYearCiro += ucret;
        prevYearArac += 1;
      }
    });

    // Aylık Büyüme Oranı
    let monthlyGrowthRate = 0;
    if (prevMonthCiro > 0) {
      monthlyGrowthRate = Math.round(((thisMonthCiro - prevMonthCiro) / prevMonthCiro) * 100);
    } else if (thisMonthCiro > 0) {
      monthlyGrowthRate = 100;
    }
    const monthlyDiff = thisMonthCiro - prevMonthCiro;

    // Yıllık Büyüme Oranı
    let yearlyGrowthRate = 0;
    if (prevYearCiro > 0) {
      yearlyGrowthRate = Math.round(((thisYearCiro - prevYearCiro) / prevYearCiro) * 100);
    } else if (thisYearCiro > 0) {
      yearlyGrowthRate = 100;
    }
    const yearlyDiff = thisYearCiro - prevYearCiro;

    return {
      thisMonthCiro,
      thisMonthArac,
      prevMonthCiro,
      prevMonthArac,
      monthlyGrowthRate,
      monthlyDiff,
      thisYearCiro,
      thisYearArac,
      prevYearCiro,
      prevYearArac,
      yearlyGrowthRate,
      yearlyDiff,
      currentYear: now.getFullYear(),
      prevYear: now.getFullYear() - 1,
      currentMonthName: now.toLocaleString('tr-TR', { month: 'long' }),
      prevMonthName: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('tr-TR', { month: 'long' })
    };
  }, [hizmetler]);

  // 1. Ciro & Zaman Serisi Grafiği
  const revenueChartData = useMemo(() => {
    const map = {};
    filteredHizmetler.forEach((h) => {
      if (!h.hizmetTarihi) return;
      const date = h.hizmetTarihi.toDate ? h.hizmetTarihi.toDate() : new Date(h.hizmetTarihi);
      if (!date || isNaN(date.getTime())) return;
      let key = '';
      if (timeRange === 'hafta' || timeRange === 'ay') {
        key = `${date.getDate()} ${date.toLocaleString('tr-TR', { month: 'short' })}`;
      } else if (timeRange === 'yil') {
        key = date.toLocaleString('tr-TR', { month: 'short' });
      } else {
        key = `${date.getFullYear()}-${date.toLocaleString('tr-TR', { month: 'short' })}`;
      }

      if (!map[key]) {
        map[key] = { label: key, ciro: 0, aracSayisi: 0, sortKey: date.getTime() };
      }
      map[key].ciro += Number(h.alınanUcret) || 0;
      map[key].aracSayisi += 1;
    });

    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredHizmetler, timeRange]);

  // Günlere göre dağılım (Haftanın günleri yoğunluk analizi)
  const dayOfWeekData = useMemo(() => {
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    filteredHizmetler.forEach((h) => {
      if (!h.hizmetTarihi) return;
      const date = h.hizmetTarihi.toDate ? h.hizmetTarihi.toDate() : new Date(h.hizmetTarihi);
      if (!date || isNaN(date.getTime())) return;
      counts[date.getDay()] += 1;
    });
    return [
      { gun: 'Pzt', count: counts[1] },
      { gun: 'Sal', count: counts[2] },
      { gun: 'Çar', count: counts[3] },
      { gun: 'Per', count: counts[4] },
      { gun: 'Cum', count: counts[5] },
      { gun: 'Cmt', count: counts[6] },
      { gun: 'Paz', count: counts[0] }
    ];
  }, [filteredHizmetler]);

  // 2. Marka Dağılımı Verileri
  const brandData = useMemo(() => {
    const map = {};
    filteredHizmetler.forEach((h) => {
      const brand = extractBrand(h.aracModeli);
      if (!map[brand]) map[brand] = { name: brand, count: 0, ciro: 0 };
      map[brand].count += 1;
      map[brand].ciro += Number(h.alınanUcret) || 0;
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // En çok gelen ilk 8 marka
  }, [filteredHizmetler]);

  // 3. Mekanik Check-up Sorun İstatistikleri
  const checkupIssuesData = useMemo(() => {
    const issueMap = {};

    filteredHizmetler.forEach((h) => {
      const list = h.kontrolListesi || {};
      Object.entries(list).forEach(([itemId, val]) => {
        if (!val || typeof val !== 'object') return;
        const durum = val.durum;
        // 'kotu', 'orta' veya 'var' (kaçak/titreme vb.) sorun olarak sayılır
        if (durum === 'kotu' || durum === 'orta' || durum === 'var') {
          // İsim güzelleştirme
          const label = itemId
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace('Aku', 'Akü')
            .replace('Yag', 'Yağ')
            .replace('Kacagi', 'Kaçağı')
            .replace('Catlak', 'Çatlak');

          if (!issueMap[label]) issueMap[label] = { name: label, adet: 0, kotu: 0, orta: 0 };
          issueMap[label].adet += 1;
          if (durum === 'kotu') issueMap[label].kotu += 1;
          if (durum === 'orta') issueMap[label].orta += 1;
        }
      });
    });

    return Object.values(issueMap)
      .sort((a, b) => b.adet - a.adet)
      .slice(0, 7);
  }, [filteredHizmetler]);

  // 4. Bakımı Geciken / Yaklaşan Müşteriler (CRM & WhatsApp)
  const overdueCustomers = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const list = [];
    hizmetler.forEach((h) => {
      if (!h.sonrakiBakimTarihi) return;
      let targetDate;
      if (h.sonrakiBakimTarihi.toDate) {
        targetDate = h.sonrakiBakimTarihi.toDate();
      } else if (typeof h.sonrakiBakimTarihi === 'string') {
        targetDate = new Date(h.sonrakiBakimTarihi);
      }
      if (!targetDate || isNaN(targetDate.getTime())) return;

      const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

      // Bakım tarihi geçmiş veya 15 gün içinde gelecek olanlar
      if (diffDays <= 15) {
        list.push({
          ...h,
          diffDays,
          formattedTargetDate: targetDate.toLocaleDateString('tr-TR')
        });
      }
    });

    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [hizmetler]);

  // Excel / CSV İndirme Fonksiyonu (UTF-8 BOM ile Excel uyumlu)
  const handleExportCSV = () => {
    if (filteredHizmetler.length === 0) {
      alert('Dışa aktarılacak kayıt bulunamadı.');
      return;
    }

    const headers = [
      'Plaka',
      'Müşteri Adı Soyadı',
      'Telefon',
      'Araç Modeli',
      'Hizmet Tarihi',
      'Sonraki Bakım Tarihi',
      'Alınan Ücret (TL)',
      'Yapılan İşlemler',
      'Usta Notu'
    ];

    const rows = filteredHizmetler.map((h) => {
      const d1 = h.hizmetTarihi?.toDate ? h.hizmetTarihi.toDate().toLocaleDateString('tr-TR') : '';
      const d2 = h.sonrakiBakimTarihi?.toDate
        ? h.sonrakiBakimTarihi.toDate().toLocaleDateString('tr-TR')
        : (h.sonrakiBakimTarihi || '');

      return [
        `"${(h.plaka || '').replace(/"/g, '""')}"`,
        `"${(h.adSoyad || '').replace(/"/g, '""')}"`,
        `"${(h.telefon || '').replace(/"/g, '""')}"`,
        `"${(h.aracModeli || '').replace(/"/g, '""')}"`,
        `"${d1}"`,
        `"${d2}"`,
        `"${h.alınanUcret || 0}"`,
        `"${(h.yapilanIslemler || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`,
        `"${(h.ustaNotu || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `otoil-rapor-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <AnalizSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] page-safe-bottom">
      {/* HERO HEADER */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 header-safe-top pb-12">
        {/* Üstten aşağı yumuşak beyaz geçiş (fade) */}
        <div className="header-fade-overlay" />
        {/* Dekoratif daireler */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">İş Zekası & İstatistikler</p>
              <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                Rapor & Analiz Merkezi
              </h1>
            </div>

            {/* Hızlı Dışa Aktar Butonu */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-2 bg-white/90 hover:bg-white text-[#0c4a6e] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-[#1273a8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel / CSV İndir
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK ALANI */}
      <main className="max-w-6xl mx-auto px-4 -mt-5 relative z-20 space-y-6">
        {/* ZAMAN ARALIĞI SEÇİCİ PİLL'LER (STICKY & DİNAMİK GLASSMORPHISM) */}
        <div
          className={`sticky top-3 z-30 transition-all duration-300 rounded-2xl p-2 flex items-center justify-between gap-2 overflow-x-auto ${
            isScrolled
              ? 'bg-white/45 backdrop-blur-md shadow-lg shadow-slate-900/5 border border-white/60 ring-1 ring-slate-900/5'
              : 'bg-white shadow-sm border border-slate-200/80'
          }`}
          style={isScrolled ? { backdropFilter: 'blur(10px) saturate(180%)', WebkitBackdropFilter: 'blur(10px) saturate(180%)' } : {}}
        >
          <span className="text-xs font-bold text-slate-500 pl-3 hidden sm:inline">Dönem:</span>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {[
              { key: 'hafta', label: 'Son 7 Gün' },
              { key: 'ay', label: 'Bu Ay' },
              { key: 'yil', label: 'Bu Yıl' },
              { key: 'hepsi', label: 'Tüm Zamanlar' }
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeRange(t.key)}
                className={`flex-1 sm:flex-initial text-xs font-bold px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  timeRange === t.key
                    ? 'bg-[#1273a8] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 TEMEL KPI METRİK KARTI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Toplam Ciro */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Toplam Ciro</span>
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-[#1273a8]">
                ₺
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {stats.toplamCiro.toLocaleString('tr-TR')} ₺
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${
                growthStats.monthlyGrowthRate >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`} title="Geçen aya göre ciro büyümesi">
                {growthStats.monthlyGrowthRate >= 0 ? '▲ +' : '▼ '}%{growthStats.monthlyGrowthRate} Ay
              </span>
              <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${
                growthStats.yearlyGrowthRate >= 0 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
              }`} title="Geçen yıla göre ciro büyümesi">
                {growthStats.yearlyGrowthRate >= 0 ? '▲ +' : '▼ '}%{growthStats.yearlyGrowthRate} Yıl
              </span>
            </div>
          </div>

          {/* 2. Bakım Yapılan Araç Sayısı */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Araç Sayısı</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {stats.toplamArac} <span className="text-sm font-semibold text-slate-500">araç</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Servis girişi tamamlanan</p>
          </div>

          {/* 3. Ortalama Sepet Tutarı */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ort. Sepet</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {stats.ortalamaSepet.toLocaleString('tr-TR')} ₺
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Araç başı ortalama harcama</p>
          </div>

          {/* 4. Müşteri Sadakat Oranı */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Sadakat Oranı</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              %{stats.retentionRate}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stats.tekrarGelenler} araç tekrar geldi</p>
          </div>
        </div>

        {/* ANALİZ MODÜLLERİ SEKMELERİ */}
        <div className="flex items-center border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-1">
          {[
            { id: 'finans', label: 'Finans & Ciro Trendi', icon: '📈' },
            { id: 'markalar', label: 'Araç & Marka Dağılımı', icon: '🚗' },
            { id: 'checkup', label: 'Kronik Arıza & Check-up', icon: '🔧' },
            { id: 'musteri', label: 'Müşteri Takip & WhatsApp', icon: '💬' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1273a8] text-[#0c4a6e]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'musteri' && overdueCustomers.length > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {overdueCustomers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ----------------- SEKME 1: FİNANS & CİRO TRENDİ ----------------- */}
        {activeTab === 'finans' && (
          <div className="space-y-6 animate-fade-in">
            {/* Büyüme ve Karşılaştırma Kartları (Aylık & Yıllık) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aylık Büyüme Kartı */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Aylık Büyüme (MoM)</h4>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {growthStats.currentMonthName} vs {growthStats.prevMonthName}
                    </p>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    growthStats.monthlyGrowthRate >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {growthStats.monthlyGrowthRate >= 0 ? '▲ +' : '▼ '}
                    %{growthStats.monthlyGrowthRate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Bu Ay ({growthStats.currentMonthName})</p>
                    <p className="text-base sm:text-lg font-black text-slate-800">{growthStats.thisMonthCiro.toLocaleString('tr-TR')} ₺</p>
                    <p className="text-[10px] text-slate-500">{growthStats.thisMonthArac} araç</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Geçen Ay ({growthStats.prevMonthName})</p>
                    <p className="text-base sm:text-lg font-black text-slate-600">{growthStats.prevMonthCiro.toLocaleString('tr-TR')} ₺</p>
                    <p className="text-[10px] text-slate-500">{growthStats.prevMonthArac} araç</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Net Ciro Değişimi:</span>
                  <span className={`font-bold ${growthStats.monthlyDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {growthStats.monthlyDiff >= 0 ? `+${growthStats.monthlyDiff.toLocaleString('tr-TR')}` : growthStats.monthlyDiff.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>

              {/* Yıllık Büyüme Kartı */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1273a8]"></span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Yıllık Büyüme (YoY)</h4>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {growthStats.currentYear} vs {growthStats.prevYear}
                    </p>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    growthStats.yearlyGrowthRate >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {growthStats.yearlyGrowthRate >= 0 ? '▲ +' : '▼ '}
                    %{growthStats.yearlyGrowthRate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Bu Yıl ({growthStats.currentYear})</p>
                    <p className="text-base sm:text-lg font-black text-slate-800">{growthStats.thisYearCiro.toLocaleString('tr-TR')} ₺</p>
                    <p className="text-[10px] text-slate-500">{growthStats.thisYearArac} araç</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Geçen Yıl ({growthStats.prevYear})</p>
                    <p className="text-base sm:text-lg font-black text-slate-600">{growthStats.prevYearCiro.toLocaleString('tr-TR')} ₺</p>
                    <p className="text-[10px] text-slate-500">{growthStats.prevYearArac} araç</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Net Ciro Değişimi:</span>
                  <span className={`font-bold ${growthStats.yearlyDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {growthStats.yearlyDiff >= 0 ? `+${growthStats.yearlyDiff.toLocaleString('tr-TR')}` : growthStats.yearlyDiff.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            </div>

            {/* Ciro Değişim Grafiği */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">Dönemsel Gelir Değişimi</h3>
                  <p className="text-xs text-slate-500">Zaman çizgisine göre elde edilen ciro trendi</p>
                </div>
              </div>

              {revenueChartData.length > 0 ? (
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#26a9e0" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#26a9e0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}₺`}
                      />
                      <Tooltip
                        formatter={(val) => [`${Number(val).toLocaleString('tr-TR')} ₺`, 'Ciro']}
                        contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      />
                      <Area type="monotone" dataKey="ciro" stroke="#1273a8" strokeWidth={3} fillOpacity={1} fill="url(#ciroGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                  Bu zaman aralığında gösterilecek ciro verisi bulunamadı.
                </div>
              )}
            </div>

            {/* Haftanın Günleri Yoğunluk Analizi */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 mb-1">Haftanın En Yoğun Günleri</h3>
              <p className="text-xs text-slate-500 mb-4">Giriş yapılan araç sayılarının günlere göre yoğunluğu</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <XAxis dataKey="gun" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [`${val} Araç`, 'Giriş Sayısı']}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" fill="#1273a8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SEKME 2: ARAÇ & MARKA DAĞILIMI ----------------- */}
        {activeTab === 'markalar' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Marka Dağılım Çubuğu */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800 mb-1">En Çok Gelen Markalar</h3>
                <p className="text-xs text-slate-500 mb-4">Servis alan araçların marka bazlı adetleri</p>

                {brandData.length > 0 ? (
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brandData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#475569" fontSize={12} tickLine={false} width={80} />
                        <Tooltip
                          formatter={(val) => [`${val} Araç`, 'Toplam']}
                          contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                        />
                        <Bar dataKey="count" fill="#26a9e0" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                    Marka verisi bulunamadı.
                  </div>
                )}
              </div>

              {/* Markalara Göre Gelir Payı */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">Marka Bazlı Gelir Payı</h3>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Dilime tıklayarak seçin</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Hangi marka servisimize daha fazla ciro kazandırıyor?</p>

                {brandData.length > 0 ? (
                  <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={brandData}
                          dataKey="ciro"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={96}
                          paddingAngle={3}
                          isAnimationActive={false}
                          className="cursor-pointer outline-none"
                        >
                          {brandData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke="#ffffff"
                              strokeWidth={2}
                              className="cursor-pointer hover:opacity-85 transition-opacity"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xl text-center pointer-events-none select-none">
                                  <p className="text-sm font-black text-slate-900 tracking-tight">
                                    {Number(data.ciro).toLocaleString('tr-TR')} ₺
                                  </p>
                                  <p className="text-xs font-extrabold text-[#1273a8] mt-0.5">
                                    {data.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {data.count} Araç • %{stats.toplamCiro > 0 ? Math.round((data.ciro / stats.toplamCiro) * 100) : 0} Pay
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                    Ciro dağılımı bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SEKME 3: KRONİK ARIZA & CHECK-UP ----------------- */}
        {activeTab === 'checkup' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                    En Sık Karşılaşılan Mekanik Sorunlar
                  </h3>
                  <p className="text-xs text-slate-500">
                    45 kalemlik check-up verilerine göre en çok uyarı veya hasar alan parçalar
                  </p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold self-start">
                  Stok & Parça Öngörüsü
                </span>
              </div>

              {checkupIssuesData.length > 0 ? (
                <div className="space-y-3">
                  {checkupIssuesData.map((issue, idx) => {
                    const percentage = Math.round((issue.adet / stats.toplamArac) * 100) || 0;
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            {issue.name}
                          </span>
                          <span className="text-slate-500">
                            {issue.adet} araçta (%{percentage})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${(issue.kotu / issue.adet) * 100}%` }}
                            title={`Kötü/Acil: ${issue.kotu}`}
                          />
                          <div
                            className="bg-amber-400 h-full"
                            style={{ width: `${(issue.orta / issue.adet) * 100}%` }}
                            title={`Orta/Takip: ${issue.orta}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-400 text-right pt-2">
                    <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-xs mr-1"></span> Kötü / Acil
                    <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-xs ml-3 mr-1"></span> Orta / Takip
                  </p>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                  Henüz kontrol ekranı doldurulmuş servis kaydı bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- SEKME 4: MÜŞTERİ TAKİP & WHATSAPP ----------------- */}
        {activeTab === 'musteri' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                    Bakımı Geciken & Yaklaşan Müşteriler
                  </h3>
                  <p className="text-xs text-slate-500">
                    Periyodik bakım zamanı dolmuş müşterilere tek tıkla WhatsApp hatırlatması gönderin
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Toplam: {overdueCustomers.length} Müşteri
                </span>
              </div>

              {overdueCustomers.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {overdueCustomers.map((c) => {
                    const isPassed = c.diffDays < 0;
                    const daysAbs = Math.abs(c.diffDays);
                    const cleanPhone = (c.telefon || '').replace(/[^\d]/g, '');
                    const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
                    const whatsappMsg = encodeURIComponent(
                      `Merhaba ${c.adSoyad || ''} Bey/Hanım, OTOIL Yağ ve Bakım Merkezi'nden iletişime geçiyoruz. ${c.plaka || 'Aracınızın'} periyodik bakım tarihi (${c.formattedTargetDate}) ${isPassed ? `${daysAbs} gün önce dolmuştur` : `yaklaşmıştır`}. Güvenli sürüş ve motor sağlığı için servisimize bekleriz. Randevu ve bilgi: 0507 541 63 25`
                    );

                    return (
                      <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="px-2.5 py-1 bg-slate-800 text-white rounded-md text-xs font-black tracking-wider">
                            {c.plaka}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800">{c.adSoyad || 'İsimsiz Müşteri'}</p>
                            <p className="text-xs text-slate-500">{c.aracModeli || 'Model Belirtilmemiş'} • {c.telefon || 'Tel Yok'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isPassed
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isPassed ? `${daysAbs} gün gecikti` : `${daysAbs} gün kaldı`}
                          </span>

                          {c.telefon ? (
                            <a
                              href={`https://wa.me/${finalPhone}?text=${whatsappMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                              </svg>
                              WhatsApp
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Tel yok</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                  Şu anda bakımı geciken veya yaklaşan araç bulunmuyor.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Analiz;
