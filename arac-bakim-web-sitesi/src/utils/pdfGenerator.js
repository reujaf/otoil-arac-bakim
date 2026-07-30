import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { KONTROL_KATEGORILERI } from '../data/kontrolData';

export const generateHizmetFormuPDF = async (hizmet, logoSrc) => {
  try {
    // Logo'yu base64'e çevir
    let logoBase64 = '';
    if (logoSrc) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logoSrc;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Logo yükleme zaman aşımı')), 5000);
          img.onload = () => {
            clearTimeout(timeout);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              logoBase64 = canvas.toDataURL('image/png');
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Logo yüklenemedi'));
          };
        });
      } catch (error) {
        console.warn('Logo base64\'e çevrilemedi:', error);
      }
    }

    // Tarih formatla
    const formatDateShort = (timestamp) => {
      if (!timestamp) return '-';
      const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('tr-TR');
    };

    // Müşteri adı
    const musteriAdi = hizmet.adSoyad || `${hizmet.isim || ''} ${hizmet.soyisim || ''}`.trim() || '-';

    // Ücret formatla
    const formatFiyat = (ucret) => {
      if (!ucret && ucret !== 0) return '0,00';
      const numValue = typeof ucret === 'number' ? ucret : parseFloat(ucret);
      if (isNaN(numValue)) return '0,00';
      return numValue.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const hasKontrolData = hizmet.kontrolListesi && Object.keys(hizmet.kontrolListesi).length > 0;

    const sorumlulukReddiHtml = `
      <div style="font-size:6.5pt; color:#64748b; margin-top:4px; line-height:1.3;">
        <strong>SORUMLULUK REDDİ:</strong> Bu belgede yer alan sonuçlar usta görüşü olup, anlık olarak yapılan kontrol sonuçlarıdır. OTOIL Yağ ve Bakım Merkezi bilgi verilen sorunlardan sorumlu değildir.
      </div>
    `;

    // ----------------------------------------------------
    // SAYFA 1: GENEL HİZMET FORMU HTML
    // ----------------------------------------------------
    const page1Html = `
      <div id="pdf-page-1" style="width:210mm; min-height:280mm; padding:14mm 14mm 14mm 14mm; background:white; font-family:'Inter', 'Arial', sans-serif; color:#282828; box-sizing:border-box; position:relative;">
        <div style="margin-bottom:16px; position:relative;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="OTOIL Logo" style="height:38px; margin-bottom:8px; display:block;" />` : ''}
          <div style="font-size:15pt; font-weight:700; color:#282828; margin-bottom:4px;">Araç Bakım Hizmet Formu</div>
          <div style="font-size:9pt; color:#646464; position:absolute; top:0; right:0; font-weight:600;">Tarih: ${formatDateShort(hizmet.hizmetTarihi)}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:9pt;">
          <thead>
            <tr style="background-color:#428bca; color:white;">
              <th style="padding:7px 10px; text-align:left; font-weight:600; font-size:10pt; border-radius:4px 0 0 0;">Bilgi Kalemi</th>
              <th style="padding:7px 10px; text-align:left; font-weight:600; font-size:10pt; border-radius:0 4px 0 0;">Değer</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color:#ffffff;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb; width:60mm;">Müşteri Adı Soyadı</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; font-weight:600;">${musteriAdi}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Telefon Numarası</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${hizmet.telefon || '-'}</td>
            </tr>
            <tr style="background-color:#ffffff;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Plaka</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; font-weight:700; font-size:11pt; text-transform:uppercase;">${hizmet.plaka || '-'}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Araç Modeli</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${hizmet.aracModeli || '-'}</td>
            </tr>
            <tr style="background-color:#ffffff;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Hizmet Tarihi</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${formatDateShort(hizmet.hizmetTarihi)}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Yapılan İşlemler</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; line-height:1.4;">${(hizmet.yapilanIslemler || '-').replace(/\n/g, '<br>')}</td>
            </tr>
            <tr style="background-color:#ffffff;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Personel</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${hizmet.personel || 'Şahin Lale'}</td>
            </tr>
            ${hizmet.fullCheckupSonucu ? `
            <tr style="background-color:#f9fafb;">
              <td style="padding:7px 10px; font-weight:600; color:#428bca; border-bottom:1px solid #e5e7eb;">Full Check-up Notları</td>
              <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; line-height:1.4;">${hizmet.fullCheckupSonucu.replace(/\n/g, '<br>')}</td>
            </tr>
            ` : ''}
            <tr style="background-color:#eff6ff;">
              <td style="padding:9px 10px; font-weight:700; color:#1e40af; border-bottom:1px solid #bfdbfe; font-size:10pt;">Alınan Ücret</td>
              <td style="padding:9px 10px; border-bottom:1px solid #bfdbfe; font-weight:800; color:#1e40af; font-size:11pt;">${formatFiyat(hizmet.alınanUcret)} TL</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:30px; font-size:8pt; color:#646464; border-top:1px solid #e5e7eb; padding-top:10px;">
          <div><strong style="color:#1e293b;">OTOIL Yağ ve Bakım Merkezi</strong> | İletişim: 0507 541 63 25</div>
          <div>www.otoil.com | info@otoil.com</div>
          ${!hasKontrolData ? sorumlulukReddiHtml : ''}
        </div>
      </div>
    `;

    // ----------------------------------------------------
    // SAYFA 2: ARAÇ KONTROL EKRANI (FULL CHECK-UP 2-KOLON DÜZENİ)
    // ----------------------------------------------------
    let page2Html = '';

    if (hasKontrolData) {
      const renderCategoryBlock = (kategori) => {
        const itemRows = kategori.elemanlar.map((item) => {
          const val = hizmet.kontrolListesi[item.id] || { durum: '', aciklama: '' };
          let durumText = '-';
          let badgeBg = '#f3f4f6';
          let badgeColor = '#4b5563';

          if (val.durum) {
            durumText = val.durum.toUpperCase();
            // VAR = Yeşil, YOK = Kırmızı
            if (['iyi', 'var'].includes(val.durum)) {
              badgeBg = '#059669'; // Yeşil
              badgeColor = '#ffffff';
            } else if (['orta', 'yapilmadi'].includes(val.durum)) {
              badgeBg = '#d97706'; // Sarı
              badgeColor = '#ffffff';
            } else if (['kotu', 'yok'].includes(val.durum)) {
              badgeBg = '#dc2626'; // Kırmızı
              badgeColor = '#ffffff';
            }
          }

          return `
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:2.5px 5px; font-size:7.2pt; font-weight:600; color:#334155; line-height:1.15; vertical-align:middle;">${item.label}</td>
              <td style="padding:2.5px 3px; text-align:center; vertical-align:middle; width:22%;">
                <div style="display:inline-block; width:48px; height:16px; position:relative; overflow:hidden; border-radius:8px; background-color:${badgeBg}; box-sizing:border-box; margin:0 auto; vertical-align:middle;">
                  <div style="position:absolute; top:-3.5px; left:0; width:100%; height:16px; line-height:16px; text-align:center; font-size:6.8pt; font-weight:700; font-family:'Inter', Arial, sans-serif; color:${badgeColor}; text-transform:uppercase;">
                    ${durumText}
                  </div>
                </div>
              </td>
              <td style="padding:2.5px 5px; font-size:6.5pt; font-weight:500; color:#475569; width:32%; line-height:1.15; word-break:break-word; white-space:normal; vertical-align:middle;">${(val.aciklama || '-').replace(/\n/g, '<br>')}</td>
            </tr>
          `;
        }).join('');

        return `
          <div style="margin-bottom:8px; border:1px solid #cbd5e1; border-radius:5px; overflow:hidden; background:white;">
            <div style="background-color:#1e293b; color:#ffffff; padding:4px 8px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;">
              ${kategori.baslik}
            </div>
            <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
              <thead>
                <tr style="background-color:#f8fafc; border-bottom:1px solid #cbd5e1; font-size:7.2pt; color:#475569;">
                  <th style="padding:3px 5px; text-align:left; font-weight:700; width:46%;">Kontrol Kalemi</th>
                  <th style="padding:3px 3px; text-align:center; font-weight:700; width:22%;">Durum</th>
                  <th style="padding:3px 5px; text-align:left; font-weight:700; width:32%;">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </div>
        `;
      };

      // Kategorileri 2 kolona bölme
      const mekhanikKat = KONTROL_KATEGORILERI.find(k => k.id === 'mekanik');
      const otmeKat = KONTROL_KATEGORILERI.find(k => k.id === 'otme');
      const sorunKat = KONTROL_KATEGORILERI.find(k => k.id === 'sorun_kacak');

      const notesBlockHtml = `
        <div style="margin-bottom:6px; border:1px solid #cbd5e1; border-radius:5px; overflow:hidden; background:white;">
          <div style="background-color:#1e293b; color:#ffffff; padding:5px 8px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;">
            USTA GÖRÜŞÜ & ÖZEL NOTLAR
          </div>
          <div style="padding:6px 8px; background-color:#ffffff;">
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:4px;"></div>
            <div style="border-bottom:1px dashed #cbd5e1; height:20px; margin-bottom:2px;"></div>
          </div>
        </div>
      `;

      const leftHtml = (mekhanikKat ? renderCategoryBlock(mekhanikKat) : '') + (otmeKat ? renderCategoryBlock(otmeKat) : '') + notesBlockHtml;
      const rightHtml = sorunKat ? renderCategoryBlock(sorunKat) : '';

      page2Html = `
        <div id="pdf-page-2" style="width:210mm; padding:10mm 12mm 10mm 12mm; background:white; font-family:'Inter', 'Arial', sans-serif; color:#282828; box-sizing:border-box; position:relative;">
          <!-- Üst Başlık -->
          <div style="margin-bottom:8px; position:relative; border-bottom:2px solid #26a9e0; padding-bottom:4px;">
            ${logoBase64 ? `<img src="${logoBase64}" alt="OTOIL Logo" style="height:30px; margin-bottom:3px; display:block;" />` : ''}
            <div style="font-size:12.5pt; font-weight:800; color:#1e293b;">Araç Kontrol Ekranı (Full Check-up Raporu)</div>
            <div style="font-size:8pt; color:#475569; margin-top:2px;">Plaka: <strong style="color:#26a9e0; text-transform:uppercase;">${hizmet.plaka || '-'}</strong> | Müşteri: <strong>${musteriAdi}</strong></div>
            <div style="font-size:8pt; color:#64748b; position:absolute; top:0; right:0; font-weight:600;">Tarih: ${formatDateShort(hizmet.hizmetTarihi)}</div>
          </div>

          <!-- 2 Kolonlu Düzen -->
          <div style="display:flex; gap:10px; justify-content:space-between; align-items:flex-start;">
            <div style="width:49.5%;">
              ${leftHtml}
            </div>
            <div style="width:49.5%;">
              ${rightHtml}
            </div>
          </div>

          <!-- Alt Bilgi Footer (Tam Görünür Sorumluluk Reddi Metni) -->
          <div style="margin-top:8px; font-size:7.5pt; color:#64748b; border-top:1px solid #cbd5e1; padding-top:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <div><strong style="color:#1e293b;">OTOIL Yağ ve Bakım Merkezi</strong> | İletişim: 0507 541 63 25</div>
              <div>www.otoil.com | info@otoil.com</div>
            </div>
            ${sorumlulukReddiHtml}
          </div>
        </div>
      `;
    }

    // ----------------------------------------------------
    // HTML ELEMENTLERİNİ RENDER ET VE CANVAS'A ÇEVİR
    // ----------------------------------------------------
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.innerHTML = page1Html + (page2Html ? `<div style="page-break-before:always;"></div>` + page2Html : '');
    document.body.appendChild(tempContainer);

    // Font yüklenmesini bekle
    await new Promise((resolve) => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => setTimeout(resolve, 400));
      } else {
        setTimeout(resolve, 800);
      }
    });

    const page1Element = tempContainer.querySelector('#pdf-page-1');
    const page2Element = tempContainer.querySelector('#pdf-page-2');

    // Canvas 1 (Sayfa 1)
    const canvas1 = await html2canvas(page1Element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: false
    });

    // Canvas 2 (Sayfa 2 - Var ise)
    let canvas2 = null;
    if (page2Element) {
      canvas2 = await html2canvas(page2Element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false
      });
    }

    document.body.removeChild(tempContainer);

    // ----------------------------------------------------
    // PDF OLUŞTURMA
    // ----------------------------------------------------
    const pdfWidth = 210;
    const pdfHeight = 297;
    const marginLeft = 10;
    const marginTop = 10;
    const blueBarWidth = 14;
    const marginRight = blueBarWidth + 6;
    const contentWidth = pdfWidth - marginLeft - marginRight;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // SAYFA 1 EKLENİYOR
    doc.setFillColor(66, 139, 202);
    doc.rect(pageWidth - blueBarWidth, 0, blueBarWidth, pageHeight, 'F');
    const imgHeight1 = (canvas1.height * contentWidth) / canvas1.width;
    doc.addImage(canvas1.toDataURL('image/png', 1.0), 'PNG', marginLeft, marginTop, contentWidth, imgHeight1);

    // SAYFA 2 EKLENİYOR (Eğer Kontrol Ekranı Verisi Var ise)
    if (canvas2) {
      doc.addPage();
      doc.setFillColor(66, 139, 202);
      doc.rect(pageWidth - blueBarWidth, 0, blueBarWidth, pageHeight, 'F');
      const imgHeight2 = (canvas2.height * contentWidth) / canvas2.width;
      doc.addImage(canvas2.toDataURL('image/png', 1.0), 'PNG', marginLeft, marginTop, contentWidth, imgHeight2);
    }

    // PDF ÇIKTISI VEYA PAYLAŞIM
    const pdfBlob = doc.output('blob');
    const fileName = `${(hizmet.plaka || 'hizmet').replace(/\s/g, '-')}-hizmet-formu.pdf`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `${hizmet.plaka || ''} - Hizmet ve Kontrol Formu`
          });
          return;
        }
      } catch (shareError) {
        console.log('Share API fallback:', shareError);
      }
    }

    if (isMobile) {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
    } else {
      doc.save(fileName);
    }
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    alert('PDF oluşturulurken bir hata oluştu: ' + error.message);
  }
};
