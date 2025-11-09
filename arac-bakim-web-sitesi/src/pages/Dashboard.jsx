import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [toplamKayit, setToplamKayit] = useState(0);
  const [bugununKayitlari, setBugununKayitlari] = useState(0);
  const [gunlukCiro, setGunlukCiro] = useState(0);
  const [personelPerformans, setPersonelPerformans] = useState([]);

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

    // Tüm kullanıcıların kayıtlarını göster (ortak veri)
    const q = query(
      collection(db, 'hizmetler')
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

        // Günlük ciro hesapla
        const toplamCiro = bugununListesi.reduce((toplam, hizmet) => {
          const ucret = hizmet.alınanUcret || 0;
          return toplam + ucret;
        }, 0);
        setGunlukCiro(toplamCiro);


        // Personel performansını hesapla
        const personelListesi = ['Şahin Lale'];
        const performansData = personelListesi.map((personel) => {
          const personelKayitlari = hizmetListesi.filter((hizmet) => hizmet.personel === personel || hizmet.personel === 'Şahin' || hizmet.personel === 'Onur' || !hizmet.personel);
          const bugununKayitlari = personelKayitlari.filter((hizmet) => {
            if (!hizmet.hizmetTarihi) return false;
            const hizmetTarihi = hizmet.hizmetTarihi.toDate();
            return hizmetTarihi >= bugun && hizmetTarihi <= bugunSonu;
          });
          const toplamCiro = personelKayitlari.reduce((toplam, hizmet) => {
            return toplam + (hizmet.alınanUcret || 0);
          }, 0);
          const bugununCirosu = bugununKayitlari.reduce((toplam, hizmet) => {
            return toplam + (hizmet.alınanUcret || 0);
          }, 0);

          return {
            personel,
            toplamKayit: personelKayitlari.length,
            bugununKayitlari: bugununKayitlari.length,
            toplamCiro,
            bugununCirosu,
          };
        });

        // Kayıt sayısına göre sırala (en çok kayıt alan üstte)
        performansData.sort((a, b) => b.toplamKayit - a.toplamKayit);
        setPersonelPerformans(performansData);

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
    <div className="min-h-screen bg-white pb-16">
      {/* Modern Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={logo} alt="OTOIL Logo" className="h-[52px] w-auto cursor-pointer" onClick={() => navigate('/')} />
            </div>
            <div className="flex items-center space-x-6">
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
        {/* Bugünün Kayıtları */}
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

        {/* Günlük Ciro Kartı */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium mb-1">Günlük Ciro</p>
                  <p className="text-white text-3xl font-bold">
                    {gunlukCiro.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} ₺
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

        {/* Personel Performans Grafiği */}
        {personelPerformans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personel Performansı - Bugün</h2>
                
                {/* Bugünün Kayıtları Grafiği */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Bugünün Kayıtları</h3>
                    <span className="text-sm font-bold text-gray-900">
                      Toplam: {personelPerformans.reduce((sum, p) => sum + p.bugununKayitlari, 0)} kayıt
                    </span>
                  </div>
                  <div className="space-y-4">
                    {personelPerformans.map((personel, index) => {
                      const bugunToplamKayit = personelPerformans.reduce((sum, p) => sum + p.bugununKayitlari, 0);
                      const barWidth = bugunToplamKayit > 0 ? (personel.bugununKayitlari / bugunToplamKayit) * 100 : 0;

                      return (
                        <div key={`kayit-${personel.personel}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-[#26a9e0]' : index === 1 ? 'bg-[#10b981]' : 'bg-gray-400'
                              }`}></div>
                              <span className="font-semibold text-gray-900">{personel.personel}</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">{personel.bugununKayitlari}</span>
                          </div>
                          <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                                index === 0 ? 'bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4]' : 
                                index === 1 ? 'bg-gradient-to-r from-[#10b981] to-[#059669]' : 
                                'bg-gradient-to-r from-gray-400 to-gray-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            >
                              {barWidth > 15 && (
                                <span className="text-white text-sm font-semibold">{personel.bugununKayitlari}</span>
                              )}
                            </div>
                            {barWidth <= 15 && personel.bugununKayitlari > 0 && (
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-semibold text-gray-700">
                                {personel.bugununKayitlari}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bugünün Cirosu Grafiği */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Bugünün Cirosu</h3>
                    <span className="text-sm font-bold text-gray-900">
                      Toplam: {personelPerformans.reduce((sum, p) => sum + p.bugununCirosu, 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} ₺
                    </span>
                  </div>
                  <div className="space-y-4">
                    {personelPerformans.map((personel, index) => {
                      const bugunToplamCiro = personelPerformans.reduce((sum, p) => sum + p.bugununCirosu, 0);
                      const barWidth = bugunToplamCiro > 0 ? (personel.bugununCirosu / bugunToplamCiro) * 100 : 0;

                      return (
                        <div key={`ciro-${personel.personel}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-[#26a9e0]' : index === 1 ? 'bg-[#10b981]' : 'bg-gray-400'
                              }`}></div>
                              <span className="font-semibold text-gray-900">{personel.personel}</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">
                              {personel.bugununCirosu.toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })} ₺
                            </span>
                          </div>
                          <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                                index === 0 ? 'bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4]' : 
                                index === 1 ? 'bg-gradient-to-r from-[#10b981] to-[#059669]' : 
                                'bg-gradient-to-r from-gray-400 to-gray-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            >
                              {barWidth > 20 && (
                                <span className="text-white text-sm font-semibold">
                                  {personel.bugununCirosu.toLocaleString('tr-TR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  })} ₺
                                </span>
                              )}
                            </div>
                            {barWidth <= 20 && personel.bugununCirosu > 0 && (
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-semibold text-gray-700">
                                {personel.bugununCirosu.toLocaleString('tr-TR', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })} ₺
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </main>

      <BottomNavigation />
    </div>
  );
}

export default Dashboard;

