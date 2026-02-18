import { useNavigate, useLocation } from 'react-router-dom';

function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Ana Sayfa',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/kayit-ekle',
      label: 'Kayıt Ekle',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      path: '/bakim-merkezi',
      label: 'Bakım Merkezi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-5 pt-2 pointer-events-none">
      <nav
        className="pointer-events-auto flex items-center justify-around w-full max-w-md h-[62px] rounded-[22px] px-1.5"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.35) inset',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center flex-1 h-full min-w-0 rounded-2xl transition-all duration-200 focus:outline-none"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 h-[46px] rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #26a9e0, #1e8fc4)',
                    boxShadow: '0 4px 14px rgba(38, 169, 224, 0.35), 0 0 0 1px rgba(255,255,255,0.2) inset',
                  }}
                />
              )}
              <span className={`relative z-10 flex items-center justify-center transition-colors ${active ? 'text-white' : 'text-slate-500'}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 text-[10px] font-semibold mt-0.5 truncate max-w-full px-1 ${active ? 'text-white' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default BottomNavigation;
