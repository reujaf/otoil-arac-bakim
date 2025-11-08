import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Bildirimler from '../components/Bildirimler';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [toplamKayit, setToplamKayit] = useState(0);
  const [gecmisBakim, setGecmisBakim] = useState(0);
  const [yaklasanBakim, setYaklasanBakim] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Bildirim sayısını ve istatistikleri hesapla
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

        // Toplam kayıt sayısı
        setToplamKayit(hizmetListesi.length);

        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);
        const birHaftaSonra = new Date(bugun);
        birHaftaSonra.setDate(birHaftaSonra.getDate() + 7);

        // Bakımı geçmiş kayıtlar
        const gecmisListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.sonrakiBakimTarihi) return false;
          const sonrakiBakimTarihi = hizmet.sonrakiBakimTarihi.toDate();
          sonrakiBakimTarihi.setHours(0, 0, 0, 0);
          return sonrakiBakimTarihi < bugun;
        });
        setGecmisBakim(gecmisListesi.length);

        // Yaklaşan bakımlar (1 hafta içinde)
        const yaklasanListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.sonrakiBakimTarihi) return false;
          const sonrakiBakimTarihi = hizmet.sonrakiBakimTarihi.toDate();
          sonrakiBakimTarihi.setHours(0, 0, 0, 0);
          return sonrakiBakimTarihi >= bugun && sonrakiBakimTarihi <= birHaftaSonra;
        });
        setYaklasanBakim(yaklasanListesi.length);

        // Bildirim listesi (geçmiş + yaklaşan)
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
        console.error('Veri çekme hatası:', error);
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
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      {/* Modern Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={logo} alt="OTOIL Logo" className="h-[52px] w-auto cursor-pointer" onClick={() => navigate('/')} />
            </div>
            <div className="flex items-center space-x-6">
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

      {/* Dashboard İçeriği */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-[#26a9e0] via-[#1e8fc4] to-[#26a9e0] rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <span className="text-sm opacity-90">{user?.email?.split('@')[0]}</span>
          </div>
        </div>

        {/* Dairesel Progress Bar - Toplam Kayıt */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 mb-6">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#26a9e0"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(toplamKayit / Math.max(toplamKayit, 1)) * 502.4} 502.4`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-[#26a9e0]">{toplamKayit}</p>
                <p className="text-sm text-gray-500 mt-1">Toplam Kayıt</p>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Bakımı Geçmiş */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="bg-red-100 rounded-lg p-2 mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Bakımı Geçmiş</p>
                    <p className="text-xs text-gray-500">Acil Müdahale</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-red-600">{gecmisBakim}</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((gecmisBakim / Math.max(toplamKayit, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{gecmisBakim} / {toplamKayit} kayıt</p>
                </div>
              </div>
            </div>
          </div>

          {/* Yaklaşan Bakım */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <div className="bg-yellow-100 rounded-lg p-2 mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Yaklaşan Bakım</p>
                    <p className="text-xs text-gray-500">1 Hafta İçinde</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-yellow-600">{yaklasanBakim}</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((yaklasanBakim / Math.max(toplamKayit, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{yaklasanBakim} / {toplamKayit} kayıt</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kayıt Ekle */}
            <div
              onClick={() => navigate('/kayit-ekle')}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-lg p-3 mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Yeni Kayıt Ekle</p>
                    <p className="text-xs text-gray-500">Hızlı Kayıt</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Bakım Merkezi */}
            <div
              onClick={() => navigate('/bakim-merkezi')}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-lg p-3 mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Bakım Merkezi</p>
                    <p className="text-xs text-gray-500">Tüm Kayıtlar</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bildirim Modal */}
      {bildirimModalAcik && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={() => setBildirimModalAcik(false)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
      <BottomNavigation />
    </div>
  );
}

export default Dashboard;

