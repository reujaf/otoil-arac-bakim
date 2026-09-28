import { useState, useRef, useEffect, useId, useCallback } from 'react';

// Türkçe noktalama ve komut dönüştürücü
function cleanTurkishPunctuation(text) {
  if (!text) return '';
  return text
    .replace(/\s+(nokta|Nokta)(\s+|$)/g, '. ')
    .replace(/\s+(virgül|Virgül)(\s+|$)/g, ', ')
    .replace(/\s+(soru işareti|Soru işareti)(\s+|$)/g, '? ')
    .replace(/\s+(ünlem|Ünlem)(\s+|$)/g, '! ')
    .replace(/\s+(iki nokta|İki nokta)(\s+|$)/g, ': ')
    .replace(/\s+(yeni satır|Yeni satır)(\s+|$)/g, '\n');
}

// Türkçe cümle başı ve noktalama sonrası büyük harf yapıcı
function formatTurkishSentence(text) {
  if (!text) return '';
  let formatted = text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
  formatted = formatted.replace(/([.!?\n]\s*)([a-zçğıöşü])/g, (match, p1, p2) => {
    return p1 + p2.toLocaleUpperCase('tr-TR');
  });
  return formatted;
}

// iOS ve WebKit tespiti (iPad, iPhone, iPod ve dokunmatik iPad/Mac)
const isIOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

