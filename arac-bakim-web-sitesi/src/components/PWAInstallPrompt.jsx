import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Zaten yüklü ve standalone (bağımsız) modda mı çalışıyor?
    const inStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Kullanıcı daha önce "Daha Sonra" dedi mi? (Son 5 gün kontrolü)
    const dismissedTime = localStorage.getItem('otoil_pwa_dismissed');
    if (dismissedTime) {
      const daysPassed = (Date.now() - Number(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 5) return;
    }

    // 3. iOS tespiti
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // 4. Android / Chrome / Edge beforeinstallprompt olayı
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS cihazlar için (standalone değilse 3 saniye sonra göster)
    let iosTimer;
    if (isIOSDevice && !inStandalone) {
      iosTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('otoil_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Alt Banner (Kullanıcıyı rahatsız etmeyen kayan bildirim) */}
      <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-slide-down">
        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl ring-1 ring-white/15 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <img
              src="./icon-192.png"
              alt="OTOIL"
              className="w-11 h-11 rounded-xl shadow-md border border-white/20 shrink-0 object-cover"
            />
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                OTOIL Uygulamasını Yükleyin
                <span className="text-[9px] bg-[#26a9e0]/30 text-sky-300 font-bold px-1.5 py-0.5 rounded">PWA</span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Ana ekranınızdan tam ekran ve hızlıca kullanın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-[#26a9e0] to-[#1273a8] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
            >
              Yükle
            </button>
            <button
              onClick={handleDismiss}
              title="Kapat"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg active:scale-90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Kurulum Rehberi Modalı */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src="./icon-192.png" alt="OTOIL" className="w-10 h-10 rounded-xl shadow-sm" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ana Ekrana Ekle</h3>
                  <p className="text-[11px] text-slate-500">Apple iOS Kurulumu</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1273a8] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <p>Safari'nin alt menüsündeki <strong>Paylaş</strong> simgesine dokunun.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1273a8] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <p>Açılan menüde aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1273a8] text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <p>Sağ üstteki <strong>"Ekle"</strong> butonuna basarak kurulumu tamamlayın.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
              className="w-full bg-[#0c4a6e] text-white font-bold py-3 rounded-xl text-xs hover:bg-[#1273a8] transition-colors"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
}
