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
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      let errorMessage = err.message;
      const errorCode = err.code || '';
      if (errorCode === 'auth/invalid-email') errorMessage = 'Geçersiz e-posta adresi.';
      else if (errorCode === 'auth/user-not-found') errorMessage = 'Kullanıcı bulunamadı.';
      else if (errorCode === 'auth/wrong-password') errorMessage = 'Yanlış şifre.';
      else if (errorCode === 'auth/network-request-failed') errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
      else if (errorCode === 'auth/api-key-not-valid') errorMessage = 'Firebase yapılandırması eksik!';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 30%, #26a9e0 60%, #7dd3fc 100%)' }}>
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <img src={logoWhite} alt="OTOIL" className="h-16 w-auto mx-auto" />
        </div>

        <div className="glass-modal rounded-3xl p-7">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl p-3 text-sm font-medium text-red-700" style={{ background: 'rgba(254,202,202,0.5)' }}>
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5">E-posta Adresi</label>
              <input
                id="email" type="email" autoComplete="email" required
                className="glass-input w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                placeholder="ornek@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1.5">Şifre</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                  className="glass-input w-full px-4 py-3 pr-10 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="glass-btn-blue w-full flex justify-center items-center py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Yükleniyor...
                </span>
              ) : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-white/50 text-[11px]">© 2024 OTOIL - Tüm hakları saklıdır</p>
      </div>
    </div>
  );
}

export default LoginPage;
