import type { FC } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const PublicLayout: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header público */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/docs" className="flex items-center space-x-2">
            <FileText size={24} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                Trace
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Documentación
              </p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <Link 
              to="/login"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <LogIn size={16} className="mr-1" />
              Acceder
            </Link>
          </div>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Trace. Documentación generada automáticamente.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;