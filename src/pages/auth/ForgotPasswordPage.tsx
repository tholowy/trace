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
    <div className="max-w-md w-full mx-auto p-6 bg-card rounded-lg shadow-md border border-border">
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
        Recuperar contraseña
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
        <div className="mb-6">
          <label 
            htmlFor="email" 
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input" // Using the custom form-input class
            placeholder="tu@email.com"
            required
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Te enviaremos instrucciones para restablecer tu contraseña
          </p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full" // Using the custom btn-primary class
        >
          {loading ? 'Enviando...' : 'Enviar instrucciones'}
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

export default ForgotPasswordPage;