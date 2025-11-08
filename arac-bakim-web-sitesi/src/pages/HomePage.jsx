import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import HizmetKayitFormu from '../components/HizmetKayitFormu';
import HizmetListesi from '../components/HizmetListesi';
import Bildirimler from '../components/Bildirimler';
import logo from '../assets/otoil-logo.png';

function HomePage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Bildirim sayısını hesapla
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'hizmetler'),
      where('kullaniciId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hizmetListesi = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);
        const birHaftaSonra = new Date(bugun);
        birHaftaSonra.setDate(birHaftaSonra.getDate() + 7);

        const bildirimListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.sonrakiBakimTarihi) return false;
          const sonrakiBakimTarihi = hizmet.sonrakiBakimTarihi.toDate();
          sonrakiBakimTarihi.setHours(0, 0, 0, 0);
          return sonrakiBakimTarihi <= birHaftaSonra;
        });

        // Okunmuş bildirimleri kontrol et
        const savedOkunmus = localStorage.getItem('okunmusBildirimler');
        const okunmusSet = savedOkunmus ? new Set(JSON.parse(savedOkunmus)) : new Set();
        const okunmamisSayisi = bildirimListesi.filter(b => !okunmusSet.has(b.id)).length;
        setBildirimSayisi(okunmamisSayisi);
      },
      (error) => {
        console.error('Bildirim sayısı hesaplanırken hata:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={logo} alt="OTOIL Logo" className="h-[52px] w-auto cursor-pointer" onClick={() => navigate('/')} />
            </div>
            <div className="flex items-center space-x-6">
              {/* Menü Linkleri */}
              <div className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ana Sayfa
                </button>
                <button
                  onClick={() => navigate('/bakim-merkezi')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Bakım Merkezi
                </button>
              </div>
              {/* Bildirim İkonu */}
              <div className="relative">
                <button
                  onClick={() => setBildirimModalAcik(!bildirimModalAcik)}
                  className="relative p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {bildirimSayisi > 0 && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
              </div>
              <span className="hidden md:block text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Bildirim Modal */}
      {bildirimModalAcik && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-gray-900">Bildirimler</h3>
              <button
                onClick={() => setBildirimModalAcik(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <Bildirimler onBildirimSayisiDegis={setBildirimSayisi} onBildirimTikla={() => {
                setBildirimModalAcik(false);
                navigate('/bakim-merkezi');
              }} />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <HizmetKayitFormu />
          <HizmetListesi />
        </div>
      </main>
    </div>
  );
}

export default HomePage;

