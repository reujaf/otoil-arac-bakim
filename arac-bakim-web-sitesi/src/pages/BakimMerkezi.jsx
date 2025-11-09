import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function BakimMerkezi() {
  const [bildirimler, setBildirimler] = useState([]);
  const [tumKayitlar, setTumKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
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
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Tüm kullanıcıların kayıtlarını çek (ortak veri)
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

        // Oluşturma tarihine göre sırala (en yeni en üstte)
        hizmetListesi.sort((a, b) => {
          const tarihA = a.olusturmaTarihi ? a.olusturmaTarihi.toMillis() : 0;
          const tarihB = b.olusturmaTarihi ? b.olusturmaTarihi.toMillis() : 0;
          return tarihB - tarihA; // Descending order
        });

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

      },
      (error) => {
        console.error('Veri çekme hatası:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
      doc.text(turkceKarakterCevir('Araç Bakım Hizmet Formu'), 14, startY);
      
      // Tarih - sağa hizalı (mavi çubuktan önce)
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const tarihText = turkceKarakterCevir(formatDateShort(hizmet.hizmetTarihi));
      const tarihWidth = doc.getTextWidth(tarihText);
      doc.text(tarihText, pageWidth - 30 - tarihWidth, startY);
      
      // Tablo verileri - Türkçe karakterleri ASCII'ye çevir
      const musteriAdi = getMusteriAdi(hizmet);
      const tableData = [
        [turkceKarakterCevir('Müşteri Adı Soyadı'), turkceKarakterCevir(musteriAdi)],
        [turkceKarakterCevir('Telefon'), hizmet.telefon || ''],
        [turkceKarakterCevir('Plaka'), turkceKarakterCevir(hizmet.plaka || '')],
        [turkceKarakterCevir('Araç Modeli'), turkceKarakterCevir(hizmet.aracModeli || '')],
        [turkceKarakterCevir('Hizmet Tarihi'), turkceKarakterCevir(formatDateShort(hizmet.hizmetTarihi))],
        [turkceKarakterCevir('Yapılan İşlemler'), turkceKarakterCevir(hizmet.yapilanIslemler || '')],
        [turkceKarakterCevir('Alınan Ücret'), `${formatFiyat(hizmet.alınanUcret)} TL`],
        [turkceKarakterCevir('Personel'), turkceKarakterCevir(hizmet.personel || 'Şahin Lale')],
      ];

      // Full Check-up Sonucu varsa ekle
      if (hizmet.fullCheckupSonucu) {
        tableData.push([turkceKarakterCevir('Full Check-up Sonucu'), turkceKarakterCevir(hizmet.fullCheckupSonucu)]);
      }

      // Modern tablo tasarımı
      autoTable(doc, {
        startY: startY + 25,
        head: [[turkceKarakterCevir('Bilgi'), turkceKarakterCevir('Değer')]],
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
      
      // Alt kısım - İletişim bilgileri
      const finalY = doc.lastAutoTable.finalY + 15;
      const iletisimY = finalY + 10;
      
      if (iletisimY < pageHeight - 60) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(turkceKarakterCevir('OTOIL Yağ ve Bakım Merkezi'), 14, iletisimY);
        doc.setFontSize(8);
        doc.text(turkceKarakterCevir('İletişim: 0507 541 63 25'), 14, iletisimY + 6);
        doc.text('www.otoil.com | info@otoil.com', 14, iletisimY + 12);
        
        // Sorumluluk reddi metni
        const sorumlulukY = iletisimY + 20;
        if (sorumlulukY < pageHeight - 30) {
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          const sorumlulukMetni = turkceKarakterCevir('SORUMLULUK REDDI: Bu belgede yer alan sonuçlar usta görüşü olup, anlık olarak yapılan kontrol sonuçlarıdır. OTOIL Yağ ve Bakım Merkezi bilgi verilen sorunlardan sorumlu değildir.');
          const sorumlulukLines = doc.splitTextToSize(sorumlulukMetni, pageWidth - 30 - 25);
          doc.text(sorumlulukLines, 14, sorumlulukY, {
            maxWidth: pageWidth - 30 - 25,
            align: 'left'
          });
        }
      }

      // PDF'i blob olarak oluştur
      const pdfBlob = doc.output('blob');
      const fileName = `${hizmet.plaka.replace(/\s/g, '-')}-hizmet-formu.pdf`;
      
      // Mobil cihaz kontrolü
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile && navigator.share) {
        // Mobilde Web Share API kullan
        try {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          // Web Share API ile paylaş (eğer dosya paylaşımı destekleniyorsa)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: fileName,
              text: `${hizmet.plaka} - Hizmet Formu`
            });
            return;
          }
        } catch (shareError) {
          // Paylaşım başarısız olursa blob URL ile aç
          console.log('Share API hatası, blob URL kullanılıyor:', shareError);
        }
      }
      
      // Mobilde blob URL ile yeni sekmede aç (paylaşım menüsü açılır)
      // Desktop'ta normal indirme
      if (isMobile) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Blob URL'i temizle
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else {
        // Desktop'ta normal indirme
        doc.save(fileName);
      }
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

  // Bakımı geçmiş kontrolü (sadece WhatsApp butonu için)
  const isBakimiGecmis = (sonrakiBakimTarihi) => {
    if (!sonrakiBakimTarihi) return false;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const sonrakiBakim = sonrakiBakimTarihi.toDate();
    sonrakiBakim.setHours(0, 0, 0, 0);
    return sonrakiBakim < bugun;
  };

  // Arama fonksiyonu
  const filtrelenmisKayitlar = tumKayitlar.filter((hizmet) => {
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

  // WhatsApp mesajı gönder
  const handleWhatsAppMesaj = (hizmet) => {
    if (!hizmet.telefon) {
      alert('Bu kayıt için telefon numarası bulunmamaktadır.');
      return;
    }

    // Telefon numarasını temizle (sadece rakamlar)
    const temizTelefon = hizmet.telefon.replace(/\D/g, '');
    
    // Türkiye telefon numarası formatına göre düzenle
    let whatsappTelefon = temizTelefon;
    if (whatsappTelefon.startsWith('0')) {
      whatsappTelefon = '90' + whatsappTelefon.substring(1);
    } else if (!whatsappTelefon.startsWith('90')) {
      whatsappTelefon = '90' + whatsappTelefon;
    }

    // Mesaj metni
    const mesaj = encodeURIComponent('En son 6 ay önce bakım yaptırdınız tekrar bakım yaptırmak isterseniz Otoil Araç Bakım\'a bekleriz.<br>Bu bir otomatik mesajdır.');
    
    // WhatsApp linki
    const whatsappUrl = `https://wa.me/${whatsappTelefon}?text=${mesaj}`;
    
    // Yeni sekmede aç
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    );
  }

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

        {/* Arama sonuç sayısı */}
        {aramaMetni && (
          <div className="mb-4 text-sm text-gray-600">
            {filtrelenmisKayitlar.length} kayıt bulundu
          </div>
        )}

        {tumKayitlar.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">Henüz kayıt bulunmamaktadır.</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtrelenmisKayitlar.map((hizmet) => {
              return (
                <div
                  key={hizmet.id}
                  onClick={() => setSelectedHizmet(hizmet.id)}
                  className="bg-white rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105"
                >
                  {/* Plaka Badge */}
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <div className="bg-[#26a9e0] border-2 border-[#1e8fc4] rounded px-2 py-1.5 text-center shadow-sm relative overflow-hidden">
                      {/* Plaka arka plan efekti */}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#26a9e0] via-[#1e8fc4] to-[#26a9e0] opacity-80"></div>
                      <span className="relative text-sm font-black text-white tracking-wider uppercase">
                        {hizmet.plaka}
                      </span>
                    </div>
                  </div>
                  
                  {/* Müşteri Bilgileri */}
                  <div className="p-2.5 space-y-1.5">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Müşteri</p>
                      <p className="text-xs font-semibold text-gray-900 truncate">{getMusteriAdi(hizmet)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Tarih</p>
                      <p className="text-xs text-gray-700">{formatDateShort(hizmet.hizmetTarihi)}</p>
                    </div>
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
                  const hizmet = filtrelenmisKayitlar.find((h) => h.id === selectedHizmet) || tumKayitlar.find((h) => h.id === selectedHizmet);
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
                        {hizmet.telefon && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <span className="text-sm text-gray-600 font-medium">Telefon</span>
                            <p className="text-lg text-gray-900 mt-1">{hizmet.telefon}</p>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm text-gray-600 font-medium">Plaka</span>
                          <p className="text-lg text-gray-900 mt-1">{hizmet.plaka}</p>
                        </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <span className="text-sm text-gray-600 font-medium">Araç Modeli</span>
                              <p className="text-lg text-gray-900 mt-1">{hizmet.aracModeli}</p>
                            </div>
                            {hizmet.personel && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <span className="text-sm text-gray-600 font-medium">Personel</span>
                                <p className="text-lg text-gray-900 mt-1">{hizmet.personel}</p>
                              </div>
                            )}
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
                        {hizmet.fullCheckupSonucu && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <span className="text-sm text-gray-600 font-medium">Full Check-up Sonucu</span>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{hizmet.fullCheckupSonucu}</p>
                          </div>
                        )}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <span className="text-sm text-blue-600 font-medium">Alınan Ücret</span>
                          <p className="text-xl font-bold text-blue-900 mt-1">{formatFiyat(hizmet.alınanUcret)} ₺</p>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        {isBakimiGecmis(hizmet.sonrakiBakimTarihi) && hizmet.telefon && (
                          <button
                            onClick={() => handleWhatsAppMesaj(hizmet)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            <span>Bakım Hatırlat</span>
                          </button>
                        )}
                        <button
                          onClick={() => handlePDFOlustur(hizmet)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                          PDF Paylaş
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

      <BottomNavigation />
    </div>
  );
}

export default BakimMerkezi;

