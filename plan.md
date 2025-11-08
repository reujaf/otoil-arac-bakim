Araç Bakım Kayıt Web Uygulaması - Geliştirme Planı

Bu doküman, Cursor AI kullanarak sıfırdan, modern web teknolojileri ile bir araç bakım kayıt web sitesi (web uygulaması) geliştirmek için adım adım bir yol haritasıdır.

Önerilen Teknoloji Yığını:
(Bu yığın, tam da istediğiniz gibi modern web teknolojilerinden oluşur.)

Frontend (Arayüz): React (Vite ile)

Neden React? Günümüzdeki en popüler, hızlı ve güçlü web sitesi arayüzü kütüphanesidir.

Backend & Veritabanı (Sunucu Tarafı): Firebase

Neden Firebase? Sunucu yönetimiyle uğraşmadan kimlik doğrulama (Authentication), veritabanı (Firestore) ve dosya depolama (Storage) gibi karmaşık web özelliklerini kolayca eklememizi sağlar.

PDF Oluşturma: jspdf & jspdf-autotable

Bu, tarayıcıda (web sitesi içinde) çalışan bir JavaScript kütüphanesidir.

Faz 1: Proje Kurulumu ve Kimlik Doğrulama

Amaç: Web sitesi projesini başlatmak, Firebase'i entegre etmek ve kullanıcı giriş sistemini kurmak.

