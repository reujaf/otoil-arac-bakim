import { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

function HizmetKayitFormu() {
  const [formData, setFormData] = useState({
    adSoyad: '',
    plaka: '',
    aracModeli: '',
    hizmetTarihi: '',
    yapilanIslemler: '',
    alınanUcret: '',
    personel: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const formatFiyat = (value) => {
    // Sadece rakam ve virgül kabul et
    let cleaned = value.replace(/[^\d,]/g, '');
    
    // Virgülden sonra maksimum 2 rakam
    const parts = cleaned.split(',');
    if (parts.length > 1) {
      cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }
    
    if (!cleaned) return '';
    
    // Virgülü geçici olarak kaldır ve sayıya çevir
    const numStr = parts[0].replace(/\./g, ''); // Noktaları kaldır
    if (!numStr) return cleaned;
    
    const numValue = parseFloat(numStr);
    
    if (isNaN(numValue) || numValue < 0) return cleaned;
    
    // Tam sayı kısmını binlik ayırıcı ile formatla
    const formattedTamSayi = numValue.toLocaleString('tr-TR');
    
    // Eğer virgül varsa, ondalık kısmı ekle
    if (parts.length > 1) {
      const ondalik = parts[1].padEnd(2, '0').substring(0, 2);
      return formattedTamSayi + ',' + ondalik;
    }
    
    return formattedTamSayi;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Fiyat alanı için özel formatlama
    if (name === 'alınanUcret') {
      const formatted = formatFiyat(value);
      setFormData({ ...formData, [name]: formatted });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Lütfen giriş yapın');
        return;
      }

      setLoading(true);
      setSuccessMessage('');

      // Hizmet tarihine 6 ay ekle (Faz 6 için)
      const hizmetTarihiObj = new Date(formData.hizmetTarihi);
      const sonrakiBakimTarihi = new Date(hizmetTarihiObj);
      sonrakiBakimTarihi.setMonth(sonrakiBakimTarihi.getMonth() + 6);

      // Fiyat değerini temizle ve parse et (Türk formatı: 1.500,00 -> 1500.00)
      const ucretDegeri = formData.alınanUcret.toString().replace(/\./g, '').replace(',', '.');
      const ucret = parseFloat(ucretDegeri) || 0;

      // Firestore'a kaydet
      const hizmetData = {
        adSoyad: formData.adSoyad.trim(),
        plaka: formData.plaka.toUpperCase(),
        aracModeli: formData.aracModeli,
        hizmetTarihi: Timestamp.fromDate(hizmetTarihiObj),
        yapilanIslemler: formData.yapilanIslemler,
        alınanUcret: ucret,
        personel: formData.personel.trim(),
        kullaniciId: user.uid,
        olusturmaTarihi: Timestamp.now(),
        sonrakiBakimTarihi: Timestamp.fromDate(sonrakiBakimTarihi),
      };

          await addDoc(collection(db, 'hizmetler'), hizmetData);

          // Formu temizle
          setFormData({
            adSoyad: '',
            plaka: '',
            aracModeli: '',
            hizmetTarihi: '',
            yapilanIslemler: '',
            alınanUcret: '',
            personel: '',
          });
          setSuccessMessage('Hizmet kaydı başarıyla oluşturuldu!');
          setLoading(false);

          // Başarı mesajını 2 saniye sonra kaldır
          setTimeout(() => {
            setSuccessMessage('');
          }, 2000);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setLoading(false);
      alert('Kayıt yapılırken bir hata oluştu: ' + error.message);
    }
  };

      return (
        <div>
          {/* Başarı Toast Bildirimi */}
          {successMessage && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
              <div className="bg-white rounded-lg shadow-2xl border border-green-200 px-6 py-4 flex items-center space-x-3 min-w-[300px] max-w-md">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Yeni Hizmet Kaydı</h2>
              <p className="text-sm text-gray-600">Müşteri bilgilerini ve hizmet detaylarını girin</p>
            </div>

            <form onSubmit={handleSubmit} className="px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ad Soyad */}
            <div className="md:col-span-2">
              <label htmlFor="adSoyad" className="block text-gray-700 text-sm font-semibold mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="adSoyad"
                name="adSoyad"
                value={formData.adSoyad}
                onChange={handleChange}
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white"
                placeholder="Müşteri adı soyadı"
              />
            </div>

            {/* Plaka */}
            <div>
              <label htmlFor="plaka" className="block text-gray-700 text-sm font-semibold mb-2">
                Plaka *
              </label>
              <input
                type="text"
                id="plaka"
                name="plaka"
                value={formData.plaka}
                onChange={handleChange}
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white uppercase"
                placeholder="34 ABC 123"
              />
            </div>

            {/* Araç Modeli */}
            <div>
              <label htmlFor="aracModeli" className="block text-gray-700 text-sm font-semibold mb-2">
                Araç Modeli *
              </label>
              <input
                type="text"
                id="aracModeli"
                name="aracModeli"
                value={formData.aracModeli}
                onChange={handleChange}
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white"
                placeholder="Örn: Toyota Corolla 2020"
              />
            </div>

            {/* Hizmet Tarihi */}
            <div>
              <label htmlFor="hizmetTarihi" className="block text-gray-700 text-sm font-semibold mb-2">
                Hizmet Tarihi *
              </label>
              <input
                type="date"
                id="hizmetTarihi"
                name="hizmetTarihi"
                value={formData.hizmetTarihi}
                onChange={handleChange}
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Alınan Ücret */}
            <div>
              <label htmlFor="alınanUcret" className="block text-gray-700 text-sm font-semibold mb-2">
                Alınan Ücret (₺) *
              </label>
              <input
                type="text"
                id="alınanUcret"
                name="alınanUcret"
                value={formData.alınanUcret}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9.,]*"
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white"
                placeholder="0,00"
              />
            </div>

            {/* Personel */}
            <div>
              <label htmlFor="personel" className="block text-gray-700 text-sm font-semibold mb-2">
                İşlemi Gerçekleştiren Personel *
              </label>
              <select
                id="personel"
                name="personel"
                value={formData.personel}
                onChange={handleChange}
                required
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white"
              >
                <option value="">Personel Seçiniz</option>
                <option value="Şahin">Şahin</option>
                <option value="Onur">Onur</option>
              </select>
            </div>
          </div>

          {/* Yapılan İşlemler */}
          <div className="mt-6">
            <label htmlFor="yapilanIslemler" className="block text-gray-700 text-sm font-semibold mb-2">
              Yapılan İşlemler *
            </label>
            <textarea
              id="yapilanIslemler"
              name="yapilanIslemler"
              value={formData.yapilanIslemler}
              onChange={handleChange}
              required
              rows="4"
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#26a9e0] focus:ring-2 focus:ring-[#26a9e0]/20 transition-all bg-gray-50 focus:bg-white resize-none"
              placeholder="Yapılan işlemleri detaylı olarak yazın..."
            />
          </div>

          {/* Kaydet Butonu */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#26a9e0] to-[#1e8fc4] hover:from-[#1e8fc4] hover:to-[#26a9e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#26a9e0] focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:transform-none flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
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

