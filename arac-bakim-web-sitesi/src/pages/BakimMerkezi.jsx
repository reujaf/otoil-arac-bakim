import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import Bildirimler from '../components/Bildirimler';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function BakimMerkezi() {
  const [bildirimler, setBildirimler] = useState([]);
  const [tumKayitlar, setTumKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [aktifSekme, setAktifSekme] = useState('tumu'); // 'tumu' veya 'gecmis'
  const [aramaMetni, setAramaMetni] = useState('');
  const [selectedHizmet, setSelectedHizmet] = useState(null);
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

    // Kullanıcının tüm kayıtlarını çek
    const q = query(
      collection(db, 'hizmetler'),
      where('kullaniciId', '==', user.uid),
      orderBy('olusturmaTarihi', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hizmetListesi = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Tüm kayıtları set et
        setTumKayitlar(hizmetListesi);

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

  const formatDateShort = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('tr-TR');
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

  // Türkçe karakterleri ASCII karakterlere çevir (PDF için)
  const turkceKarakterCevir = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U');
  };

  const handlePDFOlustur = async (hizmet) => {
    try {
      const doc = new jsPDF();
      
      // Sayfa boyutları
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Sağ tarafta modern mavi dikey çubuk
      doc.setFillColor(66, 139, 202); // Mavi renk
      doc.rect(pageWidth - 25, 0, 25, pageHeight, 'F');
      
      // Logo ekleme
      let logoHeight = 0;
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logo;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Logo yükleme zaman aşımı')), 5000);
          img.onload = () => {
            clearTimeout(timeout);
            try {
              // Logo boyutlarını ayarla (genişlik 35mm, yükseklik orantılı)
              const logoWidth = 35;
              logoHeight = (img.height * logoWidth) / img.width;
              doc.addImage(img, 'PNG', 14, 12, logoWidth, logoHeight);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Logo yüklenemedi'));
          };
        });
      } catch (error) {
        console.error('Logo PDF\'e eklenirken hata:', error);
        logoHeight = 0;
      }
      
      // Başlık - Logo altında yazı yok, direkt başlık
      const startY = logoHeight > 0 ? logoHeight + 15 : 20;
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Arac Bakim Hizmet Formu', 14, startY);
      
      // Tarih - sağa hizalı (mavi çubuktan önce)
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const tarihText = formatDateShort(hizmet.hizmetTarihi);
      const tarihWidth = doc.getTextWidth(tarihText);
      doc.text(tarihText, pageWidth - 30 - tarihWidth, startY);
      
      // Tablo verileri - Türkçe karakterleri ASCII'ye çevir
      const musteriAdi = getMusteriAdi(hizmet);
      const tableData = [
        ['Musteri Adi Soyadi', turkceKarakterCevir(musteriAdi)],
        ['Plaka', turkceKarakterCevir(hizmet.plaka || '')],
        ['Arac Modeli', turkceKarakterCevir(hizmet.aracModeli || '')],
        ['Hizmet Tarihi', formatDateShort(hizmet.hizmetTarihi)],
        ['Yapilan Islemler', turkceKarakterCevir(hizmet.yapilanIslemler || '')],
        ['Alinan Ucret', `${formatFiyat(hizmet.alınanUcret)} TL`],
      ];

      // Modern tablo tasarımı
      autoTable(doc, {
        startY: startY + 25,
        head: [['Bilgi', 'Deger']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [40, 40, 40],
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        styles: { 
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { 
            cellWidth: 60,
            fontStyle: 'bold',
            textColor: [66, 139, 202],
          },
          1: { 
            cellWidth: pageWidth - 30 - 60 - 25, // Sağdaki mavi çubuk için alan bırak
          },
        },
        margin: { left: 14, right: 25 },
      });
      
      // Alt kısım - Şirket bilgileri
      const finalY = doc.lastAutoTable.finalY + 15;
      if (finalY < pageHeight - 40) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('OTOIL Yag ve Bakim Merkezi', 14, pageHeight - 25);
        doc.setFontSize(8);
        doc.text('www.otoil.com | info@otoil.com', 14, pageHeight - 18);
      }

      // PDF'i indir
      const fileName = `${hizmet.plaka.replace(/\s/g, '-')}-hizmet-formu.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu: ' + error.message);
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

  const getBildirimDurumu = (sonrakiBakimTarihi) => {
    if (!sonrakiBakimTarihi) return { text: '', className: '', gecmis: false };

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const sonrakiBakim = sonrakiBakimTarihi.toDate();
    sonrakiBakim.setHours(0, 0, 0, 0);

    if (sonrakiBakim < bugun) {
      return { text: 'BAKIM TARİHİ GEÇMİŞ!', className: 'bg-red-100 border-red-400 text-red-800', gecmis: true };
    } else if (sonrakiBakim.getTime() === bugun.getTime()) {
      return { text: 'BUGÜN BAKIM GÜNÜ!', className: 'bg-orange-100 border-orange-400 text-orange-800', gecmis: false };
    } else {
      return { text: 'Yaklaşıyor', className: 'bg-yellow-100 border-yellow-400 text-yellow-800', gecmis: false };
    }
  };

  // Bakımı geçmiş kayıtları filtrele
  const gecmisKayitlar = tumKayitlar.filter((hizmet) => {
    if (!hizmet.sonrakiBakimTarihi) return false;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const sonrakiBakim = hizmet.sonrakiBakimTarihi.toDate();
    sonrakiBakim.setHours(0, 0, 0, 0);
    return sonrakiBakim < bugun;
  });

  // Gösterilecek kayıtları belirle
  const gosterilecekKayitlar = aktifSekme === 'gecmis' ? gecmisKayitlar : tumKayitlar;

  // Arama fonksiyonu
  const filtrelenmisKayitlar = gosterilecekKayitlar.filter((hizmet) => {
    if (!aramaMetni) return true;
    const arama = aramaMetni.toLowerCase();
    const plaka = (hizmet.plaka || '').toLowerCase();
    const musteriAdi = getMusteriAdi(hizmet).toLowerCase();
    
    return plaka.includes(arama) || musteriAdi.includes(arama);
  });

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Bakım Merkezi</h1>
          
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
        
        {/* Sekmeler */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setAktifSekme('tumu')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                aktifSekme === 'tumu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tüm Kayıtlar ({tumKayitlar.length})
            </button>
            <button
              onClick={() => setAktifSekme('gecmis')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                aktifSekme === 'gecmis'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bakımı Geçmiş ({gecmisKayitlar.length})
            </button>
          </nav>
        </div>

        {/* Arama sonuç sayısı */}
        {aramaMetni && (
          <div className="mb-4 text-sm text-gray-600">
            {filtrelenmisKayitlar.length} kayıt bulundu
          </div>
        )}

        {gosterilecekKayitlar.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">
              {aktifSekme === 'gecmis' 
                ? 'Bakımı geçmiş kayıt bulunmamaktadır.' 
                : 'Henüz kayıt bulunmamaktadır.'}
            </p>
          </div>
        ) : filtrelenmisKayitlar.length === 0 ? (
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
            {filtrelenmisKayitlar.map((hizmet) => {
              const durum = getBildirimDurumu(hizmet.sonrakiBakimTarihi);
              // Sadece "Bakımı Geçmiş" sekmesinde durum göster
              const durumGoster = aktifSekme === 'gecmis';
              
              return (
                <div
                  key={hizmet.id}
                  className={`bg-white rounded-2xl shadow-lg border-l-4 ${
                    durumGoster && durum.gecmis ? 'border-red-500' : 
                    durumGoster && durum.className.includes('orange') ? 'border-orange-500' : 
                    durumGoster && durum.className.includes('yellow') ? 'border-yellow-500' : 
                    'border-gray-300'
                  } p-6 hover:shadow-xl transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{hizmet.plaka}</h3>
                      <p className="text-sm text-gray-600">{getMusteriAdi(hizmet)}</p>
                    </div>
                    {durumGoster && durum.text ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        durum.gecmis ? 'bg-red-100 text-red-800' : 
                        durum.className.includes('orange') ? 'bg-orange-100 text-orange-800' : 
                        durum.className.includes('yellow') ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {durum.text}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {formatDate(hizmet.hizmetTarihi)}
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">Araç:</span> {hizmet.aracModeli}
                    </p>
                    {hizmet.sonrakiBakimTarihi && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Sonraki Bakım:</span> {formatDate(hizmet.sonrakiBakimTarihi)}
                      </p>
                    )}
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
              );
            })}
          </div>
        )}

        {/* Detay Modal */}
        {selectedHizmet && (
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHizmet(null)}
          >
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {(() => {
                  const hizmet = filtrelenmisKayitlar.find((h) => h.id === selectedHizmet) || gosterilecekKayitlar.find((h) => h.id === selectedHizmet);
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
                        {hizmet.sonrakiBakimTarihi && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <span className="text-sm text-gray-600 font-medium">Sonraki Bakım</span>
                            <p className="text-lg text-gray-900 mt-1">{formatDate(hizmet.sonrakiBakimTarihi)}</p>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Yapılan İşlemler</span>
                          <p className="text-gray-700 mt-1">{hizmet.yapilanIslemler}</p>
                        </div>
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
              }} />
            </div>
          </div>
        </div>
      )}
      <BottomNavigation />
    </div>
  );
}

export default BakimMerkezi;

