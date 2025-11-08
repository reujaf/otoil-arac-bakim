import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import logo from '../assets/otoil-logo.png';

function BakimMerkezi() {
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Kullanıcının kayıtlarını çek
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

        // Bugünün tarihi
        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);

        // 1 hafta sonrası
        const birHaftaSonra = new Date(bugun);
        birHaftaSonra.setDate(birHaftaSonra.getDate() + 7);

        // Bildirim gerektiren kayıtları filtrele
        const bildirimListesi = hizmetListesi.filter((hizmet) => {
          if (!hizmet.sonrakiBakimTarihi) return false;

          const sonrakiBakimTarihi = hizmet.sonrakiBakimTarihi.toDate();
          sonrakiBakimTarihi.setHours(0, 0, 0, 0);

          // Tarihi geçmiş veya 1 hafta içinde olan kayıtlar
          return sonrakiBakimTarihi <= birHaftaSonra;
        });

        // Tarihi geçmiş olanları önce göster
        bildirimListesi.sort((a, b) => {
          const tarihA = a.sonrakiBakimTarihi.toDate();
          const tarihB = b.sonrakiBakimTarihi.toDate();
          const bugun = new Date();
          bugun.setHours(0, 0, 0, 0);
          
          const gecmisA = tarihA < bugun;
          const gecmisB = tarihB < bugun;
          
          if (gecmisA && !gecmisB) return -1;
          if (!gecmisA && gecmisB) return 1;
          return tarihA - tarihB;
        });

        setBildirimler(bildirimListesi);
        setLoading(false);

        // Okunmuş bildirimleri kontrol et ve sayıyı hesapla
        const savedOkunmus = localStorage.getItem('okunmusBildirimler');
        const okunmusSet = savedOkunmus ? new Set(JSON.parse(savedOkunmus)) : new Set();
        const okunmamisSayisi = bildirimListesi.filter(b => !okunmusSet.has(b.id)).length;
        setBildirimSayisi(okunmamisSayisi);
      },
      (error) => {
        console.error('Veri çekme hatası:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBildirimDurumu = (sonrakiBakimTarihi) => {
    if (!sonrakiBakimTarihi) return { text: '', className: '' };

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const sonrakiBakim = sonrakiBakimTarihi.toDate();
    sonrakiBakim.setHours(0, 0, 0, 0);

    if (sonrakiBakim < bugun) {
      return { text: 'BAKIM TARİHİ GEÇMİŞ!', className: 'bg-red-100 border-red-400 text-red-800' };
    } else if (sonrakiBakim.getTime() === bugun.getTime()) {
      return { text: 'BUGÜN BAKIM GÜNÜ!', className: 'bg-orange-100 border-orange-400 text-orange-800' };
    } else {
      return { text: 'Yaklaşıyor', className: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    );
  }

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
                  onClick={() => navigate('/bakim-merkezi')}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bakım Merkezi</h1>
        {bildirimler.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">Henüz bakım zamanı gelen müşteri bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bildirimler.map((hizmet) => {
              const durum = getBildirimDurumu(hizmet.sonrakiBakimTarihi);
              return (
                <div
                  key={hizmet.id}
                  className={`bg-white rounded-2xl shadow-lg border-l-4 ${durum.className.includes('red') ? 'border-red-500' : durum.className.includes('orange') ? 'border-orange-500' : 'border-yellow-500'} p-6 hover:shadow-xl transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{hizmet.plaka}</h3>
                      <p className="text-sm text-gray-600">{hizmet.isim} {hizmet.soyisim}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      durum.className.includes('red') ? 'bg-red-100 text-red-800' : 
                      durum.className.includes('orange') ? 'bg-orange-100 text-orange-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {durum.text}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Araç:</span> {hizmet.aracModeli}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Son Bakım:</span> {formatDate(hizmet.hizmetTarihi)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Sonraki Bakım:</span> {formatDate(hizmet.sonrakiBakimTarihi)}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2 mt-2">
                      <span className="font-semibold">İşlemler:</span> {hizmet.yapilanIslemler}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default BakimMerkezi;

