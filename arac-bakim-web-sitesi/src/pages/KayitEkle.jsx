import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import HizmetKayitFormu from '../components/HizmetKayitFormu';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

function KayitEkle() {
  const [user, setUser] = useState(null);
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
    <div className="glass-bg pb-24">
      <nav className="glass-card-solid sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <img src={logo} alt="OTOIL" className="h-9 w-auto cursor-pointer" onClick={() => navigate('/')} />
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</span>
              <button onClick={handleLogout} className="glass-btn-white text-slate-600 px-3 py-1.5 rounded-xl text-xs font-medium">
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <HizmetKayitFormu />
      </main>
      <BottomNavigation />
    </div>
  );
}

export default KayitEkle;
