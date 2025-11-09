import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import KayitEkle from './pages/KayitEkle';
import BakimMerkezi from './pages/BakimMerkezi';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  // GitHub Pages için base path
  const basename = import.meta.env.BASE_URL || '/';

  return (
    <ErrorBoundary>
      <Router basename={basename}>
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
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
