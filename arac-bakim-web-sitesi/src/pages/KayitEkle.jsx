import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import HizmetKayitFormu from '../components/HizmetKayitFormu';
import logo from '../assets/otoil-logo.png';

function KayitEkle() {
  const [user, setUser] = useState(null);
  const [menuAcik, setMenuAcik] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] page-safe-bottom">
      {/* HERO HEADER */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 header-safe-top pb-10">
        {/* Üstten aşağı yumuşak beyaz geçiş (fade) */}
        <div className="header-fade-overlay" />
        {/* dekoratif şekiller */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-3xl mx-auto">
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

          <p className="text-white/70 text-sm font-medium">Yeni Kayıt</p>
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">Hizmet Kayıt Formu</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-4 relative z-20">
        <HizmetKayitFormu />
      </main>
    </div>
  );
}

export default KayitEkle;
