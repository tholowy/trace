import type { FC } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import GlobalSearch from '../search/GlobalSearch';
import { useState, useRef, useEffect } from 'react';

const MainLayout: FC = () => {
  const { user, userProfile, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false); // Close dropdown after logout
  };

  // Function to toggle dropdown visibility
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Barra de navegación superior */}
      <header className="bg-card shadow-sm border-b border-border h-16">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <img src="/logo.svg" alt="Logo" className="h-8" />
              Trace
            </Link>

            <nav className="hidden md:flex space-x-4">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-muted-foreground hover:text-primary transition-colors ${isActive ? 'text-primary font-medium' : ''
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `text-muted-foreground hover:text-primary transition-colors ${isActive ? 'text-primary font-medium' : ''
                  }`
                }
              >
                Proyectos
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Buscador */}
            <div className="relative hidden md:block">
              <GlobalSearch />
            </div>

            {/* Cambio de tema */}
            <ThemeToggle />

            {/* Perfil de usuario */}
            <div className="relative" ref={dropdownRef}>
              <button onClick={toggleDropdown} className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={`${userProfile.first_name || ''} ${userProfile.last_name || ''}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-secondary-foreground">
                      {userProfile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
              </button>

              {/* Menú desplegable */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg py-1 z-10 block border border-border">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {userProfile?.first_name && userProfile?.last_name
                        ? `${userProfile.first_name} ${userProfile.last_name}`
                        : user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings size={16} className="inline mr-2" /> Perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut size={16} className="inline mr-2" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto py-6 h-[calc(100vh-7rem)]">
        <Outlet />
      </main>

      {/* Pie de página */}
      <footer className="bg-card border-t border-border h-12 flex items-center">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Trace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;