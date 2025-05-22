import type { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

const AuthLayout: FC = () => {
  const { user, loading } = useAuth();
  
  // Si está cargando, mostrar spinner de carga
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }
  
  // Si el usuario ya está autenticado, redirigir al dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Encabezado mínimo */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              Trace
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <Outlet />
      </main>
      
      {/* Pie de página */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Trace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;