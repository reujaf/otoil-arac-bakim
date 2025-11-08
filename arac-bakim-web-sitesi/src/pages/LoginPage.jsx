import { useState } from 'react';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Yeni kullanıcı kaydı
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Giriş yap
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Başarılı giriş/kayıt sonrası ana sayfaya yönlendir
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
      } else if (errorCode === 'auth/email-already-in-use' || errorMessageLower.includes('email-already-in-use')) {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Araç Bakım Kayıt Sistemi
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="E-posta adresi"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yükleniyor...' : isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              {isSignUp
                ? 'Zaten hesabınız var mı? Giriş yapın'
                : 'Hesabınız yok mu? Kayıt olun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

