import { useState, useEffect } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Uygulamanın zaten kurulu olup olmadığını kontrol et
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;
    
    if (isStandalone || isInStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // LocalStorage'dan kurulum durumunu kontrol et
    const installDismissed = localStorage.getItem('installPromptDismissed');
    let shouldShow = true;
    
    if (installDismissed) {
      const dismissedTime = parseInt(installDismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // 7 günden az süre geçtiyse tekrar gösterme
      if (daysSinceDismissed < 7) {
        shouldShow = false;
      }
    }

    // PWA install prompt event'ini dinle
    const handleBeforeInstallPrompt = (e) => {
      // Varsayılan prompt'u engelle
      e.preventDefault();
      // Event'i sakla
      setDeferredPrompt(e);
      // LocalStorage kontrolü yoksa göster
      if (shouldShow) {
        setShowPrompt(true);
      }
    };

    // Uygulama kurulduğunda
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS için özel kontrol veya beforeinstallprompt gelmezse
    let timeoutId;
    if (isIOS && !isInStandaloneMode && shouldShow) {
      // iOS'ta beforeinstallprompt event'i gelmez, manuel göster
      timeoutId = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    } else if (!isIOS && shouldShow) {
      // Desktop için de bir süre sonra göster (beforeinstallprompt gelmeyebilir)
      timeoutId = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // iOS kontrolü
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS'ta manuel talimat göster
      alert('Uygulamayı kurmak için:\n1. Safari\'de paylaş butonuna tıklayın\n2. "Ana Ekrana Ekle" seçeneğini seçin');
      handleDismiss();
      return;
    }

    if (!deferredPrompt) {
      // Eğer prompt yoksa, manuel talimat göster
      alert('Uygulamayı kurmak için tarayıcınızın adres çubuğundaki kurulum ikonuna tıklayın veya menüden "Uygulamayı yükle" seçeneğini seçin.');
      handleDismiss();
      return;
    }

    try {
      // Prompt'u göster
      deferredPrompt.prompt();

      // Kullanıcının seçimini bekle
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Kullanıcı uygulamayı kurmayı kabul etti');
      } else {
        console.log('Kullanıcı uygulamayı kurmayı reddetti');
      }
    } catch (error) {
      console.error('Install prompt hatası:', error);
    }

    // Prompt'u temizle
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // LocalStorage'a dismiss zamanını kaydet
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Uygulama zaten kuruluysa hiçbir şey gösterme
  if (isInstalled) {
    return null;
  }

  // Prompt gösterilmeyecekse hiçbir şey gösterme
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 animate-slide-down">
      <div className="bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4] rounded-xl shadow-2xl p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <h3 className="font-bold text-lg mb-1">Uygulamayı Kur</h3>
            <p className="text-sm opacity-90">
              Masaüstüne veya ana ekrana ekleyerek daha hızlı erişin
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-white text-[#26a9e0] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Kur
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white/80 hover:text-white transition-colors text-sm"
          >
            Daha Sonra
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;

