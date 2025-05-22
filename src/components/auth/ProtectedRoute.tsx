import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { FC, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return <div className="flex justify-center items-center h-screen dark:bg-gray-900 dark:text-white text-2xl">Cargando...</div>;   
  }
  
  // Redirigir a la página de inicio de sesión si no hay usuario autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Renderizar los componentes hijos si el usuario está autenticado
  return <>{children}</>;
};

export default ProtectedRoute;
