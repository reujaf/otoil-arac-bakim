import { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import logoWhite from '../assets/otoil-logo-white.png';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Giriş yap
      await signInWithEmailAndPassword(auth, email, password);
      // Başarılı giriş sonrası ana sayfaya yönlendir
      navigate('/');
    } catch (err) {
      // Hata mesajlarını Türkçeleştir
      let errorMessage = err.message;
      
      // Hata kodunu kontrol et (Firebase hataları için)
      const errorCode = err.code || '';
      const errorMessageLower = err.message?.toLowerCase() || '';
      
      if (errorCode === 'auth/api-key-not-valid' || errorMessageLower.includes('api-key-not-valid')) {
        errorMessage = 'Firebase yapılandırması eksik! Lütfen src/firebaseConfig.js dosyasındaki Firebase bilgilerini doldurun.';
      } else if (errorCode === 'auth/invalid-email' || errorMessageLower.includes('invalid-email')) {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (errorCode === 'auth/weak-password' || errorMessageLower.includes('weak-password')) {
        errorMessage = 'Şifre çok zayıf. En az 6 karakter olmalıdır.';
      } else if (errorCode === 'auth/user-not-found' || errorMessageLower.includes('user-not-found')) {
        errorMessage = 'Kullanıcı bulunamadı.';
      } else if (errorCode === 'auth/wrong-password' || errorMessageLower.includes('wrong-password')) {
        errorMessage = 'Yanlış şifre.';
      } else if (errorCode === 'auth/network-request-failed' || errorMessageLower.includes('network')) {
        errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#26a9e0] via-[#1e8fc4] to-[#26a9e0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img 
              src={logoWhite} 
              alt="OTOIL Logo" 
              className="h-20 w-auto"
            />
          </div>
        </div>

        {/* Form Kartı */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#26a9e0] focus:border-[#26a9e0] transition-all text-gray-900 placeholder-gray-400"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#26a9e0] focus:border-[#26a9e0] transition-all text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.17 3.17L3 3m0 0l3.29 3.29m0 0A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md text-white font-medium bg-[#26a9e0] hover:bg-[#1e8fc4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#26a9e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: loading ? '#94a3b8' : '#26a9e0' }}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yükleniyor...
                  </span>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Alt Bilgi */}
        <p className="mt-6 text-center text-white/80 text-xs">
          © 2024 OTOIL - Tüm hakları saklıdır
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

