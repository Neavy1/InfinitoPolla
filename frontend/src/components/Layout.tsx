import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/groups', label: 'Grupos' },
  { to: '/bracket', label: 'Llave' },
  { to: '/leaderboard', label: 'Ranking' },
  { to: '/profile', label: 'Perfil' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-infinito-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Infinito" className="h-10 rounded" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Polla Infinito</h1>
              <p className="text-xs text-infinito-green">Mundial 2026</p>
            </div>
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-infinito-orange text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    location.pathname === '/admin' ? 'bg-infinito-green text-infinito-navy' : 'hover:bg-white/10'
                  }`}
                >
                  Admin
                </Link>
              )}
              <button onClick={logout} className="ml-2 px-3 py-2 text-sm hover:bg-white/10 rounded-lg">
                Salir
              </button>
            </nav>
          )}
        </div>
        {user && (
          <div className="md:hidden border-t border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  location.pathname === item.to ? 'bg-infinito-orange' : 'bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
      <footer className="bg-infinito-navy text-white/70 text-center py-4 text-sm">
        Polla Infinito 2026 — Tiendas Infinito
      </footer>
    </div>
  );
}
