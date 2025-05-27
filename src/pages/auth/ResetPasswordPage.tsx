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
  
  // In a real implementation, you'd verify the reset token here,
  // typically from a URL parameter. For this example, we assume
  // the user arrived with a valid token.
  useEffect(() => {
    // Example: const token = new URLSearchParams(window.location.search).get('token');
    // if (!token) {
    //   setError('Token de restablecimiento de contraseña no válido o faltante.');
    // }
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
      setMessage('');
      
      // In a real app, you'd pass the reset token along with the new password
      const { error } = await updatePassword(password /*, token */); 
      
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
    <div className="max-w-md w-full mx-auto p-6 bg-card rounded-lg shadow-md border border-border">
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
        Restablecer contraseña
      </h2>
      
      {message && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-md border border-success">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md border border-destructive">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="password" 
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input" // Using the custom form-input class
            placeholder="********"
            required
          />
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="confirmPassword" 
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input" // Using the custom form-input class
            placeholder="********"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full" // Using the custom btn-primary class
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <Link 
          to="/login" 
          className="inline-flex items-center text-sm text-link hover:text-link-hover" // Using custom link colors
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;