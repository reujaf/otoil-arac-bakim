import { KONTROL_KATEGORILERI, getDefaultKontrolListesi } from '../data/kontrolData';

function AracKontrolEkrani({ kontrolListesi = {}, onChange, readOnly = false }) {

  const handleStatusChange = (itemId, durum) => {
    if (readOnly) return;
    const currentItem = kontrolListesi[itemId] || { durum: '', aciklama: '' };
    const newDurum = currentItem.durum === durum ? '' : durum;
    
    onChange({
      ...kontrolListesi,
      [itemId]: {
        ...currentItem,
        durum: newDurum,
      }
    });
  };

  const handleAciklamaChange = (itemId, aciklama) => {
    if (readOnly) return;
    const currentItem = kontrolListesi[itemId] || { durum: '', aciklama: '' };
    onChange({
      ...kontrolListesi,
      [itemId]: {
        ...currentItem,
        aciklama: aciklama,
      }
    });
  };

  const handleTumunuNormalYap = () => {
    if (readOnly) return;
    const defaultData = getDefaultKontrolListesi();
    const updated = { ...defaultData };
    Object.keys(kontrolListesi).forEach((itemId) => {
      if (kontrolListesi[itemId]?.aciklama) {
        updated[itemId].aciklama = kontrolListesi[itemId].aciklama;
      }
    });
    onChange(updated);
  };

  const handleTemizle = () => {
    if (readOnly) return;
    onChange({});
  };

  return (
    <div className="space-y-6">
      {/* Hızlı İşlem Barı - Kompakt ve Şık */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:px-4 mb-4 shadow-2xs">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hızlı İşlemler</h4>
            <p className="text-[11px] text-slate-500 hidden sm:block">Kontrol ekranını tek tıkla doldurabilirsiniz</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTumunuNormalYap}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Tümünü Normal / İYİ Yap</span>
            </button>
            <button
              type="button"
              onClick={handleTemizle}
              className="glass-btn-white text-slate-600 text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 transition-all"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      {KONTROL_KATEGORILERI.map((kategori) => {
        return (
          <div key={kategori.id} className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
            {/* Kategori Başlığı - Kesin Beyaz Yazı Rengi */}
            <div className="px-4 py-3 bg-[#1e293b] flex items-center justify-between border-b border-slate-700/60 shadow-xs">
              <h3 
                className="text-xs sm:text-sm font-extrabold tracking-widest uppercase drop-shadow-sm" 
                style={{ color: '#ffffff' }}
              >
                {kategori.baslik}
              </h3>
            </div>

            {/* Masaüstü Tablo Görünümü */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-bold text-slate-700">
                    <th className="py-3 px-4 w-5/12">Kontrol Kalemi</th>
                    {kategori.kolonlar.map((kolon) => (
                      <th key={kolon.key} className={`py-3 px-3 text-center w-28 uppercase font-extrabold text-white text-xs ${
                        kolon.key === 'iyi' || (kategori.tip === 'OTME' && kolon.key === 'yok') || (kategori.tip === 'VAR_YOK' && kolon.key === 'yok')
                          ? 'bg-emerald-600'
                          : kolon.key === 'orta' || (kategori.tip === 'OTME' && kolon.key === 'yapilmadi')
                          ? 'bg-amber-500'
                          : 'bg-rose-600'
                      }`}>
                        {kolon.label}
                      </th>
                    ))}
                    <th className="py-3 px-4">AÇIKLAMA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {kategori.elemanlar.map((item) => {
                    const itemVal = kontrolListesi[item.id] || { durum: '', aciklama: '' };
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {item.label}
                        </td>
                        {kategori.kolonlar.map((kolon) => {
                          const isSelected = itemVal.durum === kolon.key;
                          let activeStyle = '';
                          if (isSelected) {
                            if (kolon.key === 'iyi' || (kategori.tip === 'OTME' && kolon.key === 'yok') || (kategori.tip === 'VAR_YOK' && kolon.key === 'yok')) {
                              activeStyle = 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105';
                            } else if (kolon.key === 'orta' || (kategori.tip === 'OTME' && kolon.key === 'yapilmadi')) {
                              activeStyle = 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30 scale-105';
                            } else {
                              activeStyle = 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/30 scale-105';
                            }
                          }

                          return (
                            <td key={kolon.key} className="py-3 px-2 text-center align-middle">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleStatusChange(item.id, kolon.key)}
                                className={`w-8 h-8 rounded-xl border-2 inline-flex items-center justify-center transition-all focus:outline-none ${
                                  isSelected
                                    ? activeStyle
                                    : 'border-slate-300 hover:border-slate-400 bg-white text-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            disabled={readOnly}
                            value={itemVal.aciklama || ''}
                            onChange={(e) => handleAciklamaChange(item.id, e.target.value)}
                            placeholder="Açıklama giriniz..."
                            className="glass-input w-full text-xs py-2 px-3 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none border border-slate-200/80 focus:border-[#26a9e0] bg-slate-50/50 focus:bg-white transition-all"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil Dokunmatik Kart Görünümü - Ferah Boşluklar ve Yüksek Kontrast */}
            <div className="block md:hidden divide-y divide-slate-100">
              {kategori.elemanlar.map((item) => {
                const itemVal = kontrolListesi[item.id] || { durum: '', aciklama: '' };
                return (
                  <div key={item.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="font-bold text-xs text-slate-800 tracking-tight leading-snug">
                      {item.label}
                    </div>

                    {/* Seçenek Butonları Grid'i - Genişletilmiş Boşluklar (gap-2.5) */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 py-1">
                      {kategori.kolonlar.map((kolon) => {
                        const isSelected = itemVal.durum === kolon.key;
                        let activeStyle = '';
                        if (isSelected) {
                          if (kolon.key === 'iyi' || (kategori.tip === 'OTME' && kolon.key === 'yok') || (kategori.tip === 'VAR_YOK' && kolon.key === 'yok')) {
                            activeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 scale-[1.02]';
                          } else if (kolon.key === 'orta' || (kategori.tip === 'OTME' && kolon.key === 'yapilmadi')) {
                            activeStyle = 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 scale-[1.02]';
                          } else {
                            activeStyle = 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 scale-[1.02]';
                          }
                        }

                        return (
                          <button
                            key={kolon.key}
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleStatusChange(item.id, kolon.key)}
                            className={`min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all text-center flex items-center justify-center ${
                              isSelected
                                ? activeStyle
                                : 'bg-slate-100/90 text-slate-700 border-slate-200 hover:bg-slate-200/80 active:scale-95'
                            }`}
                          >
                            {kolon.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Açıklama Input Box */}
                    <div>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={itemVal.aciklama || ''}
                        onChange={(e) => handleAciklamaChange(item.id, e.target.value)}
                        placeholder="Açıklama (opsiyonel)..."
                        className="glass-input w-full text-xs py-2 px-3 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none border border-slate-200/80 focus:border-[#26a9e0] bg-slate-50/60 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AracKontrolEkrani;
