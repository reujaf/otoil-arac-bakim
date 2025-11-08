import { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

function HizmetKayitFormu() {
  const [formData, setFormData] = useState({
    isim: '',
    soyisim: '',
    plaka: '',
    aracModeli: '',
    hizmetTarihi: '',
    yapilanIslemler: '',
    alınanUcret: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
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

      // Firestore'a kaydet
      const hizmetData = {
        isim: formData.isim,
        soyisim: formData.soyisim,
        plaka: formData.plaka.toUpperCase(),
        aracModeli: formData.aracModeli,
        hizmetTarihi: Timestamp.fromDate(hizmetTarihiObj),
        yapilanIslemler: formData.yapilanIslemler,
        alınanUcret: parseFloat(formData.alınanUcret),
        kullaniciId: user.uid,
        olusturmaTarihi: Timestamp.now(),
        sonrakiBakimTarihi: Timestamp.fromDate(sonrakiBakimTarihi),
      };

      await addDoc(collection(db, 'hizmetler'), hizmetData);

      // Formu temizle
      setFormData({
        isim: '',
        soyisim: '',
        plaka: '',
        aracModeli: '',
        hizmetTarihi: '',
        yapilanIslemler: '',
        alınanUcret: '',
      });
      setSuccessMessage('Hizmet kaydı başarıyla oluşturuldu!');
      setLoading(false);

      // Başarı mesajını 3 saniye sonra kaldır
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setLoading(false);
      alert('Kayıt yapılırken bir hata oluştu: ' + error.message);
    }
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Yeni Hizmet Kaydı</h2>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg px-8 pt-8 pb-8 border border-gray-100">
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}
          {loading && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              İşlem yapılıyor, lütfen bekleyin...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* İsim */}
            <div>
              <label htmlFor="isim" className="block text-gray-700 text-sm font-bold mb-2">
                İsim *
              </label>
              <input
                type="text"
                id="isim"
                name="isim"
                value={formData.isim}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Müşteri adı"
              />
            </div>

            {/* Soyisim */}
            <div>
              <label htmlFor="soyisim" className="block text-gray-700 text-sm font-bold mb-2">
                Soyisim *
              </label>
              <input
                type="text"
                id="soyisim"
                name="soyisim"
                value={formData.soyisim}
                onChange={handleChange}
                required
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Müşteri soyadı"
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
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline uppercase"
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
                type="number"
                id="alınanUcret"
                name="alınanUcret"
                value={formData.alınanUcret}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="0.00"
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

