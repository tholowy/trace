import { useState} from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const { error } = await login(email, password);
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error: any) {
      setError('Error al iniciar sesión: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto py-10 px-12 bg-card rounded-lg shadow-md border border-border">
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
        Iniciar Sesión
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md border border-destructive">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="email" 
            className="block mb-2 font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="form-input" // Using the custom form-input class
            placeholder="tu@email.com"
            required
          />
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="password" 
            className="block mb-2 font-medium text-foreground"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-muted-foreground">
          ¿No tienes una cuenta?{' '}
          <Link 
            to="/register" 
            className="text-link hover:text-link-hover" // Using custom link colors
          >
            Regístrate
          </Link>
        </p>
        <p className="text-muted-foreground mt-2">
          <Link 
            to="/forgot-password" 
            className="text-link hover:text-link-hover" // Using custom link colors
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;