function VoiceInputButton({
  value = '',
  onChange,
  variant = 'light', // 'light' | 'dark'
  title = 'Sesle Yazdır (Türkçe)',
  className = ''
}) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isStoppingRef = useRef(false);

  const baseTextRef = useRef(''); // Kayıt başladığındaki mevcut metin
  const currentTextRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const restartTimerRef = useRef(null);
  const stopSafetyTimerRef = useRef(null);
  const buttonId = useId();

  // Değerleri ref'lerde güncel tut (re-render sırasında effect'lerin yeniden tetiklenmesini önler)
  useEffect(() => {
    currentTextRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Dinlemeyi güvenli ve zarif bir şekilde durdurma (Graceful Stop)
  // WebKit / iOS Safari üzerinde abort() çağrısı donanım ses oturumunu (AVAudioSession)
  // kilitler ve 2. denemede mikrofonun sessiz kalmasına (zombie state) yol açar.
  // Bu yüzden stop() kullanılır ve onend olayının oturumu serbest bırakması beklenir.
  const stopListening = useCallback(() => {
    console.log('[OTOIL Sesle Yazma] stopListening çağrıldı.');
    isListeningRef.current = false;
    setIsListening(false);
    setIsConnecting(false);
    setLiveTranscript('');

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      isStoppingRef.current = true;
      setIsStopping(true);

      try {
        rec.stop();
      } catch (err) {
        console.warn('[OTOIL Sesle Yazma] rec.stop hatası:', err);
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }

      // Güvenlik zaman aşımı: Eğer tarayıcı onend tetiklemezse en geç 400ms içinde temizle
      if (stopSafetyTimerRef.current) clearTimeout(stopSafetyTimerRef.current);
      stopSafetyTimerRef.current = setTimeout(() => {
        if (isStoppingRef.current) {
          isStoppingRef.current = false;
          setIsStopping(false);
          recognitionRef.current = null;
        }
      }, 400);
    } else {
      isStoppingRef.current = false;
      setIsStopping(false);
    }

    // Son metni düzgünce formatlayıp kaydet
    if (currentTextRef.current && onChangeRef.current) {
      onChangeRef.current(formatTurkishSentence(currentTextRef.current.trim()));
    }
  }, []);

  // Başka bir ses butonu açılırsa bu butonu otomatik durdur, unmount olunca temizle
  useEffect(() => {
    const handleGlobalSpeechStart = (e) => {
      if (e.detail?.id !== buttonId && isListeningRef.current) {
        stopListening();
      }
    };

    window.addEventListener('otoil:speech-start', handleGlobalSpeechStart);
    return () => {
      window.removeEventListener('otoil:speech-start', handleGlobalSpeechStart);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (stopSafetyTimerRef.current) clearTimeout(stopSafetyTimerRef.current);
      stopListening();
    };
  }, [buttonId, stopListening]);

  // Yeni bir SpeechRecognition oturumu oluşturup başlatan fonksiyon
  const startRecognitionSession = useCallback(() => {
    if (!isListeningRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      // Eğer önceki bir referans hala açıksa güvenle sonlandır
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.stop();
        } catch {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';

      // iOS WebKit'te continuous: true motor çökmesine ve 2. denemede donmasına yol açar (WebKit Bug 317741).
      // Bu nedenle iOS/Safari'de continuous = false kullanılır.
      recognition.continuous = !isIOS;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[OTOIL Sesle Yazma] SpeechRecognition oturumu aktif.');
        setIsConnecting(false);
        setIsListening(true);
        isStoppingRef.current = false;
        setIsStopping(false);
      };

      recognition.onresult = (event) => {
        // Oturumun başından itibaren gelen tüm sonuçları temiz bir şekilde birleştir
        // Bu sayede hem kelime tekrarı (duplicate) önlenir hem de kesintisiz akış sağlanır
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          if (res.isFinal) {
            sessionFinal += (sessionFinal ? ' ' : '') + transcript.trim();
          } else {
            sessionInterim += (sessionInterim ? ' ' : '') + transcript.trim();
          }
        }

        const fullSpeech = (
          sessionFinal + (sessionFinal && sessionInterim ? ' ' : '') + sessionInterim
        ).trim();

        if (sessionInterim || sessionFinal) {
          setLiveTranscript(sessionInterim || sessionFinal);
        }

        const cleanSpeech = cleanTurkishPunctuation(fullSpeech);
        const base = baseTextRef.current;
        let combined = '';

        if (base && cleanSpeech) {
          const lastChar = base.slice(-1);
          const separator = /[.!?\n]/.test(lastChar) ? ' ' : (lastChar === ',' ? ' ' : '. ');
          combined = `${base}${separator}${cleanSpeech}`;
        } else if (cleanSpeech) {
          combined = cleanSpeech;
        } else {
          combined = base;
        }

        combined = formatTurkishSentence(combined);
        if (onChangeRef.current) {
          onChangeRef.current(combined);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[OTOIL Sesle Yazma] Hata:', event.error);
        if (event.error === 'no-speech') {
          // Kullanıcı durakladıysa sessizlik normaldir, onend akışı yönetir
          return;
        }
        if (event.error === 'aborted') {
          // Oturum kullanıcı tarafından durduruldu veya kapatıldı
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorMessage('Mikrofon erişim izni verilmedi. Lütfen tarayıcı ayarlarından izin verin.');
          stopListening();
        } else if (event.error === 'network') {
          setErrorMessage('Google ses sunucusuna ulaşılamadı (İnternet bağlantınızı kontrol edin).');
          stopListening();
        } else if (event.error === 'service-not-allowed') {
          setErrorMessage('Tarayıcı ses tanıma servisini engelliyor.');
          stopListening();
        } else if (event.error === 'audio-capture') {
          setErrorMessage('Mikrofon sesi alınamıyor.');
          stopListening();
        }
      };

      recognition.onend = () => {
        console.log('[OTOIL Sesle Yazma] onend tetiklendi. isListening:', isListeningRef.current, 'isIOS:', isIOS);
        recognitionRef.current = null;
        isStoppingRef.current = false;
        setIsStopping(false);

        // Kullanıcı butona basarak durdurduysa tamamen kapat
        if (!isListeningRef.current) {
          setIsListening(false);
          setIsConnecting(false);
          setLiveTranscript('');
          return;
        }

        // Kullanıcı henüz durdurmadıysa ve sessizlik nedeniyle onend geldiyse:
        // iOS Safari'de onend içinde anında start() çağırmak WebKit ses oturumunu kilitler (zombie state)!
        // Bu yüzden iOS'ta kullanıcı bir cümleyi bitirdiğinde oturumu temizce kapatıyoruz.
        // Kullanıcı dilediğinde tekrar 'Sesle Yaz' butonuna basarak bir sonraki cümleyi kolayca ekleyebilir.
        if (isIOS) {
          isListeningRef.current = false;
          setIsListening(false);
          setIsConnecting(false);
          setLiveTranscript('');
          if (currentTextRef.current && onChangeRef.current) {
            onChangeRef.current(formatTurkishSentence(currentTextRef.current.trim()));
          }
        } else {
          // Desktop Chrome / Edge üzerinde sessizlik sonrası yumuşak yeniden başlatma
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              baseTextRef.current = (currentTextRef.current || '').trim();
              startRecognitionSession();
            }
          }, 120);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[OTOIL Sesle Yazma] startRecognitionSession hatası:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setIsConnecting(false);
      isStoppingRef.current = false;
      setIsStopping(false);
      recognitionRef.current = null;

      if (err.name === 'NotAllowedError') {
        setErrorMessage('Mikrofon erişim izni verilmedi.');
      } else {
        setErrorMessage('Ses tanıma başlatılamadı. Lütfen tekrar deneyin.');
      }
    }
  }, [stopListening]);

  // Sesle yazmayı başlatma (Senkron kullanıcı jesti korunur)
  const startListening = () => {
    if (isStoppingRef.current) {
      console.log('[OTOIL Sesle Yazma] Önceki oturum kapatılıyor, lütfen bekleyin.');
      return;
    }

    setErrorMessage('');
    setLiveTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Tarayıcınız sesle yazmayı desteklemiyor. Google Chrome veya Safari önerilir.');
      setShowHelpModal(true);
      return;
    }

    // Diğer ses butonlarını durdur
    window.dispatchEvent(new CustomEvent('otoil:speech-start', { detail: { id: buttonId } }));

    setIsConnecting(true);
    isListeningRef.current = true;

    // Kayıt başladığındaki mevcut metni sakla
    baseTextRef.current = (currentTextRef.current || '').trim();

    // Doğrudan senkron olarak oturumu başlat (Kullanıcı jesti / user gesture stack korunur)
    startRecognitionSession();
  };

  const handleToggle = () => {
    if (isStopping) return;
    if (isListening || isConnecting) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Mikrofon Aç/Kapa Butonu */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isStopping}
        title={isListening ? 'Kaydı Durdur' : isStopping ? 'Kapatılıyor...' : title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all select-none active:scale-95 ${
          isListening
            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400/60'
            : isStopping
            ? 'bg-amber-600/90 text-white cursor-wait opacity-80'
            : isConnecting
            ? 'bg-amber-500 text-white animate-pulse'
            : isDark
            ? 'bg-white/10 hover:bg-white/20 text-sky-200 border border-white/15 hover:border-white/30'
            : 'bg-sky-50 hover:bg-sky-100 text-[#0c4a6e] border border-sky-200/80 hover:border-sky-300 shadow-2xs'
        } ${className}`}
      >
        {isListening ? (
          <>
            {/* Dinleniyor Ses Dalgası Animasyonu (Saf CSS - Donanım çakışması yapmaz) */}
            <span className="flex items-center gap-0.5 h-3 px-0.5">
              <span className="w-1 bg-white rounded-full h-2.5 animate-pulse" />
              <span className="w-1 bg-white rounded-full h-3.5 animate-pulse [animation-delay:150ms]" />
              <span className="w-1 bg-white rounded-full h-2 animate-pulse [animation-delay:300ms]" />
            </span>
            <span className="font-bold tracking-tight text-[11px]">Dinleniyor... (Durdur)</span>
            <svg className="w-3 h-3 ml-0.5 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </>
        ) : isStopping ? (
          <>
            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[11px]">Durduruluyor...</span>
          </>
        ) : isConnecting ? (
          <>
            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[11px]">Bağlanıyor...</span>
          </>
        ) : (
          <>
            <svg
              className={`w-3.5 h-3.5 ${isDark ? 'text-sky-300' : 'text-[#1273a8]'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-[11px] font-medium hidden sm:inline">Sesle Yaz</span>
          </>
        )}
      </button>

      {/* Dinleme Anında Canlı Kelime Önizleme Rozeti */}
      {isListening && liveTranscript && (
        <span className="hidden md:inline-flex items-center text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full max-w-[220px] truncate animate-fade-in">
          🗣️ &quot;{liveTranscript}&quot;
        </span>
      )}

      {/* Hata Bildirimi */}
      {errorMessage && (
        <div className="absolute right-0 top-full mt-1.5 z-50 max-w-xs bg-slate-900 text-white text-[11px] py-2 px-3 rounded-xl shadow-xl border border-rose-500/40 flex items-start gap-2 animate-in fade-in">
          <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="leading-snug text-slate-200">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-sky-300 underline font-semibold mt-1 inline-block hover:text-sky-200"
            >
              Nasıl çözülür?
            </button>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-slate-400 hover:text-white font-bold text-sm px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Yardım / Çözüm Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                🎤 Sesle Yazma Ayarları ve Çözümler
              </h4>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-3 pt-3 leading-relaxed">
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-900">
                <strong>1. Tarayıcı Mikrofon İzni:</strong>
                <p className="mt-0.5">Adres çubuğundaki (URL yanındaki) kilit veya ayar simgesine tıklayın ve <strong>Mikrofon</strong> seçeneğini <strong>İzin Ver</strong> olarak işaretleyin.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                <strong>2. Mac Sistem İzinleri (macOS):</strong>
                <p className="mt-0.5">Mac kullanıyorsanız: <em>Sistem Ayarları &gt; Gizlilik ve Güvenlik &gt; Mikrofon</em> bölümünden kullandığınız tarayıcıya (Chrome/Safari) izin verildiğinden emin olun.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                <strong>3. Brave veya Diğer Tarayıcılar:</strong>
                <p className="mt-0.5">Brave kullanıyorsanız <code>brave://settings/privacy</code> sayfasına gidip <em>&quot;Use Google services for speech recognition&quot;</em> ayarını açın veya doğrudan <strong>Google Chrome</strong> kullanın.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900">
                <strong>4. İnternet Bağlantısı:</strong>
                <p className="mt-0.5">Google Web Speech API Türkçe ses tanımayı bulut üzerinden yaptığı için cihazın aktif internete bağlı olması gereklidir.</p>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="bg-[#0c4a6e] hover:bg-[#1273a8] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceInputButton;
