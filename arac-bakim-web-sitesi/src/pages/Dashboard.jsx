import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [gunlukCiro, setGunlukCiro] = useState(0);
  const [gunlukCiroVerileri, setGunlukCiroVerileri] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Günlük ciro verilerini hesapla
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

        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);
        const bugunSonu = new Date(bugun);
        bugunSonu.setHours(23, 59, 59, 999);

        // Bugünün kayıtları ve cirosu
        const bugununListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.hizmetTarihi) return false;
          const hizmetTarihi = hizmet.hizmetTarihi.toDate();
          return hizmetTarihi >= bugun && hizmetTarihi <= bugunSonu;
        });

        // Bugünün cirosu
        const toplamCiro = bugununListesi.reduce((toplam, hizmet) => {
          const ucret = hizmet.alınanUcret || 0;
          return toplam + ucret;
        }, 0);
        setGunlukCiro(toplamCiro);

        // Son 7 günün günlük ciro verilerini hesapla
        const gunlukCiroData = [];
        for (let i = 6; i >= 0; i--) {
          const tarih = new Date(bugun);
          tarih.setDate(tarih.getDate() - i);
          const gunBaslangic = new Date(tarih);
          gunBaslangic.setHours(0, 0, 0, 0);
          const gunSonu = new Date(tarih);
          gunSonu.setHours(23, 59, 59, 999);

          const gununHizmetleri = hizmetListesi.filter((hizmet) => {
            if (!hizmet.hizmetTarihi) return false;
            const hizmetTarihi = hizmet.hizmetTarihi.toDate();
            return hizmetTarihi >= gunBaslangic && hizmetTarihi <= gunSonu;
          });

          const gununCirosu = gununHizmetleri.reduce((toplam, hizmet) => {
            return toplam + (hizmet.alınanUcret || 0);
          }, 0);

          // Tarih formatı: Pazartesi, Salı vb. veya kısa format
          const gunAdi = tarih.toLocaleDateString('tr-TR', { weekday: 'short' });
          const tarihFormat = tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

          gunlukCiroData.push({
            gun: gunAdi,
            tarih: tarihFormat,
            ciro: gununCirosu,
            fullDate: tarih
          });
        }

        setGunlukCiroVerileri(gunlukCiroData);
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
        {/* Hoşgeldin Patron Başlığı */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Hoşgeldin Patron 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Günlük performansınızı takip edin
          </p>
        </div>

        {/* Günlük Ciro Performans Chart'ı */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Günlük Ciro Performansı</h2>
          {gunlukCiroVerileri.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={gunlukCiroVerileri}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#26a9e0" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#26a9e0" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="gun" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [
                    `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`,
                    'Ciro'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.tarih;
                    }
                    return label;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ciro" 
                  stroke="#26a9e0" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCiro)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Veri yükleniyor...</p>
            </div>
          )}
        </div>

        {/* Bugünün Cirosu Kartı */}
        <div className="bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4] rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm font-medium mb-2">Bugünün Cirosu</p>
              <p className="text-white text-4xl font-bold">
                {gunlukCiro.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} ₺
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default Dashboard;

