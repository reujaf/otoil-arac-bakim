import { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import AracKontrolEkrani from './AracKontrolEkrani';
import VoiceInputButton from './VoiceInputButton';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function HizmetKayitFormu() {
  const [activeTab, setActiveTab] = useState('genel'); // 'genel' | 'kontrol'
  const [formData, setFormData] = useState({
    adSoyad: '',
    telefon: '',
    plaka: '',
    aracModeli: '',
    hizmetTarihi: getTodayDateString(),
    yapilanIslemler: '',
    fullCheckupSonucu: '',
    ustaNotu: '',
    alınanUcret: '',
  });
  const [kontrolListesi, setKontrolListesi] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const formatFiyat = (value) => {
    let cleaned = value.replace(/[^\d,]/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 1) cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    if (!cleaned) return '';
    const numStr = parts[0].replace(/\./g, '');
    if (!numStr) return cleaned;
    const numValue = parseFloat(numStr);
    if (isNaN(numValue) || numValue < 0) return cleaned;
    const formattedTamSayi = numValue.toLocaleString('tr-TR');
    if (parts.length > 1) return formattedTamSayi + ',' + parts[1].padEnd(2, '0').substring(0, 2);
    return formattedTamSayi;
  };

  const formatTelefon = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
    if (cleaned.length <= 9) return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 9)} ${cleaned.substring(9)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'alınanUcret') { setFormData({ ...formData, [name]: formatFiyat(value) }); return; }
    if (name === 'telefon') { setFormData({ ...formData, [name]: formatTelefon(value) }); return; }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) { alert('Lütfen giriş yapın'); return; }

      // Zorunlu Alan Doğrulamaları (Kullanıcı ister Genel ister Kontrol sekmesinde olsun)
      if (!formData.adSoyad || !formData.adSoyad.trim()) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Ad Soyad" alanını doldurun.');
        return;
      }
      if (!formData.plaka || !formData.plaka.trim()) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Plaka" alanını doldurun.');
        return;
      }
      if (!formData.aracModeli || !formData.aracModeli.trim()) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Araç Modeli" alanını doldurun.');
        return;
      }
      if (!formData.hizmetTarihi) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Hizmet Tarihi" alanını seçin.');
        return;
      }
      if (!formData.alınanUcret || !formData.alınanUcret.toString().trim()) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Alınan Ücret" alanını doldurun.');
        return;
      }
      if (!formData.yapilanIslemler || !formData.yapilanIslemler.trim()) {
        setActiveTab('genel');
        alert('Lütfen Genel Hizmet Bilgileri alanındaki "Yapılan İşlemler" alanını doldurun.');
        return;
      }

      setLoading(true);
      setSuccessMessage('');

      // Tarih nesnesini güvenli şekilde oluştur (YYYY-MM-DD formatından saat dilimi sapması olmadan)
      let hizmetTarihiObj;
      if (formData.hizmetTarihi) {
        const parts = formData.hizmetTarihi.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          hizmetTarihiObj = new Date(year, month, day, 12, 0, 0);
        } else {
          hizmetTarihiObj = new Date(formData.hizmetTarihi);
        }
      }

      if (!hizmetTarihiObj || isNaN(hizmetTarihiObj.getTime())) {
        hizmetTarihiObj = new Date();
      }

      const sonrakiBakimTarihi = new Date(hizmetTarihiObj);
      sonrakiBakimTarihi.setMonth(sonrakiBakimTarihi.getMonth() + 6);
      if (isNaN(sonrakiBakimTarihi.getTime())) {
        sonrakiBakimTarihi = new Date();
        sonrakiBakimTarihi.setMonth(sonrakiBakimTarihi.getMonth() + 6);
      }

      const ucretDegeri = formData.alınanUcret.toString().replace(/\./g, '').replace(',', '.');
      const ucret = parseFloat(ucretDegeri) || 0;

      const hizmetData = {
        adSoyad: formData.adSoyad.trim(),
        telefon: formData.telefon.trim(),
        plaka: formData.plaka.toUpperCase(),
        aracModeli: formData.aracModeli,
        hizmetTarihi: Timestamp.fromDate(hizmetTarihiObj),
        yapilanIslemler: formData.yapilanIslemler,
        fullCheckupSonucu: formData.fullCheckupSonucu.trim(),
        ustaNotu: (formData.ustaNotu || '').trim(),
        kontrolListesi: kontrolListesi || {},
        alınanUcret: ucret,
        personel: 'Şahin Lale',
        kullaniciId: user.uid,
        olusturmaTarihi: Timestamp.now(),
        sonrakiBakimTarihi: Timestamp.fromDate(sonrakiBakimTarihi),
      };

      await addDoc(collection(db, 'hizmetler'), hizmetData);

      setFormData({
        adSoyad: '',
        telefon: '',
        plaka: '',
        aracModeli: '',
        hizmetTarihi: getTodayDateString(),
        yapilanIslemler: '',
        fullCheckupSonucu: '',
        ustaNotu: '',
        alınanUcret: ''
      });
      setKontrolListesi({});
      setActiveTab('genel');
      setSuccessMessage('Hizmet kaydı başarıyla oluşturuldu!');
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setLoading(false);
      alert('Kayıt yapılırken bir hata oluştu: ' + error.message);
    }
  };

  const inputCls = "glass-input w-full py-3 px-4 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none transition-all";
  const seciliKontrolSayisi = Object.values(kontrolListesi).filter(item => item && item.durum).length;

  return (
    <div>
      {/* Toast Bildirimi */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass-modal rounded-lg px-5 py-3 flex items-center gap-3 min-w-[280px] shadow-xl">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Tab Navigasyonu - İkonlar ve Başlıklar Dengelendi */}
        <div className="flex border border-slate-200/80 mb-6 bg-slate-100/80 p-1.5 rounded-lg gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('genel')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-md font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'genel'
                ? 'bg-white text-[#26a9e0] shadow-sm border border-slate-200/60 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">Genel Hizmet Bilgileri</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kontrol')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-md font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 relative ${
              activeTab === 'kontrol'
                ? 'bg-white text-[#26a9e0] shadow-sm border border-slate-200/60 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="truncate">Araç Kontrol Ekranı</span>
            {seciliKontrolSayisi > 0 && (
              <span className="absolute -top-2 -right-1 bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4] text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10 pointer-events-none">
                {seciliKontrolSayisi}
              </span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-lg p-5 sm:p-6 space-y-5">
          {activeTab === 'genel' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="md:col-span-2">
                  <label htmlFor="adSoyad" className="block text-slate-700 text-xs font-bold mb-1.5">Ad Soyad *</label>
                  <input type="text" id="adSoyad" name="adSoyad" value={formData.adSoyad} onChange={handleChange} required className={inputCls} placeholder="Müşteri adı soyadı" />
                </div>
                <div>
                  <label htmlFor="telefon" className="block text-slate-700 text-xs font-bold mb-1.5">Telefon</label>
                  <input type="text" id="telefon" name="telefon" value={formData.telefon} onChange={handleChange} inputMode="tel" className={inputCls} placeholder="05XX XXX XX XX" />
                </div>
                <div>
                  <label htmlFor="plaka" className="block text-slate-700 text-xs font-bold mb-1.5">Plaka *</label>
                  <input type="text" id="plaka" name="plaka" value={formData.plaka} onChange={handleChange} required className={`${inputCls} uppercase`} placeholder="34 ABC 123" />
                </div>
                <div>
                  <label htmlFor="aracModeli" className="block text-slate-700 text-xs font-bold mb-1.5">Araç Modeli *</label>
                  <input type="text" id="aracModeli" name="aracModeli" value={formData.aracModeli} onChange={handleChange} required className={inputCls} placeholder="Örn: Toyota Corolla 2020" />
                </div>
                <div>
                  <label htmlFor="hizmetTarihi" className="block text-slate-700 text-xs font-bold mb-1.5">Hizmet Tarihi *</label>
                  <input type="date" id="hizmetTarihi" name="hizmetTarihi" value={formData.hizmetTarihi} onChange={handleChange} required className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="alınanUcret" className="block text-slate-700 text-xs font-bold mb-1.5">Alınan Ücret (₺) *</label>
                  <input type="text" id="alınanUcret" name="alınanUcret" value={formData.alınanUcret} onChange={handleChange} inputMode="numeric" pattern="[0-9.,]*" required className={inputCls} placeholder="0,00" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="yapilanIslemler" className="block text-slate-700 text-xs font-bold">Yapılan İşlemler *</label>
                  <VoiceInputButton
                    value={formData.yapilanIslemler}
                    onChange={(val) => setFormData(prev => ({ ...prev, yapilanIslemler: val }))}
                  />
                </div>
                <textarea id="yapilanIslemler" name="yapilanIslemler" value={formData.yapilanIslemler} onChange={handleChange} required rows="3" className={`${inputCls} resize-none`} placeholder="Yapılan işlemleri detaylı olarak yazın..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="fullCheckupSonucu" className="block text-slate-700 text-xs font-bold">Full Check-up Sonucu / Genel Notlar</label>
                  <VoiceInputButton
                    value={formData.fullCheckupSonucu}
                    onChange={(val) => setFormData(prev => ({ ...prev, fullCheckupSonucu: val }))}
                  />
                </div>
                <textarea id="fullCheckupSonucu" name="fullCheckupSonucu" value={formData.fullCheckupSonucu} onChange={handleChange} rows="3" className={`${inputCls} resize-none`} placeholder="Full check-up sonuçları ve genel notlarınız..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="ustaNotu" className="block text-slate-700 text-xs font-bold">Usta Görüşü & Özel Notlar (PDF Rapor 2. Sayfada Görünür)</label>
                  <VoiceInputButton
                    value={formData.ustaNotu}
                    onChange={(val) => setFormData(prev => ({ ...prev, ustaNotu: val }))}
                  />
                </div>
                <textarea id="ustaNotu" name="ustaNotu" value={formData.ustaNotu} onChange={handleChange} rows="3" className={`${inputCls} resize-none`} placeholder="PDF raporundaki usta görüşü ve özel notlar alanında görünecek metni yazın..." />
              </div>
            </div>
          ) : (
            <div className="py-1">
              <AracKontrolEkrani
                kontrolListesi={kontrolListesi}
                onChange={setKontrolListesi}
                ustaNotu={formData.ustaNotu}
                onUstaNotuChange={(val) => setFormData({ ...formData, ustaNotu: val })}
              />
            </div>
          )}

          {/* Alt Butonlar */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-200/80 gap-3">
            {activeTab === 'genel' ? (
              <button
                type="button"
                onClick={() => setActiveTab('kontrol')}
                className="glass-btn-white text-slate-700 text-xs sm:text-sm font-bold py-2.5 px-4 sm:px-5 rounded-md flex items-center gap-2 hover:bg-slate-100 transition-all"
              >
                <span>Kontrol Ekranına Geç →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('genel')}
                className="glass-btn-white text-slate-700 text-xs sm:text-sm font-bold py-2.5 px-4 sm:px-5 rounded-md flex items-center gap-2 hover:bg-slate-100 transition-all"
              >
                <span>← Genel Bilgilere Dön</span>
              </button>
            )}

            <button type="submit" disabled={loading} className="glass-btn-blue text-white text-xs sm:text-sm font-bold py-2.5 px-6 sm:px-8 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HizmetKayitFormu;
