// OTOIL Araç Bakım - Global Singleton Speech Recognition Manager
// Chrome, Edge ve Safari üzerinde mikrofon oturumunu (Mojo IPC) tek bir merkezden yönetir.
// Birden fazla butonun aynı anda çakışmasını veya 2. denemede oturumun askıda kalmasını (zombie state) önler.

const isIOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

class SpeechService {
  constructor() {
    this.recognition = null;
    this.activeId = null;
    this.callbacks = null;
    this.isListening = false;
    this.isStopping = false;
    this.pendingStart = null;
    this.stopSafetyTimer = null;
    this.init();
  }

  isSupported() {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  init() {
    if (!this.isSupported()) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'tr-TR';
      this.recognition.continuous = !isIOS;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log('[SpeechService] onstart: Mikrofon oturumu aktif');
        this.isListening = true;
        this.isStopping = false;
        if (this.callbacks?.onStart) {
          this.callbacks.onStart();
        }
      };

      this.recognition.onresult = (event) => {
        if (!this.isListening) return;
        if (this.callbacks?.onResult) {
          this.callbacks.onResult(event);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('[SpeechService] onerror:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        if (this.callbacks?.onError) {
          this.callbacks.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        console.log('[SpeechService] onend tetiklendi. isListening:', this.isListening, 'pendingStart:', !!this.pendingStart);
        if (this.stopSafetyTimer) {
          clearTimeout(this.stopSafetyTimer);
          this.stopSafetyTimer = null;
        }
        
        const wasListening = this.isListening;
        this.isStopping = false;

        // Bekleyen bir başlatma varsa (hızlı tıklama veya buton değişimi)
        if (this.pendingStart) {
          const next = this.pendingStart;
          this.pendingStart = null;
          this.start(next.id, next.callbacks);
          return;
        }

        // Eğer kullanıcı manuel olarak durdurmadıysa (sessizlik nedeniyle Chrome sonlandırdıysa)
        if (wasListening && !isIOS) {
          if (this.callbacks?.onSessionRestart) {
            this.callbacks.onSessionRestart();
          }
          // Chrome üzerinde sessizlik sonrası dinlemeyi sürdürmek için yeniden başlat
          try {
            this.recognition.start();
          } catch (e) {
            console.warn('[SpeechService] Otomatik yeniden başlatma hatası:', e);
            this.isListening = false;
            if (this.callbacks?.onEnd) {
              this.callbacks.onEnd();
            }
          }
        } else {
          this.isListening = false;
          if (this.callbacks?.onEnd) {
            this.callbacks.onEnd();
          }
        }
      };
    } catch (err) {
      console.error('[SpeechService] init hatası:', err);
    }
  }

  start(id, callbacks) {
    if (!this.isSupported()) return false;
    if (!this.recognition) this.init();

    // Eğer şu an önceki oturum durduruluyorsa, onend tetiklenince başlatılmak üzere sıraya al
    if (this.isStopping) {
      console.log('[SpeechService] Durdurulma bekleniyor, sıraya alındı:', id);
      this.pendingStart = { id, callbacks };
      return true;
    }

    // Eğer başka bir buton zaten dinliyorsa, onu durdurup yeniyi sıraya al
    if (this.isListening) {
      if (this.activeId !== id) {
        console.log('[SpeechService] Aktif buton değiştiriliyor:', this.activeId, '->', id);
        this.pendingStart = { id, callbacks };
        this.stop(this.activeId);
        return true;
      }
      return true;
    }

    this.activeId = id;
    this.callbacks = callbacks;
    this.isListening = true;
    this.isStopping = false;

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        console.log('[SpeechService] Oturum zaten çalışıyor');
        this.isListening = true;
        if (callbacks?.onStart) callbacks.onStart();
        return true;
      }
      console.error('[SpeechService] start hatası:', err);
      // Motor askıda kaldıysa yeniden yapılandırıp başlat
      this.recreate();
      try {
        this.recognition.start();
        return true;
      } catch (e2) {
        console.error('[SpeechService] recreate sonrası başlatılamadı:', e2);
        this.isListening = false;
        if (callbacks?.onError) callbacks.onError('start-failed');
        return false;
      }
    }
  }

  stop(id) {
    if (id && this.activeId !== id) return;

    this.isListening = false;
    this.isStopping = true;

    if (this.stopSafetyTimer) clearTimeout(this.stopSafetyTimer);
    // Güvenlik zaman aşımı: onend 350ms içinde gelmezse zorla çöz
    this.stopSafetyTimer = setTimeout(() => {
      if (this.isStopping) {
        console.log('[SpeechService] stopSafetyTimer tetiklendi');
        this.isStopping = false;
        if (this.pendingStart) {
          const next = this.pendingStart;
          this.pendingStart = null;
          this.start(next.id, next.callbacks);
        } else if (this.callbacks?.onEnd) {
          this.callbacks.onEnd();
        }
      }
    }, 350);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('[SpeechService] stop çağrısı hatası, abort deneniyor:', err);
        try { this.recognition.abort(); } catch {}
        this.isStopping = false;
        if (this.callbacks?.onEnd) this.callbacks.onEnd();
      }
    } else {
      this.isStopping = false;
      if (this.callbacks?.onEnd) this.callbacks.onEnd();
    }
  }

  recreate() {
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
      this.recognition = null;
    }
    this.isListening = false;
    this.isStopping = false;
    this.init();
  }
}

export const speechService = new SpeechService();
