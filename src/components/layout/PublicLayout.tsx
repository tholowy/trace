import type { FC } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle'; // Assuming this path is correct

const PublicLayout: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header público */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/docs" className="flex items-center space-x-3 group">
            <img src="/logo.svg" alt="Logo" className="h-8" />
            <div>
              <h1 className="text-2xl font-extrabold text-foreground leading-none">
                Trace
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Documentación
              </p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-6">
            <ThemeToggle />
            
            <Link 
              to="/login"
              className="inline-flex items-center px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
            >
              <LogIn size={18} className="mr-2" />
              Acceder
            </Link>
          </div>
        </div>
      </header>
      
      {/* Contenido principal - Outlet renderiza las rutas hijas */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {/* Footer */}

      <footer className="w-full bg-card border-t border-border py-6 px-6 text-center text-muted-foreground text-sm mt-16">
        <p>&copy; {new Date().getFullYear()} Trace Docs. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default PublicLayout;