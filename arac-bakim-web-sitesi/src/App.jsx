import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import KayitEkle from './pages/KayitEkle';
import BakimMerkezi from './pages/BakimMerkezi';
import Analiz from './pages/Analiz';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';
import BottomNavigation from './components/BottomNavigation';
import { AppLoadingScreen } from './components/SkeletonLoader';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useLocation } from 'react-router-dom';

// Login sayfasında navigasyonu gizleyen sarmalayıcı
function RouteAwareBottomNav() {
  const location = useLocation();
  if (location.pathname === '/login') return null;
  return <BottomNavigation />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }, (error) => {
        console.error('Auth state change error:', error);
        setLoading(false);
      });
    } catch (error) {
      console.error('Firebase auth initialization error:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return <AppLoadingScreen />;
  }

  // GitHub Pages için base path
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <ErrorBoundary>
      <Router basename={basename}>
        <PageTransition>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kayit-ekle"
            element={
              <ProtectedRoute>
                <KayitEkle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bakim-merkezi"
            element={
              <ProtectedRoute>
                <BakimMerkezi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analiz"
            element={
              <ProtectedRoute>
                <Analiz />
              </ProtectedRoute>
            }
          />
        </Routes>
        </PageTransition>
        {/* Alt navigasyon sayfa geçiş animasyonunun DIŞINDA - sabit kalır */}
        {user && (
          <RouteAwareBottomNav />
        )}
        {/* PWA Kurulum / Ana Ekrana Ekleme Bildirimi */}
        <PWAInstallPrompt />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
