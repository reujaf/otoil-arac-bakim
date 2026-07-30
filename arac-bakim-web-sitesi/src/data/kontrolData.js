export const KONTROL_KATEGORILERI = [
  {
    id: 'mekanik',
    baslik: 'MEKANİK KONTROLLER',
    tip: 'DURUM',
    kolonlar: [
      { key: 'iyi', label: 'İYİ', activeClass: 'bg-emerald-600 text-white border-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800' },
      { key: 'orta', label: 'ORTA', activeClass: 'bg-amber-500 text-white border-amber-500', badgeClass: 'bg-amber-100 text-amber-800' },
      { key: 'kotu', label: 'KÖTÜ', activeClass: 'bg-rose-600 text-white border-rose-600', badgeClass: 'bg-rose-100 text-rose-800' }
    ],
    elemanlar: [
      { id: 'akuOlcumu', label: 'Akü Ölçümü' },
      { id: 'icAksKorukleri', label: 'İç Aks Körükleri' },
      { id: 'yagSeviyesi', label: 'Yağ Seviyesi' },
      { id: 'silindirKapakConta', label: 'Silindir Kapak Conta Testi' },
      { id: 'yururAksam', label: 'Yürür Aksam (Ön Takım)' },
      { id: 'motorTakozlari', label: 'Motor Takozları' },
      { id: 'onBalatalar', label: 'Ön Balatalar' },
      { id: 'arkaBalatalar', label: 'Arka Balatalar' },
      { id: 'onDisk', label: 'Ön Disk' },
      { id: 'arkaDisk', label: 'Arka Disk' },
      { id: 'jantlar', label: 'Jantlar' },
      { id: 'amortisorUstTakozlari', label: 'Amortisör Üst Takozları' },
      { id: 'klima', label: 'Klima' },
      { id: 'vKayisi', label: 'V Kayışı' }
    ]
  },
  {
    id: 'otme',
    baslik: 'ÖTME / SES KONTROLLERİ',
    tip: 'OTME',
    kolonlar: [
      { key: 'var', label: 'VAR', activeClass: 'bg-emerald-600 text-white border-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800' },
      { key: 'yapilmadi', label: 'YAPILMADI', activeClass: 'bg-amber-500 text-white border-amber-500', badgeClass: 'bg-amber-100 text-amber-800' },
      { key: 'yok', label: 'YOK', activeClass: 'bg-rose-600 text-white border-rose-600', badgeClass: 'bg-rose-100 text-rose-800' }
    ],
    elemanlar: [
      { id: 'parcalardaOtme', label: 'Lastik, Rulman, Şanzıman, (varsa diferansiyel) vb. Parçalarda Ötme Var mı?' }
    ]
  },
  {
    id: 'sorun_kacak',
    baslik: 'SORUN, KAÇAK VE HASAR KONTROLLERİ',
    tip: 'VAR_YOK',
    kolonlar: [
      { key: 'var', label: 'VAR', activeClass: 'bg-emerald-600 text-white border-emerald-600', badgeClass: 'bg-emerald-100 text-emerald-800' },
      { key: 'yok', label: 'YOK', activeClass: 'bg-rose-600 text-white border-rose-600', badgeClass: 'bg-rose-100 text-rose-800' }
    ],
    elemanlar: [
      { id: 'aractaTitreme', label: 'Araçta Titreme Sorunu' },
      { id: 'aractaTekleme', label: 'Araçta Tekleme Sorunu' },
      { id: 'yedekSuDeposuYag', label: 'Yedek Su Deposunda Yağ' },
      { id: 'motorYagKacagi', label: 'Motor Yağ Kaçağı' },
      { id: 'motorTerleme', label: 'Motor\'da Terleme Var mı?' },
      { id: 'sanzimanYagKacagi', label: 'Şanzıman Yağ Kaçağı' },
      { id: 'turboYagKacagi', label: 'Turbo Yağ Kaçağı' },
      { id: 'intercoolerYagKacagi', label: 'Intercooler Yağ Kaçağı' },
      { id: 'defransiyelYagKacagi', label: 'Defransiyel Yağ Kaçağı' },
      { id: 'aksKeceleriYagKacagi', label: 'Sağ/Sol Aks Keçeleri/Yağ Kaçağı' },
      { id: 'frenHortumlariCatlak', label: 'Fren Hortumları Çatlak Deforme vb.' },
      { id: 'akslardaBosluk', label: 'Akslarda Boşluk' },
      { id: 'disAksKorukleri', label: 'Dış Aks Körükleri (Yırtık/Yağ Kaçağı)' },
      { id: 'icAksKorukleriYirtik', label: 'İç Aks Körükleri (Yırtık/Yağ Kaçağı)' },
      { id: 'davlumbazlar', label: 'Davlumbazlar (Kırık/Tamir vb.)' },
      { id: 'kartelEzik', label: 'Kartel (Ezik/Kaynak/Tamir vb.)' },
      { id: 'trigerGergiSes', label: 'Triger/Gergi/Şarj/Kasnak/Rulman vb. Ses' },
      { id: 'sanzimanIcSes', label: 'Şanzıman iç kısmında ses var mı? (Debriyaj Rulmanı, Rulman, Dişli, Volan, Türbin vb.)' },
      { id: 'radyatorler', label: 'Radyatörler (Tamir/Ezik vb.)' },
      { id: 'yakitDeposu', label: 'Yakıt Deposu (Ezik/Tamir vb.)' },
      { id: 'motorAltMuhafaza', label: 'Motor Alt Muhafaza Plastik (Kırık vb.)' },
      { id: 'tamponAltMuhafaza', label: 'Tampon Alt Muhafaza Plastik (Kırık vb.)' },
      { id: 'sagSolAltMuhafaza', label: 'Sağ/Sol Alt Muhafaza Plastik (Kırık vb.)' },
      { id: 'direksiyonBosluk', label: 'Direksiyon Kutusunda Boşluk' },
      { id: 'direksiyonKorukleri', label: 'Direksiyon Kutusu Körükleri (Yırtık)' },
      { id: 'direksiyonYagKacagi', label: 'Direksiyon Kutusu Yağ Kaçağı' },
      { id: 'turbodaOtme', label: 'Turboda Ötme' },
      { id: 'suKacaklari', label: 'Su Kaçakları' },
      { id: 'egzosKorumaSaclar', label: 'Egzos Koruma Sacları' },
      { id: 'katalizordeSes', label: 'Katalizörde Ses vb.' }
    ]
  }
];

export const getDefaultKontrolListesi = () => {
  const result = {};
  KONTROL_KATEGORILERI.forEach((kat) => {
    kat.elemanlar.forEach((item) => {
      let defaultDurum = '';
      if (kat.tip === 'DURUM') defaultDurum = 'iyi';
      else if (kat.tip === 'OTME') defaultDurum = 'yok';
      else if (kat.tip === 'VAR_YOK') defaultDurum = 'yok';

      result[item.id] = {
        durum: defaultDurum,
        aciklama: ''
      };
    });
  });
  return result;
};
