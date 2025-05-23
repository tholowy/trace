import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage: FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-muted-foreground/30 dark:text-muted-foreground/20">404</h1>
        <h2 className="text-3xl font-bold mb-4 text-foreground">
          Página no encontrada
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          La página que estás buscando no existe o ha sido movida.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center"
        >
          <Home size={18} className="mr-2" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;