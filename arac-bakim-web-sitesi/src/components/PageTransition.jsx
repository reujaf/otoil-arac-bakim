import { useLocation } from 'react-router-dom';

/**
 * Sayfa geçiş animasyonu: rota değiştiğinde içerik yumuşakça
 * yukarı kayarak ve fade-in ile görünür hale gelir.
 * CSS keyframe animasyonu kullanır; transform animasyon bittiğinde
 * otomatik temizlenir, position:fixed elemanları etkilenmez.
 */
function PageTransition({ children }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="page-transition"
    >
      {children}
    </div>
  );
}

export default PageTransition;
