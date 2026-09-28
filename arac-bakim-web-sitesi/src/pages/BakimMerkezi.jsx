import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import logo from '../assets/otoil-logo.png';
import { generateHizmetFormuPDF } from '../utils/pdfGenerator';
import VoiceInputButton from '../components/VoiceInputButton';
import { BakimMerkeziSkeleton } from '../components/SkeletonLoader';

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
  const [menuAcik, setMenuAcik] = useState(false);
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

  const safeDateToInputString = (timestamp) => {
    if (!timestamp) return '';
    try {
      const d = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      if (!d || isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
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
    const hizmetTarihi = safeDateToInputString(hizmet.hizmetTarihi);
    const sonrakiBakimTarihi = safeDateToInputString(hizmet.sonrakiBakimTarihi);
    
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
      ustaNotu: hizmet.ustaNotu || hizmet.ustaGorusu || '',
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
      let hizmetTarihiObj;
      if (editFormData.hizmetTarihi) {
        const parts = editFormData.hizmetTarihi.split('-');
        if (parts.length === 3) {
          hizmetTarihiObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else {
          hizmetTarihiObj = new Date(editFormData.hizmetTarihi);
        }
      }
      if (!hizmetTarihiObj || isNaN(hizmetTarihiObj.getTime())) {
        hizmetTarihiObj = new Date();
      }

      let sonrakiBakimTarihiObj = null;
      if (editFormData.sonrakiBakimTarihi) {
        const parts = editFormData.sonrakiBakimTarihi.split('-');
        if (parts.length === 3) {
          sonrakiBakimTarihiObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else {
          sonrakiBakimTarihiObj = new Date(editFormData.sonrakiBakimTarihi);
        }
        if (isNaN(sonrakiBakimTarihiObj.getTime())) {
          sonrakiBakimTarihiObj = null;
        }
      }

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
        ustaNotu: (editFormData.ustaNotu || '').trim(),
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

  // Kayıt sil
  const handleDelete = async (hizmet) => {
    const eminMi = window.confirm(
      'Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
    );
    if (!eminMi) return;

    try {
      const hizmetRef = doc(db, 'hizmetler', hizmet.id);
      await deleteDoc(hizmetRef);
      setSelectedHizmet(null);
      alert('Kayıt silindi.');
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Kayıt silinirken bir hata oluştu: ' + error.message);
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
    return <BakimMerkeziSkeleton />;
  }

      return (
        <div className="min-h-screen bg-[#f4f7fb] pb-28">
      {/* HERO HEADER */}
      <header className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-[#0c4a6e] via-[#1273a8] to-[#26a9e0] px-5 pt-6 pb-10">
        {/* Üstten aşağı yumuşak beyaz geçiş (fade) */}
        <div className="header-fade-overlay" />
        {/* dekoratif şekiller */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-cyan-300/10" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <img src={logo} alt="OTOIL" className="h-9 w-auto cursor-pointer" onClick={() => navigate('/')} />
            <div className="relative z-10 flex items-center gap-2">
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  menuAcik ? 'max-w-40 opacity-100 translate-x-0' : 'max-w-0 opacity-0 translate-x-4'
                }`}
              >
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-white text-[#0c4a6e] px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm hover:bg-sky-50 transition-colors active:scale-95 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Hesap Değiştir
                </button>
              </div>
              <button
                onClick={() => setMenuAcik((v) => !v)}
                title="Hesap"
                className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-white/70 hover:bg-white text-[#0c4a6e] transition-all active:scale-95 ${menuAcik ? 'ring-2 ring-white' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-white/70 text-sm font-medium">Tüm Kayıtlar</p>
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">Bakım Merkezi</h1>

          {/* Arama Kutusu */}
          <div className="relative w-full mt-5">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Plaka veya müşteri adı ile ara..."
              className="block w-full pl-11 pr-10 py-3 rounded-lg bg-white/95 backdrop-blur-md text-sm text-slate-700 placeholder-slate-400 ring-1 ring-white/40 focus:outline-none focus:ring-2 focus:ring-white/70 transition-all"
            />
            {aramaMetni && (
              <button onClick={() => setAramaMetni('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-4 relative z-20">
        {aramaMetni && (
          <div className="mb-3 text-xs text-slate-500 font-medium">{filtrelenmisKayitlar.length} kayıt bulundu</div>
        )}

        {tumKayitlar.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center ring-1 ring-slate-200">
            <p className="text-slate-400">Henüz kayıt bulunmamaktadır.</p>
          </div>
        ) : filtrelenmisKayitlar.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center ring-1 ring-slate-200">
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
                className="bg-white rounded-lg cursor-pointer ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:ring-slate-300 overflow-hidden"
              >
                <div className="p-2.5 pb-2">
                  <div className="rounded-md px-2.5 py-1.5 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #26a9e0, #0c4a6e)' }}>
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
              className="relative glass-modal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
                          className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-md glass-btn-white transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="glass-card rounded-md p-4">
                          <span className="text-xs text-slate-400 font-medium">Müşteri</span>
                          <p className="text-base text-slate-800 font-semibold mt-0.5">{getMusteriAdi(hizmet)}</p>
                        </div>
                        {hizmet.telefon && (
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Telefon</span>
                            <p className="text-base text-slate-800 mt-0.5">{hizmet.telefon}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Plaka</span>
                            <p className="text-base text-slate-800 font-semibold mt-0.5">{hizmet.plaka}</p>
                          </div>
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Araç Modeli</span>
                            <p className="text-base text-slate-800 mt-0.5">{hizmet.aracModeli}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {hizmet.personel && (
                            <div className="glass-card rounded-md p-4">
                              <span className="text-xs text-slate-400 font-medium">Personel</span>
                              <p className="text-base text-slate-800 mt-0.5">{hizmet.personel}</p>
                            </div>
                          )}
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Hizmet Tarihi</span>
                            <p className="text-base text-slate-800 mt-0.5">{formatDate(hizmet.hizmetTarihi)}</p>
                          </div>
                        </div>
                        {hizmet.sonrakiBakimTarihi && (
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Sonraki Bakım</span>
                            <p className="text-base text-slate-800 mt-0.5">{formatDate(hizmet.sonrakiBakimTarihi)}</p>
                          </div>
                        )}
                        <div className="glass-card rounded-md p-4">
                          <span className="text-xs text-slate-400 font-medium">Yapılan İşlemler</span>
                          <p className="text-sm text-slate-700 mt-1">{hizmet.yapilanIslemler}</p>
                        </div>
                        {hizmet.fullCheckupSonucu && (
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Full Check-up Sonucu</span>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{hizmet.fullCheckupSonucu}</p>
                          </div>
                        )}
                        {(hizmet.ustaNotu || hizmet.ustaGorusu) && (
                          <div className="glass-card rounded-md p-4">
                            <span className="text-xs text-slate-400 font-medium">Usta Görüşü & Özel Notlar</span>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{hizmet.ustaNotu || hizmet.ustaGorusu}</p>
                          </div>
                        )}
                        <div className="rounded-md p-4" style={{ background: 'linear-gradient(135deg, rgba(38,169,224,0.15), rgba(14,165,233,0.1))' }}>
                          <span className="text-xs text-[#1e8fc4] font-medium">Alınan Ücret</span>
                          <p className="text-xl font-bold text-slate-800 mt-0.5">{formatFiyat(hizmet.alınanUcret)} ₺</p>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end gap-2.5 flex-wrap">
                        <button
                          onClick={() => handleEdit(hizmet)}
                          className="glass-btn-white text-slate-600 px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 border border-slate-200/50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </button>
                        {isBakimiGecmis(hizmet.sonrakiBakimTarihi) && hizmet.telefon && (
                          <button
                            onClick={() => handleWhatsAppMesaj(hizmet)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            Bakım Hatırlat
                          </button>
                        )}
                        <button
                          onClick={() => handlePDFOlustur(hizmet)}
                          className="glass-btn-blue text-white px-5 py-2.5 rounded-md text-sm font-semibold"
                        >
                          PDF Paylaş
                        </button>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => handleDelete(hizmet)}
                          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Kaydı Sil
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
              className="relative glass-modal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-slate-800">Kayıt Düzenle</h3>
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-md glass-btn-white">×</button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-3">
                  <div>
                    <label htmlFor="edit-adSoyad" className="block text-slate-600 text-xs font-semibold mb-1.5">Ad Soyad *</label>
                    <input type="text" id="edit-adSoyad" name="adSoyad" value={editFormData.adSoyad || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Müşteri adı soyadı" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-telefon" className="block text-slate-600 text-xs font-semibold mb-1.5">Telefon</label>
                      <input type="text" id="edit-telefon" name="telefon" value={editFormData.telefon || ''} onChange={handleEditChange} inputMode="tel" className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="05XX XXX XX XX" />
                    </div>
                    <div>
                      <label htmlFor="edit-plaka" className="block text-slate-600 text-xs font-semibold mb-1.5">Plaka *</label>
                      <input type="text" id="edit-plaka" name="plaka" value={editFormData.plaka || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none uppercase" placeholder="34 ABC 123" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-aracModeli" className="block text-slate-600 text-xs font-semibold mb-1.5">Araç Modeli *</label>
                      <input type="text" id="edit-aracModeli" name="aracModeli" value={editFormData.aracModeli || ''} onChange={handleEditChange} required className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Örn: Toyota Corolla 2020" />
                    </div>
                    <div>
                      <label htmlFor="edit-personel" className="block text-slate-600 text-xs font-semibold mb-1.5">Personel</label>
                      <input type="text" id="edit-personel" name="personel" value={editFormData.personel || ''} onChange={handleEditChange} className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Şahin Lale" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label htmlFor="edit-hizmetTarihi" className="block text-slate-600 text-xs font-semibold mb-1.5">Hizmet Tarihi *</label>
                      <input type="date" id="edit-hizmetTarihi" name="hizmetTarihi" value={editFormData.hizmetTarihi || ''} onChange={handleEditChange} required className="glass-input w-full min-w-0 py-2.5 px-3 rounded-md text-sm text-slate-700 focus:outline-none" />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="edit-sonrakiBakimTarihi" className="block text-slate-600 text-xs font-semibold mb-1.5">Sonraki Bakım Tarihi</label>
                      <input type="date" id="edit-sonrakiBakimTarihi" name="sonrakiBakimTarihi" value={editFormData.sonrakiBakimTarihi || ''} onChange={handleEditChange} className="glass-input w-full min-w-0 py-2.5 px-3 rounded-md text-sm text-slate-700 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-alınanUcret" className="block text-slate-600 text-xs font-semibold mb-1.5">Alınan Ücret (₺) *</label>
                    <input type="text" id="edit-alınanUcret" name="alınanUcret" value={editFormData.alınanUcret || ''} onChange={handleEditChange} inputMode="numeric" pattern="[0-9.,]*" required className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="0,00" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="edit-yapilanIslemler" className="block text-slate-600 text-xs font-semibold">Yapılan İşlemler *</label>
                      <VoiceInputButton
                        value={editFormData.yapilanIslemler || ''}
                        onChange={(val) => setEditFormData(prev => ({ ...prev, yapilanIslemler: val }))}
                      />
                    </div>
                    <textarea id="edit-yapilanIslemler" name="yapilanIslemler" value={editFormData.yapilanIslemler || ''} onChange={handleEditChange} required rows="3" className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none" placeholder="Yapılan işlemleri detaylı olarak yazın..." />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="edit-fullCheckupSonucu" className="block text-slate-600 text-xs font-semibold">Full Check-up Sonucu</label>
                      <VoiceInputButton
                        value={editFormData.fullCheckupSonucu || ''}
                        onChange={(val) => setEditFormData(prev => ({ ...prev, fullCheckupSonucu: val }))}
                      />
                    </div>
                    <textarea id="edit-fullCheckupSonucu" name="fullCheckupSonucu" value={editFormData.fullCheckupSonucu || ''} onChange={handleEditChange} rows="3" className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none" placeholder="Full check-up sonuçları..." />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="edit-ustaNotu" className="block text-slate-600 text-xs font-semibold">Usta Görüşü & Özel Notlar (PDF 2. Sayfada Görünür)</label>
                      <VoiceInputButton
                        value={editFormData.ustaNotu || ''}
                        onChange={(val) => setEditFormData(prev => ({ ...prev, ustaNotu: val }))}
                      />
                    </div>
                    <textarea id="edit-ustaNotu" name="ustaNotu" value={editFormData.ustaNotu || ''} onChange={handleEditChange} rows="3" className="glass-input w-full py-2.5 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none" placeholder="Usta görüşü ve özel notlar..." />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-4">
                    <button type="button" onClick={handleCancelEdit} disabled={isUpdating} className="glass-btn-white text-slate-600 px-5 py-2.5 rounded-md text-sm font-semibold border border-slate-200/50 disabled:opacity-50">İptal</button>
                    <button type="submit" disabled={isUpdating} className="glass-btn-blue text-white py-2.5 px-6 rounded-md text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
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
    </div>
  );
}

export default BakimMerkezi;

