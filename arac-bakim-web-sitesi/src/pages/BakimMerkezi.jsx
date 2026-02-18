import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import BottomNavigation from '../components/BottomNavigation';
import logo from '../assets/otoil-logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

function BakimMerkezi() {
  const [bildirimler, setBildirimler] = useState([]);
  const [tumKayitlar, setTumKayitlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [selectedHizmet, setSelectedHizmet] = useState(null);
  const [editingHizmet, setEditingHizmet] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
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

  const handlePDFOlustur = async (hizmet) => {
    try {
      // Logo'yu base64'e çevir
      let logoBase64 = '';
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logo;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Logo yükleme zaman aşımı')), 5000);
          img.onload = () => {
            clearTimeout(timeout);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              logoBase64 = canvas.toDataURL('image/png');
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
        console.warn('Logo base64\'e çevrilemedi:', error);
      }
      
      // HTML içeriğini oluştur (Türkçe karakter desteği için)
      const musteriAdi = getMusteriAdi(hizmet);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 210mm;
              min-height: 297mm;
              font-family: 'Inter', 'Arial', 'Helvetica', sans-serif;
              font-size: 10pt;
              color: #282828;
              padding: 20mm 20mm 20mm 20mm;
              background: white;
              margin: 0;
            }
            .header {
              margin-bottom: 25px;
              position: relative;
            }
            .header img {
              display: block;
              margin-bottom: 15px;
            }
            .title {
              font-size: 16pt;
              font-weight: 700;
              color: #282828;
              margin-bottom: 5px;
            }
            .date {
              font-size: 10pt;
              color: #646464;
              position: absolute;
              top: 0;
              right: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            thead {
              background-color: #428bca;
              color: white;
            }
            th {
              padding: 5px;
              text-align: left;
              font-weight: 600;
              font-size: 11pt;
            }
            td {
              padding: 5px;
              border-bottom: 1px solid #f5f7fa;
              font-size: 10pt;
            }
            tbody tr:nth-child(even) {
              background-color: #f5f7fa;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #428bca;
              width: 60mm;
            }
            .footer {
              margin-top: 30px;
              font-size: 9pt;
              color: #646464;
            }
            .footer-small {
              font-size: 7pt;
              color: #787878;
              margin-top: 10px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="OTOIL Logo" style="height: 40px; margin-bottom: 10px;" />` : ''}
            <div class="title">Araç Bakım Hizmet Formu</div>
            <div class="date">${formatDateShort(hizmet.hizmetTarihi)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Bilgi</th>
                <th>Değer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label">Müşteri Adı Soyadı</td>
                <td>${musteriAdi}</td>
              </tr>
              <tr>
                <td class="label">Telefon</td>
                <td>${hizmet.telefon || ''}</td>
              </tr>
              <tr>
                <td class="label">Plaka</td>
                <td>${hizmet.plaka || ''}</td>
              </tr>
              <tr>
                <td class="label">Araç Modeli</td>
                <td>${hizmet.aracModeli || ''}</td>
              </tr>
              <tr>
                <td class="label">Hizmet Tarihi</td>
                <td>${formatDateShort(hizmet.hizmetTarihi)}</td>
              </tr>
              <tr>
                <td class="label">Yapılan İşlemler</td>
                <td>${(hizmet.yapilanIslemler || '').replace(/\n/g, '<br>')}</td>
              </tr>
              <tr>
                <td class="label">Personel</td>
                <td>${hizmet.personel || 'Şahin Lale'}</td>
              </tr>
              ${hizmet.fullCheckupSonucu ? `
              <tr>
                <td class="label">Full Check-up Sonucu</td>
                <td>${(hizmet.fullCheckupSonucu || '').replace(/\n/g, '<br>')}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
          <div class="footer">
            <div>OTOIL Yağ ve Bakım Merkezi</div>
            <div>İletişim: 0507 541 63 25</div>
            <div>www.otoil.com | info@otoil.com</div>
            <div class="footer-small">
              SORUMLULUK REDDİ: Bu belgede yer alan sonuçlar usta görüşü olup, anlık olarak yapılan kontrol sonuçlarıdır. OTOIL Yağ ve Bakım Merkezi bilgi verilen sorunlardan sorumlu değildir.
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Geçici bir div oluştur ve HTML içeriğini ekle
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 genişliği (mm)
      tempDiv.style.maxWidth = '210mm';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);
      
      // Font'un yüklenmesini bekle
      await new Promise((resolve) => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(resolve, 500); // Ekstra bekleme süresi
          });
        } else {
          setTimeout(resolve, 1000); // Fallback: 1 saniye bekle
        }
      });
      
      // html2canvas ile HTML'i canvas'a çevir
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight,
        allowTaint: false,
        foreignObjectRendering: false
      });
      
      // Canvas'ı kaldır
      document.body.removeChild(tempDiv);
      
      // Canvas boyutlarını al ve PDF'e ekle
      const pdfWidth = 210; // A4 genişliği (mm)
      const pdfHeight = 297; // A4 yüksekliği (mm)
      const marginLeft = 14; // Sol kenar boşluğu
      const marginTop = 14; // Üst kenar boşluğu
      const blueBarWidth = 15; // Mavi çubuk genişliği
      const gapBetweenContentAndBar = 10; // Tablo ile mavi çubuk arasındaki boşluk
      const marginRight = blueBarWidth + gapBetweenContentAndBar; // Sağdaki mavi çubuk + boşluk için alan
      const contentWidth = pdfWidth - marginLeft - marginRight; // İçerik genişliği
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // PDF oluştur
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // Sağ tarafta mavi çubuk
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(66, 139, 202);
      doc.rect(pageWidth - blueBarWidth, 0, blueBarWidth, pageHeight, 'F');
      
      // Canvas'ı PDF'e ekle (kenar boşluklarıyla)
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);

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

  // Fiyat formatlama fonksiyonu
  const formatFiyatInput = (value) => {
    let cleaned = value.replace(/[^\d,]/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 1) {
      cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }
    if (!cleaned) return '';
    const numStr = parts[0].replace(/\./g, '');
    if (!numStr) return cleaned;
    const numValue = parseFloat(numStr);
    if (isNaN(numValue) || numValue < 0) return cleaned;
    const formattedTamSayi = numValue.toLocaleString('tr-TR');
    if (parts.length > 1) {
      const ondalik = parts[1].padEnd(2, '0').substring(0, 2);
      return formattedTamSayi + ',' + ondalik;
    }
    return formattedTamSayi;
  };

  // Telefon formatlama fonksiyonu
  const formatTelefonInput = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) {
      cleaned = cleaned.substring(0, 11);
    }
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
    if (cleaned.length <= 9) return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 9)} ${cleaned.substring(9)}`;
  };

  // Düzenleme modunu aç
  const handleEdit = (hizmet) => {
    // Tarihleri formatla (YYYY-MM-DD)
    const hizmetTarihi = hizmet.hizmetTarihi ? hizmet.hizmetTarihi.toDate().toISOString().split('T')[0] : '';
    const sonrakiBakimTarihi = hizmet.sonrakiBakimTarihi ? hizmet.sonrakiBakimTarihi.toDate().toISOString().split('T')[0] : '';
    
    // Fiyatı formatla (Türk formatına çevir: 1500.00 -> 1.500,00)
    let fiyat = '';
    if (hizmet.alınanUcret !== undefined && hizmet.alınanUcret !== null) {
      fiyat = formatFiyat(hizmet.alınanUcret);
    }
    
    setEditFormData({
      adSoyad: hizmet.adSoyad || (hizmet.isim && hizmet.soyisim ? `${hizmet.isim} ${hizmet.soyisim}` : ''),
      telefon: hizmet.telefon || '',
      plaka: hizmet.plaka || '',
      aracModeli: hizmet.aracModeli || '',
      hizmetTarihi: hizmetTarihi,
      sonrakiBakimTarihi: sonrakiBakimTarihi,
      yapilanIslemler: hizmet.yapilanIslemler || '',
      fullCheckupSonucu: hizmet.fullCheckupSonucu || '',
      alınanUcret: fiyat,
      personel: hizmet.personel || 'Şahin Lale',
    });
    setEditingHizmet(hizmet.id);
    setSelectedHizmet(null); // Detay modalını kapat
  };

  // Düzenleme formu değişiklikleri
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'alınanUcret') {
      const formatted = formatFiyatInput(value);
      setEditFormData({ ...editFormData, [name]: formatted });
      return;
    }
    
    if (name === 'telefon') {
      const formatted = formatTelefonInput(value);
      setEditFormData({ ...editFormData, [name]: formatted });
      return;
    }
    
    setEditFormData({ ...editFormData, [name]: value });
  };

  // Kaydı güncelle
  const handleUpdate = async () => {
    if (!editingHizmet) return;

    try {
      setIsUpdating(true);

      // Tarihleri Timestamp'e çevir
      const hizmetTarihiObj = new Date(editFormData.hizmetTarihi);
      const sonrakiBakimTarihiObj = editFormData.sonrakiBakimTarihi 
        ? new Date(editFormData.sonrakiBakimTarihi)
        : null;

      // Fiyat değerini temizle ve parse et
      const ucretDegeri = editFormData.alınanUcret.toString().replace(/\./g, '').replace(',', '.');
      const ucret = parseFloat(ucretDegeri) || 0;

      // Güncelleme verisi
      const updateData = {
        adSoyad: editFormData.adSoyad.trim(),
        telefon: editFormData.telefon.trim(),
        plaka: editFormData.plaka.toUpperCase(),
        aracModeli: editFormData.aracModeli,
        hizmetTarihi: Timestamp.fromDate(hizmetTarihiObj),
        yapilanIslemler: editFormData.yapilanIslemler,
        fullCheckupSonucu: editFormData.fullCheckupSonucu.trim(),
        alınanUcret: ucret,
        personel: editFormData.personel || 'Şahin Lale',
      };

      // Sonraki bakım tarihi varsa ekle
      if (sonrakiBakimTarihiObj) {
        updateData.sonrakiBakimTarihi = Timestamp.fromDate(sonrakiBakimTarihiObj);
      }

      // Firestore'da güncelle
      const hizmetRef = doc(db, 'hizmetler', editingHizmet);
      await updateDoc(hizmetRef, updateData);

      // Düzenleme modunu kapat
      setEditingHizmet(null);
      setEditFormData({});
      setIsUpdating(false);
      
      alert('Kayıt başarıyla güncellendi!');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      setIsUpdating(false);
      alert('Kayıt güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Düzenleme modunu iptal et
  const handleCancelEdit = () => {
    setEditingHizmet(null);
    setEditFormData({});
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
      <div className="glass-bg flex items-center justify-center">
        <div className="glass-card rounded-2xl px-8 py-4">
          <p className="text-slate-500 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

      return (
        <div className="glass-bg pb-24">
      {/* Navigation */}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Bakım Merkezi</h1>
          
          {/* Arama Kutusu */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Plaka veya müşteri adı ile ara..."
              className="glass-input block w-full pl-10 pr-9 py-2.5 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
            />
            {aramaMetni && (
              <button onClick={() => setAramaMetni('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {aramaMetni && (
          <div className="mb-3 text-xs text-slate-500 font-medium">{filtrelenmisKayitlar.length} kayıt bulundu</div>
        )}

        {tumKayitlar.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <p className="text-slate-400">Henüz kayıt bulunmamaktadır.</p>
          </div>
        ) : filtrelenmisKayitlar.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <p className="text-slate-400">Arama kriterinize uygun kayıt bulunamadı.</p>
            <button onClick={() => setAramaMetni('')} className="mt-3 text-[#26a9e0] hover:text-[#1e8fc4] text-sm font-medium">
              Aramayı temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtrelenmisKayitlar.map((hizmet) => (
              <div
                key={hizmet.id}
                onClick={() => setSelectedHizmet(hizmet.id)}
                className="glass-card rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl overflow-hidden"
              >
                <div className="p-2.5 pb-2">
                  <div className="rounded-xl px-2.5 py-1.5 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #26a9e0, #0c4a6e)' }}>
                    <span className="relative text-sm font-black text-white tracking-wider uppercase">
                      {hizmet.plaka}
                    </span>
                  </div>
                </div>
                <div className="px-2.5 pb-3 space-y-1">
                  <div>
                    <p className="text-[10px] text-slate-400">Müşteri</p>
                    <p className="text-xs font-semibold text-slate-700 truncate">{getMusteriAdi(hizmet)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Tarih</p>
                    <p className="text-xs text-slate-600">{formatDateShort(hizmet.hizmetTarihi)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detay Modal */}
        {selectedHizmet && (
          <div 
            className="fixed inset-0 glass-modal-overlay overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHizmet(null)}
          >
            <div 
              className="relative glass-modal rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {(() => {
                  const hizmet = filtrelenmisKayitlar.find((h) => h.id === selectedHizmet) || tumKayitlar.find((h) => h.id === selectedHizmet);
                  if (!hizmet) return null;
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xl font-bold text-slate-800">Hizmet Detayları</h3>
                        <button
                          onClick={() => setSelectedHizmet(null)}
                          className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-xl glass-btn-white transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="glass-card rounded-2xl p-4">
                          <span className="text-xs text-slate-400 font-medium">Müşteri</span>
                          <p className="text-base text-slate-800 font-semibold mt-0.5">{getMusteriAdi(hizmet)}</p>
                        </div>
                        {hizmet.telefon && (
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Telefon</span>
                            <p className="text-base text-slate-800 mt-0.5">{hizmet.telefon}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Plaka</span>
                            <p className="text-base text-slate-800 font-semibold mt-0.5">{hizmet.plaka}</p>
                          </div>
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Araç Modeli</span>
                            <p className="text-base text-slate-800 mt-0.5">{hizmet.aracModeli}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {hizmet.personel && (
                            <div className="glass-card rounded-2xl p-4">
                              <span className="text-xs text-slate-400 font-medium">Personel</span>
                              <p className="text-base text-slate-800 mt-0.5">{hizmet.personel}</p>
                            </div>
                          )}
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Hizmet Tarihi</span>
                            <p className="text-base text-slate-800 mt-0.5">{formatDate(hizmet.hizmetTarihi)}</p>
                          </div>
                        </div>
                        {hizmet.sonrakiBakimTarihi && (
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Sonraki Bakım</span>
                            <p className="text-base text-slate-800 mt-0.5">{formatDate(hizmet.sonrakiBakimTarihi)}</p>
                          </div>
                        )}
                        <div className="glass-card rounded-2xl p-4">
                          <span className="text-xs text-slate-400 font-medium">Yapılan İşlemler</span>
                          <p className="text-sm text-slate-700 mt-1">{hizmet.yapilanIslemler}</p>
                        </div>
                        {hizmet.fullCheckupSonucu && (
                          <div className="glass-card rounded-2xl p-4">
                            <span className="text-xs text-slate-400 font-medium">Full Check-up Sonucu</span>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{hizmet.fullCheckupSonucu}</p>
                          </div>
                        )}
                        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(38,169,224,0.15), rgba(14,165,233,0.1))' }}>
                          <span className="text-xs text-[#1e8fc4] font-medium">Alınan Ücret</span>
                          <p className="text-xl font-bold text-slate-800 mt-0.5">{formatFiyat(hizmet.alınanUcret)} ₺</p>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end gap-2.5 flex-wrap">
                        <button
                          onClick={() => handleEdit(hizmet)}
                          className="glass-btn-white text-slate-600 px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 border border-slate-200/50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </button>
                        {isBakimiGecmis(hizmet.sonrakiBakimTarihi) && hizmet.telefon && (
                          <button
                            onClick={() => handleWhatsAppMesaj(hizmet)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            Bakım Hatırlat
                          </button>
                        )}
                        <button
                          onClick={() => handlePDFOlustur(hizmet)}
                          className="glass-btn-blue text-white px-5 py-2.5 rounded-2xl text-sm font-semibold"
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

        {/* Düzenleme Modal */}
        {editingHizmet && (
          <div 
            className="fixed inset-0 glass-modal-overlay overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={handleCancelEdit}
          >
            <div 
              className="relative glass-modal rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-slate-800">Kayıt Düzenle</h3>
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-xl glass-btn-white">×</button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="edit-adSoyad" className="block text-slate-600 text-xs font-semibold mb-1.5">Ad Soyad *</label>
                      <input type="text" id="edit-adSoyad" name="adSoyad" value={editFormData.adSoyad || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Müşteri adı soyadı" />
                    </div>
                    <div>
                      <label htmlFor="edit-telefon" className="block text-slate-600 text-xs font-semibold mb-1.5">Telefon</label>
                      <input type="text" id="edit-telefon" name="telefon" value={editFormData.telefon || ''} onChange={handleEditChange} inputMode="tel" className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="05XX XXX XX XX" />
                    </div>
                    <div>
                      <label htmlFor="edit-plaka" className="block text-slate-600 text-xs font-semibold mb-1.5">Plaka *</label>
                      <input type="text" id="edit-plaka" name="plaka" value={editFormData.plaka || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none uppercase" placeholder="34 ABC 123" />
                    </div>
                    <div>
                      <label htmlFor="edit-aracModeli" className="block text-slate-600 text-xs font-semibold mb-1.5">Araç Modeli *</label>
                      <input type="text" id="edit-aracModeli" name="aracModeli" value={editFormData.aracModeli || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Örn: Toyota Corolla 2020" />
                    </div>
                    <div>
                      <label htmlFor="edit-hizmetTarihi" className="block text-slate-600 text-xs font-semibold mb-1.5">Hizmet Tarihi *</label>
                      <input type="date" id="edit-hizmetTarihi" name="hizmetTarihi" value={editFormData.hizmetTarihi || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 focus:outline-none" />
                    </div>
                    <div>
                      <label htmlFor="edit-sonrakiBakimTarihi" className="block text-slate-600 text-xs font-semibold mb-1.5">Sonraki Bakım Tarihi</label>
                      <input type="date" id="edit-sonrakiBakimTarihi" name="sonrakiBakimTarihi" value={editFormData.sonrakiBakimTarihi || ''} onChange={handleEditChange} className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 focus:outline-none" />
                    </div>
                    <div>
                      <label htmlFor="edit-alınanUcret" className="block text-slate-600 text-xs font-semibold mb-1.5">Alınan Ücret (₺) *</label>
                      <input type="text" id="edit-alınanUcret" name="alınanUcret" value={editFormData.alınanUcret || ''} onChange={handleEditChange} inputMode="numeric" pattern="[0-9.,]*" required className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="0,00" />
                    </div>
                    <div>
                      <label htmlFor="edit-personel" className="block text-slate-600 text-xs font-semibold mb-1.5">Personel</label>
                      <input type="text" id="edit-personel" name="personel" value={editFormData.personel || ''} onChange={handleEditChange} className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Şahin Lale" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-yapilanIslemler" className="block text-slate-600 text-xs font-semibold mb-1.5">Yapılan İşlemler *</label>
                    <textarea id="edit-yapilanIslemler" name="yapilanIslemler" value={editFormData.yapilanIslemler || ''} onChange={handleEditChange} required rows="3" className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none" placeholder="Yapılan işlemleri detaylı olarak yazın..." />
                  </div>
                  <div>
                    <label htmlFor="edit-fullCheckupSonucu" className="block text-slate-600 text-xs font-semibold mb-1.5">Full Check-up Sonucu</label>
                    <textarea id="edit-fullCheckupSonucu" name="fullCheckupSonucu" value={editFormData.fullCheckupSonucu || ''} onChange={handleEditChange} rows="3" className="glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none" placeholder="Full check-up sonuçları..." />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-4">
                    <button type="button" onClick={handleCancelEdit} disabled={isUpdating} className="glass-btn-white text-slate-600 px-5 py-2.5 rounded-2xl text-sm font-semibold border border-slate-200/50 disabled:opacity-50">İptal</button>
                    <button type="submit" disabled={isUpdating} className="glass-btn-blue text-white py-2.5 px-6 rounded-2xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                      {isUpdating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Güncelleniyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Güncelle
                        </>
                      )}
                    </button>
                  </div>
                </form>
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

