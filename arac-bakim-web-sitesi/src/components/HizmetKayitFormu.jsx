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
          {/* Başarı Modal */}
          {successMessage && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
                <div className="mb-4">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <svg
                      className="h-8 w-8 text-green-600"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Başarılı!</h3>
                <p className="text-gray-600">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Yeni Hizmet Kaydı</h2>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg px-8 pt-8 pb-8 border border-gray-100">
              {loading && (
                <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                  İşlem yapılıyor, lütfen bekleyin...
                </div>
              )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ad Soyad */}
            <div className="md:col-span-2">
              <label htmlFor="adSoyad" className="block text-gray-700 text-sm font-bold mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="adSoyad"
                name="adSoyad"
                value={formData.adSoyad}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Müşteri adı soyadı"
              />
            </div>

            {/* Plaka */}
            <div>
              <label htmlFor="plaka" className="block text-gray-700 text-sm font-bold mb-2">
                Plaka *
              </label>
              <input
                type="text"
                id="plaka"
                name="plaka"
                value={formData.plaka}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                placeholder="34 ABC 123"
              />
            </div>

            {/* Araç Modeli */}
            <div>
              <label htmlFor="aracModeli" className="block text-gray-700 text-sm font-bold mb-2">
                Araç Modeli *
              </label>
              <input
                type="text"
                id="aracModeli"
                name="aracModeli"
                value={formData.aracModeli}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Örn: Toyota Corolla 2020"
              />
            </div>

            {/* Hizmet Tarihi */}
            <div>
              <label htmlFor="hizmetTarihi" className="block text-gray-700 text-sm font-bold mb-2">
                Hizmet Tarihi *
              </label>
              <input
                type="date"
                id="hizmetTarihi"
                name="hizmetTarihi"
                value={formData.hizmetTarihi}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Alınan Ücret */}
            <div>
              <label htmlFor="alınanUcret" className="block text-gray-700 text-sm font-bold mb-2">
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
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Yapılan İşlemler */}
          <div className="mt-6">
            <label htmlFor="yapilanIslemler" className="block text-gray-700 text-sm font-bold mb-2">
              Yapılan İşlemler *
            </label>
            <textarea
              id="yapilanIslemler"
              name="yapilanIslemler"
              value={formData.yapilanIslemler}
              onChange={handleChange}
              required
              rows="4"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Yapılan işlemleri detaylı olarak yazın..."
            />
          </div>

          {/* Kaydet Butonu */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg transition-all"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HizmetKayitFormu;

