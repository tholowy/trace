import { type FC, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const ForgotPasswordPage: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { resetPassword } = useAuth();
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingresa tu email');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const { error } = await resetPassword(email);
      
      if (error) throw error;
      
      setMessage('Se ha enviado un correo para restablecer tu contraseña. Por favor revisa tu bandeja de entrada.');
    } catch (err: any) {
      setError('Error al procesar la solicitud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Recuperar contraseña
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
        <div className="mb-6">
          <label 
            htmlFor="email" 
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
            placeholder="tu@email.com"
            required
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Te enviaremos instrucciones para restablecer tu contraseña
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar instrucciones'}
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

export default ForgotPasswordPage;