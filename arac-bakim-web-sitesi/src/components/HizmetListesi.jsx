import { useEffect, useState } from 'react';
import { db, auth, storage } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logo from '../assets/otoil-logo.png';
import { generateHizmetFormuPDF } from '../utils/pdfGenerator';
import { Skeleton } from './SkeletonLoader';

function HizmetListesi() {
  const [hizmetler, setHizmetler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHizmet, setSelectedHizmet] = useState(null);
  const [aramaMetni, setAramaMetni] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Tüm kullanıcıların kayıtlarını çek (ortak veri) - en son eklenen en üstte
    const q = query(
      collection(db, 'hizmetler'),
      orderBy('olusturmaTarihi', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hizmetListesi = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHizmetler(hizmetListesi);
        setLoading(false);
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
    try {
      const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      if (!date || isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatDateShort = (timestamp) => {
    if (!timestamp) return '-';
    try {
      const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      if (!date || isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('tr-TR');
    } catch {
      return '-';
    }
  };

  // Müşteri adını al (eski ve yeni format desteği)
  const getMusteriAdi = (hizmet) => {
    if (hizmet.adSoyad) {
      return hizmet.adSoyad;
    }
    // Eski format desteği
    if (hizmet.isim || hizmet.soyisim) {
      return `${hizmet.isim || ''} ${hizmet.soyisim || ''}`.trim();
    }
    return '-';
  };

  // Fiyatı Türk formatında formatla
  const formatFiyat = (ucret) => {
    if (!ucret && ucret !== 0) return '0,00';
    const numValue = typeof ucret === 'number' ? ucret : parseFloat(ucret);
    if (isNaN(numValue)) return '0,00';
    return numValue.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePDFOlustur = async (hizmet) => {
    await generateHizmetFormuPDF(hizmet, logo);
  };


  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 ring-1 ring-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Arama fonksiyonu
  const filtrelenmisHizmetler = hizmetler.filter((hizmet) => {
    if (!aramaMetni) return true;
    const arama = aramaMetni.toLowerCase();
    const plaka = (hizmet.plaka || '').toLowerCase();
    const musteriAdi = getMusteriAdi(hizmet).toLowerCase();
    
    return plaka.includes(arama) || musteriAdi.includes(arama);
  });

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h2 className="text-3xl font-bold text-gray-900">Hizmet Kayıtları</h2>
          
          {/* Arama Kutusu */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Plaka veya müşteri adı ile ara..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {aramaMetni && (
              <button
                onClick={() => setAramaMetni('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Arama sonuç sayısı */}
        {aramaMetni && (
          <div className="mb-4 text-sm text-gray-600">
            {filtrelenmisHizmetler.length} kayıt bulundu
          </div>
        )}

        {hizmetler.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">Henüz hizmet kaydı bulunmamaktadır.</p>
          </div>
        ) : filtrelenmisHizmetler.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">Arama kriterinize uygun kayıt bulunamadı.</p>
            <button
              onClick={() => setAramaMetni('')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Aramayı temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrelenmisHizmetler.map((hizmet) => (
              <div
                key={hizmet.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{hizmet.plaka}</h3>
                    <p className="text-sm text-gray-600">{getMusteriAdi(hizmet)}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {formatDate(hizmet.hizmetTarihi)}
                  </span>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Araç:</span> {hizmet.aracModeli}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    <span className="font-semibold">İşlemler:</span> {hizmet.yapilanIslemler}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-semibold">Ücret:</span> {formatFiyat(hizmet.alınanUcret)} ₺
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedHizmet(selectedHizmet === hizmet.id ? null : hizmet.id)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {selectedHizmet === hizmet.id ? 'Gizle' : 'Detaylar'}
                  </button>
                  <button
                    onClick={() => handlePDFOlustur(hizmet)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    PDF İndir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detay Modal */}
        {selectedHizmet && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {(() => {
                  const hizmet = filtrelenmisHizmetler.find((h) => h.id === selectedHizmet) || hizmetler.find((h) => h.id === selectedHizmet);
                  if (!hizmet) return null;
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Hizmet Detayları</h3>
                        <button
                          onClick={() => setSelectedHizmet(null)}
                          className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Müşteri</span>
                          <p className="text-lg text-gray-900 mt-1">{getMusteriAdi(hizmet)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Plaka</span>
                          <p className="text-lg text-gray-900 mt-1">{hizmet.plaka}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Araç Modeli</span>
                          <p className="text-lg text-gray-900 mt-1">{hizmet.aracModeli}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Hizmet Tarihi</span>
                          <p className="text-lg text-gray-900 mt-1">{formatDate(hizmet.hizmetTarihi)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Yapılan İşlemler</span>
                          <p className="text-gray-700 mt-1">{hizmet.yapilanIslemler}</p>
                        </div>
                        {hizmet.fullCheckupSonucu && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <span className="text-sm text-gray-600 font-medium">Full Check-up Sonucu</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{hizmet.fullCheckupSonucu}</p>
                          </div>
                        )}
                        {(hizmet.ustaNotu || hizmet.ustaGorusu) && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <span className="text-sm text-gray-600 font-medium">Usta Görüşü & Özel Notlar</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{hizmet.ustaNotu || hizmet.ustaGorusu}</p>
                          </div>
                        )}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <span className="text-sm text-blue-600 font-medium">Alınan Ücret</span>
                          <p className="text-xl font-bold text-blue-900 mt-1">{formatFiyat(hizmet.alınanUcret)} ₺</p>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() => handlePDFOlustur(hizmet)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                          PDF İndir
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HizmetListesi;

