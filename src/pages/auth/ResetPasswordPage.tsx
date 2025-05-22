import { type FC, useState, type FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const ResetPasswordPage: FC = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  
  // Verificar que hayamos llegado con un hash válido
  useEffect(() => {
    // En una implementación real, verificar el token de restablecimiento
    // Por ahora, asumimos que el usuario llegó aquí con un token válido
  }, []);
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { error } = await updatePassword(password);
      
      if (error) throw error;
      
      setMessage('Contraseña actualizada correctamente');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError('Error al actualizar la contraseña: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Restablecer contraseña
      </h2>
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-md">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="password" 
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
            placeholder="********"
            required
          />
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="confirmPassword" 
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
            placeholder="********"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <Link 
          to="/login" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;