Proje Oluşturma (Cursor AI'a Yönelik İstem):

"Bana Vite kullanarak 'arac-bakim-web-sitesi' adında yeni bir React projesi oluştur. Gerekli tüm bağımlılıkları kur."

Firebase Projesi Oluşturma:

firebase.google.com adresine gidin, yeni bir proje oluşturun.

Authentication (Email/Password), Firestore Database ve Storage servislerini etkinleştirin.

Firebase Entegrasyonu (Cursor AI'a Yönelik İstem):

Gerekli firebase kütüphanesini kur:

"Projeme firebase kütüphanesini ekle."

Firebase ayar dosyasını oluştur:

"Bana src klasörü içinde firebaseConfig.js adında bir dosya oluştur. İçine Firebase proje ayarlarımı (apiKey, authDomain, vb.) yapıştıracağım bir şablon ekle."

(Firebase konsolundan aldığınız ayarları bu dosyaya yapıştırın.)

Giriş Sayfası (Cursor AI'a Yönelik İstem):

"Firebase Authentication kullanarak bir email/şifre ile giriş yapma ve yeni kullanıcı kaydı (signup) özellikleri sunan basit bir LoginPage.js bileşeni (sayfası) oluştur. Başarılı giriş/kayıt sonrası kullanıcıyı ana sayfaya yönlendir."

Rotalama (Routing) (Cursor AI'a Yönelik İstem):

"Projeye react-router-dom kütüphanesini ekle. Bu, web sitemizde farklı sayfalar (/login, / gibi) oluşturmamızı sağlar. App.js dosyasını düzenle. Kullanıcı giriş yapmamışsa /login sayfasına, giriş yapmışsa / (ana sayfa) sayfasına yönlendir. Özel (protected) bir rota yapısı kur."

Faz 2: Müşteri Kayıt Formu

Amaç: Yeni müşteri ve hizmet kaydı yapmak için gerekli web formunu oluşturmak.

Form Bileşeni (Cursor AI'a Yönelik İstem):

"Bana src/components klasörü altında HizmetKayitFormu.js adında yeni bir React bileşeni oluştur."

Form Alanları (Cursor AI'a Yönelik İstem):

"Bu forma useState kullanarak şu alanlar için state'ler ve HTML input elemanları ekle:

isim (text)

soyisim (text)

plaka (text)

aracModeli (text)

hizmetTarihi (date input)

yapilanIslemler (textarea)

alınanUcret (number input)

aracFotografi (file input, accept="image/*")
Formun tasarımını basit ve temiz yap (CSS veya Tailwind CSS kullanabilirsin)."

Faz 3: Veritabanı ve Fotoğraf Yükleme

Amaç: Formdaki verileri ve araç fotoğrafını Firebase'e (sunucuya) kaydetmek.

Firebase Servislerini Başlatma (Cursor AI'a Yönelik İstem):

"firebaseConfig.js dosyamda getFirestore ve getStorage kullanarak Firestore ve Storage servislerini başlat ve bunları dışa aktar."

Fotoğraf Yükleme Fonksiyonu (Cursor AI'a Yönelik İstem):

"HizmetKayitFormu.js bileşenine, kullanıcı 'Araç Fotoğrafı' seçtiğinde bu fotoğrafı Firebase Storage'a yükleyecek bir fonksiyon yaz. Fotoğrafı arac-fotolari/[dosya-adi] şeklinde bir yola yükle. Yükleme başarılı olduğunda, fotoğrafın indirme URL'ini (download URL) bir state'e kaydet."

Form Kaydetme Fonksiyonu (Cursor AI'a Yönelik İstem):

"Forma bir 'Kaydet' butonu ekle. Bu butona tıklandığında, formdaki tüm verileri (fotoğraf URL'i dahil) ve o an giriş yapmış olan kullanıcının uid'sini (kullanıcı kimliği) alarak Firebase Firestore'daki 'hizmetler' adında bir koleksiyona yeni bir doküman olarak ekleyen bir handleSubmit fonksiyonu yaz. Kayıt sonrası formu temizle ve bir başarı mesajı göster."

Faz 4: Kayıtları Listeleme

Amaç: Web sitesinin ana sayfasında mevcut hizmet kayıtlarını göstermek.

Kayıt Listesi Bileşeni (Cursor AI'a Yönelik İstem):

"Ana sayfada (HomePage.js), Firestore'daki 'hizmetler' koleksiyonundan verileri dinleyen (onSnapshot kullanarak) ve sadece giriş yapmış kullanıcının eklediği kayıtları (kullanıcı uid'sine göre filtreleyerek) çeken bir useEffect kancası yaz. Gelen verileri bir state'e at ve bunları bir liste veya tablo olarak ekrana bas."

Listede Gösterilecekler:

Tarih

Plaka

Müşteri Adı Soyadı

Yapılan İşlemler (kısaca)

Detayları görmek için bir buton/link

Faz 5: PDF Oluşturma ve WhatsApp Paylaşımı

Amaç: Her kayıt için PDF hizmet formu oluşturmak ve paylaşma seçeneği sunmak.

Gerekli Kütüphaneler (Cursor AI'a Yönelik İstem):

"Projeme PDF oluşturmak için jspdf ve jspdf-autotable kütüphanelerini ekle."

PDF Oluşturma Fonksiyonu (Cursor AI'a Yönelik İstem):

"Kayıt listesindeki her bir öğenin yanına 'PDF Oluştur' butonu ekle. Bu butona tıklandığında, o kaydın tüm verilerini (İsim, Plaka, Model, İşlemler, Ücret, Tarih vb.) alan ve jspdf kullanarak bir PDF dosyası oluşturan bir fonksiyon yaz. PDF'e bir başlık ('[Firma Adı] Hizmet Formu') ve ardından verileri bir tablo şeklinde ekle. Araç fotoğrafını da (doc.addImage ile) PDF'e ekle. PDF'i oluşturduktan sonra [plaka]-hizmet-formu.pdf adıyla indir."

WhatsApp Paylaşım Butonu (Cursor AI'a Yönelik İstem):

"PDF butonunun yanına bir 'WhatsApp'ta Paylaş' ikonu/butonu ekle. Bu buton, bir WhatsApp Web/Mobil linki (https://api.whatsapp.com/send?text=[mesaj]) açsın. [mesaj] kısmı, müşteriye göndermek istediğin önceden doldurulmuş bir metin içermeli. Örneğin: 'Merhaba [Müşteri Adı], [Tarih] tarihli [Plaka] plakalı aracınızın servis işlemi tamamlanmıştır. Detaylar...'"
Not: Link ile doğrudan PDF dosyası göndermek mümkün değildir. Kullanıcı, indirdiği PDF'i manuel olarak sohbete eklemelidir. Bu buton sadece bilgilendirme metnini hızlıca göndermek içindir.

Faz 6: Periyodik Bakım Hatırlatıcısı

Amaç: Hizmet tarihine göre 6 ay sonrasını hesaplamak ve zamanı geldiğinde web sitesinde bildirim göstermek.

Veri Yapısını Güncelleme (Cursor AI'a Yönelik İstem):

"HizmetKayitFormu.js içindeki handleSubmit fonksiyonunu güncelle: Kayıt yaparken, hizmetTarihi'ne 6 ay ekleyerek sonrakiBakimTarihi adında yeni bir Timestamp alanı da Firestore dokümanına kaydet."
(JavaScript'te bir tarihe 6 ay ekleme işlemini Cursor AI'a yazdırabilirsin.)

Bildirim Bileşeni (Cursor AI'a Yönelik İstem):

"Ana sayfada, Bildirimler adında bir bölüm oluştur."

Bildirim Mantığı (Cursor AI'a Yönelik İstem):

"Ana sayfada, Firestore'dan kayıtları çekerken, sonrakiBakimTarihi bugünün tarihinden itibaren 1 hafta içinde olan veya tarihi geçmiş olan kayıtları filtrele. Bu filtrelenmiş kayıtları 'Bildirimler' bölümünde 'DİKKAT: [Plaka] plakalı aracın periyodik bakımı yaklaştı/geldi! (Tarih: [sonrakiBakimTarihi])' şeklinde göster."