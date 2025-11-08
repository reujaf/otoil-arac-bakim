import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Bildirimler from '../components/Bildirimler';
import BottomNavigation from '../components/BottomNavigation';
import InstallPrompt from '../components/InstallPrompt';
import logo from '../assets/otoil-logo.png';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [toplamKayit, setToplamKayit] = useState(0);
  const [gecmisBakim, setGecmisBakim] = useState(0);
  const [yaklasanBakim, setYaklasanBakim] = useState(0);
  const [bugununKayitlari, setBugununKayitlari] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

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
        const bugunSonu = new Date(bugun);
        bugunSonu.setHours(23, 59, 59, 999);
        const birHaftaSonra = new Date(bugun);
        birHaftaSonra.setDate(birHaftaSonra.getDate() + 7);

        // Bugünün kayıtları
        const bugununListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.hizmetTarihi) return false;
          const hizmetTarihi = hizmet.hizmetTarihi.toDate();
          return hizmetTarihi >= bugun && hizmetTarihi <= bugunSonu;
        });
        setBugununKayitlari(bugununListesi.length);

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

  // Swipe fonksiyonları
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
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
        {/* Kaydırmalı Dairesel Progress Bar */}
        <div 
          className="relative mb-6 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slide 1: Bugünün Kayıtları */}
            <div className="min-w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
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
                      strokeDasharray={`${bugununKayitlari > 0 ? 502.4 : 0} 502.4`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-[#26a9e0]">{bugununKayitlari}</p>
                    <p className="text-sm text-gray-500 mt-1">Bugünün Kayıtları</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2: Toplam Kayıt ve Bakımı Geçmiş */}
            <div className="min-w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="transform -rotate-90 w-48 h-48">
                    {/* Arka plan çember */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#e5e7eb"
                      strokeWidth="16"
                      fill="none"
                    />
                    {/* Toplam kayıt çemberi (mavi) */}
                    {toplamKayit > 0 && (
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#26a9e0"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray="502.4 502.4"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                    {/* Bakımı geçmiş çemberi (kırmızı overlay) */}
                    {gecmisBakim > 0 && toplamKayit > 0 && (
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#ef4444"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${(gecmisBakim / toplamKayit) * 502.4} 502.4`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-[#26a9e0]">{toplamKayit}</p>
                    <p className="text-sm text-gray-500 mt-1">Toplam Kayıt</p>
                    {gecmisBakim > 0 && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">{gecmisBakim} Geçmiş</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Göstergeleri */}
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => setCurrentSlide(0)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === 0 ? 'bg-[#26a9e0] w-8' : 'bg-gray-300'
              }`}
            />
            <button
              onClick={() => setCurrentSlide(1)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === 1 ? 'bg-[#26a9e0] w-8' : 'bg-gray-300'
              }`}
            />
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
      <InstallPrompt />
    </div>
  );
}

export default Dashboard;

