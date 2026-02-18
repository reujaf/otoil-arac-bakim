import { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

function HizmetKayitFormu() {
  const [formData, setFormData] = useState({
    adSoyad: '',
    telefon: '',
    plaka: '',
    aracModeli: '',
    hizmetTarihi: '',
    yapilanIslemler: '',
    fullCheckupSonucu: '',
    alınanUcret: '',
  });
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
      setLoading(true);
      setSuccessMessage('');

      const hizmetTarihiObj = new Date(formData.hizmetTarihi);
      const sonrakiBakimTarihi = new Date(hizmetTarihiObj);
      sonrakiBakimTarihi.setMonth(sonrakiBakimTarihi.getMonth() + 6);
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
        alınanUcret: ucret,
        personel: 'Şahin Lale',
        kullaniciId: user.uid,
        olusturmaTarihi: Timestamp.now(),
        sonrakiBakimTarihi: Timestamp.fromDate(sonrakiBakimTarihi),
      };

      await addDoc(collection(db, 'hizmetler'), hizmetData);

      setFormData({ adSoyad: '', telefon: '', plaka: '', aracModeli: '', hizmetTarihi: '', yapilanIslemler: '', fullCheckupSonucu: '', alınanUcret: '' });
      setSuccessMessage('Hizmet kaydı başarıyla oluşturuldu!');
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setLoading(false);
      alert('Kayıt yapılırken bir hata oluştu: ' + error.message);
    }
  };

  const inputCls = "glass-input w-full py-2.5 px-4 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none";

  return (
    <div>
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass-modal rounded-2xl px-5 py-3 flex items-center gap-3 min-w-[280px]">
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
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-0.5">Yeni Hizmet Kaydı</h2>
          <p className="text-xs text-slate-400">Müşteri bilgilerini ve hizmet detaylarını girin</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="adSoyad" className="block text-slate-600 text-xs font-semibold mb-1.5">Ad Soyad *</label>
              <input type="text" id="adSoyad" name="adSoyad" value={formData.adSoyad} onChange={handleChange} required className={inputCls} placeholder="Müşteri adı soyadı" />
            </div>
            <div>
              <label htmlFor="telefon" className="block text-slate-600 text-xs font-semibold mb-1.5">Telefon</label>
              <input type="text" id="telefon" name="telefon" value={formData.telefon} onChange={handleChange} inputMode="tel" className={inputCls} placeholder="05XX XXX XX XX" />
            </div>
            <div>
              <label htmlFor="plaka" className="block text-slate-600 text-xs font-semibold mb-1.5">Plaka *</label>
              <input type="text" id="plaka" name="plaka" value={formData.plaka} onChange={handleChange} required className={`${inputCls} uppercase`} placeholder="34 ABC 123" />
            </div>
            <div>
              <label htmlFor="aracModeli" className="block text-slate-600 text-xs font-semibold mb-1.5">Araç Modeli *</label>
              <input type="text" id="aracModeli" name="aracModeli" value={formData.aracModeli} onChange={handleChange} required className={inputCls} placeholder="Örn: Toyota Corolla 2020" />
            </div>
            <div>
              <label htmlFor="hizmetTarihi" className="block text-slate-600 text-xs font-semibold mb-1.5">Hizmet Tarihi *</label>
              <input type="date" id="hizmetTarihi" name="hizmetTarihi" value={formData.hizmetTarihi} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label htmlFor="alınanUcret" className="block text-slate-600 text-xs font-semibold mb-1.5">Alınan Ücret (₺) *</label>
              <input type="text" id="alınanUcret" name="alınanUcret" value={formData.alınanUcret} onChange={handleChange} inputMode="numeric" pattern="[0-9.,]*" required className={inputCls} placeholder="0,00" />
            </div>
          </div>

          <div>
            <label htmlFor="yapilanIslemler" className="block text-slate-600 text-xs font-semibold mb-1.5">Yapılan İşlemler *</label>
            <textarea id="yapilanIslemler" name="yapilanIslemler" value={formData.yapilanIslemler} onChange={handleChange} required rows="3" className={`${inputCls} resize-none`} placeholder="Yapılan işlemleri detaylı olarak yazın..." />
          </div>

          <div>
            <label htmlFor="fullCheckupSonucu" className="block text-slate-600 text-xs font-semibold mb-1.5">Full Check-up Sonucu</label>
            <textarea id="fullCheckupSonucu" name="fullCheckupSonucu" value={formData.fullCheckupSonucu} onChange={handleChange} rows="3" className={`${inputCls} resize-none`} placeholder="Full check-up sonuçları..." />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading} className="glass-btn-blue text-white text-sm font-semibold py-2.5 px-6 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Kaydet
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
