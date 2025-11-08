import { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function Bildirimler({ onBildirimSayisiDegis, onBildirimTikla }) {
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [okunmusBildirimler, setOkunmusBildirimler] = useState(new Set());

  // LocalStorage'dan okunmuş bildirimleri yükle
  useEffect(() => {
    const savedOkunmus = localStorage.getItem('okunmusBildirimler');
    if (savedOkunmus) {
      try {
        setOkunmusBildirimler(new Set(JSON.parse(savedOkunmus)));
      } catch (e) {
        console.error('Okunmuş bildirimler yüklenirken hata:', e);
      }
    }
  }, []);

  // Bildirim sayısını hesapla ve parent'a bildir
  useEffect(() => {
    if (!onBildirimSayisiDegis) return;
    
    if (bildirimler.length === 0) {
      onBildirimSayisiDegis(0);
      return;
    }

    // LocalStorage'dan güncel okunmuş bildirimleri al
    const savedOkunmus = localStorage.getItem('okunmusBildirimler');
    const okunmusSet = savedOkunmus ? new Set(JSON.parse(savedOkunmus)) : okunmusBildirimler;
    const okunmamisSayisi = bildirimler.filter(b => !okunmusSet.has(b.id)).length;
    onBildirimSayisiDegis(okunmamisSayisi);
  }, [bildirimler, okunmusBildirimler, onBildirimSayisiDegis]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Kullanıcının kayıtlarını çek
    const q = query(
      collection(db, 'hizmetler'),
      where('kullaniciId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hizmetListesi = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

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

        setBildirimler(bildirimListesi);
        setLoading(false);

        // Bildirim sayısını parent component'e bildir
        if (onBildirimSayisiDegis) {
          const savedOkunmus = localStorage.getItem('okunmusBildirimler');
          const okunmusSet = savedOkunmus ? new Set(JSON.parse(savedOkunmus)) : new Set();
          const okunmamisSayisi = bildirimListesi.filter(b => !okunmusSet.has(b.id)).length;
          onBildirimSayisiDegis(okunmamisSayisi);
        }
      },
      (error) => {
        console.error('Veri çekme hatası:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [onBildirimSayisiDegis]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBildirimDurumu = (sonrakiBakimTarihi) => {
    if (!sonrakiBakimTarihi) return { text: '', className: '' };

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const sonrakiBakim = sonrakiBakimTarihi.toDate();
    sonrakiBakim.setHours(0, 0, 0, 0);

    if (sonrakiBakim < bugun) {
      return { text: 'BAKIM TARİHİ GEÇMİŞ!', className: 'bg-red-100 border-red-400 text-red-800' };
    } else if (sonrakiBakim.getTime() === bugun.getTime()) {
      return { text: 'BUGÜN BAKIM GÜNÜ!', className: 'bg-orange-100 border-orange-400 text-orange-800' };
    } else {
      return { text: 'Yaklaşıyor', className: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    }
  };

  const handleBildirimOkundu = (bildirimId) => {
    const yeniOkunmus = new Set(okunmusBildirimler);
    yeniOkunmus.add(bildirimId);
    setOkunmusBildirimler(yeniOkunmus);
    localStorage.setItem('okunmusBildirimler', JSON.stringify(Array.from(yeniOkunmus)));
    
    // Bildirim sayısını güncelle
    if (onBildirimSayisiDegis) {
      const okunmamisSayisi = bildirimler.filter(b => !yeniOkunmus.has(b.id)).length;
      onBildirimSayisiDegis(okunmamisSayisi);
    }

    // Bakım merkezine yönlendir
    if (onBildirimTikla) {
      onBildirimTikla();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    );
  }

  if (bildirimler.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Henüz bildirim bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {bildirimler.map((hizmet) => {
          const durum = getBildirimDurumu(hizmet.sonrakiBakimTarihi);
          const okunmamis = !okunmusBildirimler.has(hizmet.id);
          return (
            <div
              key={hizmet.id}
              className={`bg-white border-l-4 ${
                durum.className.includes('red') ? 'border-red-500' : 
                durum.className.includes('orange') ? 'border-orange-500' : 
                'border-yellow-500'
              } rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all p-5 ${okunmamis ? 'ring-2 ring-blue-300' : ''}`}
              onClick={() => handleBildirimOkundu(hizmet.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {okunmamis && (
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                    <h4 className="font-bold text-lg text-gray-900">
                      {hizmet.plaka} - {hizmet.isim} {hizmet.soyisim}
                    </h4>
                  </div>
                  <p className={`text-sm font-semibold mb-2 ${
                    durum.className.includes('red') ? 'text-red-800' : 
                    durum.className.includes('orange') ? 'text-orange-800' : 
                    'text-yellow-800'
                  }`}>
                    {durum.text}
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Son Bakım: {formatDate(hizmet.hizmetTarihi)}</p>
                    <p>Sonraki Bakım: {formatDate(hizmet.sonrakiBakimTarihi)}</p>
                    <p className="text-gray-500 mt-2">Tıklayarak Bakım Merkezi'ne gidin</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Bildirimler;

