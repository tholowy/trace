import type { FC } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

const AuthLayout: FC = () => {
  const { user, loading } = useAuth();

  // If loading, show loading spinner (or a more styled loading state)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background text-foreground">
        Cargando...
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <Link to="/" className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <img src="/logo.svg" alt="Logo" className="h-8" />
              Trace
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Trace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;