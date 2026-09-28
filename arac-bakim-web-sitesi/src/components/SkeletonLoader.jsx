import logo from '../assets/otoil-logo.png';

/**
 * Temel Skeleton Bileşeni
 * variant: 'light' (standart gri zemin), 'white' (mavi başlıklar için beyaz saydam), 'dark' (karanlık kartlar için)
 */
export function Skeleton({ className = '', variant = 'light' }) {
  const variantClass = {
    light: 'animate-shimmer bg-slate-200/80',
    white: 'animate-shimmer-white bg-white/15',
    dark: 'animate-shimmer-dark bg-white/5',
  }[variant] || 'animate-shimmer bg-slate-200/80';

  return <div className={`rounded-md ${variantClass} ${className}`} />;
}

/**
 * Standart Hero Header Skeleton (Sayfa Üst Bölümü)
 */
export function SkeletonHeader({ titleWidth = 'w-48', subtitleWidth = 'w-28', children }) {
  return (
    <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-12">
      <div className="header-fade-overlay" />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
      <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <img src={logo} alt="OTOIL" className="h-9 w-auto opacity-90" />
          <div className="w-9 h-9 rounded-full bg-white/20 animate-shimmer-white" />
        </div>

        <Skeleton variant="white" className={`h-4 ${subtitleWidth} mb-2`} />
        <Skeleton variant="white" className={`h-8 ${titleWidth}`} />

        {children}
      </div>
    </header>
  );
}

/**
 * Bakım Merkezi Sayfası için Skeleton Loader
 */
export function BakimMerkeziSkeleton() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-28">
      {/* Header */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-10">
        <div className="header-fade-overlay" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <img src={logo} alt="OTOIL" className="h-9 w-auto opacity-90" />
            <div className="w-9 h-9 rounded-full bg-white/20 animate-shimmer-white" />
          </div>

          <Skeleton variant="white" className="h-4 w-24 mb-2" />
          <Skeleton variant="white" className="h-8 w-48" />

          {/* Arama Kutusu İskeleti */}
          <div className="relative w-full mt-5">
            <div className="w-full h-11 rounded-lg bg-white/30 backdrop-blur-md animate-shimmer-white ring-1 ring-white/30" />
          </div>
        </div>
      </header>

      {/* Kartlar Izgarası İskeleti */}
      <main className="max-w-5xl mx-auto px-4 -mt-4 relative z-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg ring-1 ring-slate-200 overflow-hidden shadow-xs"
            >
              {/* Plaka alanı */}
              <div className="p-2.5 pb-2">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              {/* Müşteri ve tarih satırları */}
              <div className="px-2.5 pb-3 space-y-2">
                <div>
                  <Skeleton className="h-2.5 w-12 mb-1" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
                <div>
                  <Skeleton className="h-2.5 w-10 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Dashboard Sayfası için Skeleton Loader
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-28">
      {/* Header */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-16">
        <div className="header-fade-overlay" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <img src={logo} alt="OTOIL" className="h-9 w-auto opacity-90" />
            <div className="w-9 h-9 rounded-full bg-white/20 animate-shimmer-white" />
          </div>

          <Skeleton variant="white" className="h-4 w-28 mb-2" />
          <Skeleton variant="white" className="h-8 w-56" />

          {/* Ciro Özeti İskeleti */}
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <Skeleton variant="white" className="h-3 w-28 mb-2" />
              <Skeleton variant="white" className="h-10 w-44" />
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-md px-4 py-2.5 w-28 flex flex-col items-center">
              <Skeleton variant="white" className="h-6 w-12 mb-1.5" />
              <Skeleton variant="white" className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      </header>

      {/* İçerik */}
      <main className="max-w-3xl mx-auto px-4 -mt-10 relative z-20 space-y-4">
        {/* 2 İstatistik Kartı */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200">
            <Skeleton className="w-10 h-10 rounded-md mb-3" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200">
            <Skeleton className="w-10 h-10 rounded-md mb-3" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>

        {/* Grafik Kartı İskeleti */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg p-5 ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
          <div className="h-[190px] flex items-end justify-between gap-3 pt-6 px-2">
            {[40, 65, 30, 85, 55, 95, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md animate-shimmer bg-slate-200/80"
                  style={{ height: `${h}%` }}
                />
                <Skeleton className="h-2.5 w-6" />
              </div>
            ))}
          </div>
        </div>

        {/* OtoilAI Kartı İskeleti */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-[#0c4a6e] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-white/10 animate-shimmer-dark" />
            <div className="space-y-1.5 flex-1">
              <Skeleton variant="dark" className="h-5 w-32 bg-white/15" />
              <Skeleton variant="dark" className="h-3 w-48 bg-white/10" />
            </div>
          </div>
          <Skeleton variant="dark" className="h-10 w-full rounded-md bg-white/15" />
        </div>
      </main>
    </div>
  );
}

/**
 * Analiz & Rapor Sayfası için Skeleton Loader
 */
export function AnalizSkeleton() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-28">
      {/* Header */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-12">
        <div className="header-fade-overlay" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <img src={logo} alt="OTOIL" className="h-9 w-auto opacity-90" />
            <div className="w-9 h-9 rounded-full bg-white/20 animate-shimmer-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton variant="white" className="h-4 w-36 mb-2" />
              <Skeleton variant="white" className="h-8 w-56" />
            </div>
            <Skeleton variant="white" className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="max-w-6xl mx-auto px-4 -mt-5 relative z-20 space-y-6">
        {/* Sticky Seçici İskeleti */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded-xl" />
          <Skeleton className="h-8 flex-1 rounded-xl" />
          <Skeleton className="h-8 flex-1 rounded-xl" />
          <Skeleton className="h-8 flex-1 rounded-xl" />
        </div>

        {/* 4 Temel KPI Metrik Kartı İskeleti */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-28 mb-3" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Sekme ve Grafik Kartı İskeleti */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-44 rounded-xl" />
          </div>
          <div className="h-72 w-full flex items-end justify-between gap-3 pt-10 px-4 bg-slate-50/50 rounded-xl">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full rounded-t-md animate-shimmer bg-slate-200/70"
                  style={{ height: `${25 + ((i * 35) % 65)}%` }}
                />
                <Skeleton className="h-2.5 w-8" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Bildirimler / Liste İskeleti
 */
export function BildirimlerSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-4 ring-1 ring-slate-200 shadow-xs flex items-center justify-between gap-4"
        >
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Uygulama Başlangıç Splash / Loading Ekranı (App.jsx auth kontrolü için)
 */
export function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      <div className="header-fade-overlay" />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo ile nefes alan hafif nabız efekti */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl animate-pulse" />
          <img
            src={logo}
            alt="OTOIL"
            className="relative h-14 w-auto drop-shadow-md animate-pulse"
          />
        </div>

        {/* Shimmer Yükleme Çubuğu */}
        <div className="w-48 h-1.5 rounded-full bg-white/20 overflow-hidden mb-3">
          <div className="w-full h-full animate-shimmer-white rounded-full bg-white/60" />
        </div>

        <p className="text-white/80 text-xs font-semibold tracking-wider uppercase">
          Yükleniyor...
        </p>
      </div>
    </div>
  );
}

export default Skeleton;
