import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { FC, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = memo(({ children }) => {
  const { user, loading } = useAuth();
  
  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background text-foreground">
        <div className="text-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          Verificando autenticación...
        </div>
      </div>
    );   
  }
  
  // Redirigir a la página de inicio de sesión si no hay usuario autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Renderizar los componentes hijos si el usuario está autenticado
  return <>{children}</>;
});

// Asignar displayName para debugging
ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;