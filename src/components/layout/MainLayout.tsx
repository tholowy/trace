import type { FC } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import GlobalSearch from '../search/GlobalSearch';

const MainLayout: FC = () => {
  const { user, userProfile, logout } = useAuth();
  // const location = useLocation();
  
  const handleLogout = async () => {
    await logout();
  };
  
  // Verificar si la ruta actual corresponde a un enlace de navegación
  // const isActive = (path: string) => {
  //   return location.pathname === path;
  // };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Barra de navegación superior */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-xl font-bold text-gray-800 dark:text-white">
              Trace
            </Link>
            
            <nav className="hidden md:flex space-x-4">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/projects" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`
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
            <div className="relative group">
              <button className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt={`${userProfile.first_name || ''} ${userProfile.last_name || ''}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {userProfile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
              </button>
              
              {/* Menú desplegable */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {userProfile?.first_name && userProfile?.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <Link 
                  to="/profile" 
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings size={16} className="inline mr-2" /> Perfil
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LogOut size={16} className="inline mr-2" /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="container mx-auto py-6">
        <Outlet />
      </main>
      
      {/* Pie de página */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Trace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;