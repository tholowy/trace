import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Calendar, Search as SearchIcon, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PublicHomePage: FC = () => {
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadPublicProjects() {
      try {
        setLoading(true);

        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('is_public', true) // Assuming 'is_public' still refers to being visible internally
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error loading public projects:', error);
          // Podrías añadir un estado de error para mostrar un mensaje al usuario
        }

        setPublicProjects(projects || []);
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPublicProjects();
  }, []);

  const filteredProjects = publicProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* El header se manejará en PublicLayout.tsx, por lo que este comentario está bien. */}
      {/* <header className="w-full bg-card border-b border-border py-4 px-6 flex justify-between items-center shadow-sm">
        <Link to="/" className="text-2xl font-bold text-primary">Trace Docs</Link>
        <nav>
          <Link to="/login" className="text-muted-foreground hover:text-foreground mr-4">Iniciar Sesión</Link>
          <Link to="/register" className="btn-primary">Registrarse</Link>
        </nav>
      </header> */}

      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
        {/* Hero section mejorada para uso interno */}
        <div className="text-center mb-16 px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
            <span className="text-primary-lighter">Biblioteca</span> de Documentación Interna
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Encuentra documentación, guías y recursos de nuestros proyectos internos.
          </p>

          {/* Búsqueda principal mejorada */}
          <div className="max-w-2xl mx-auto relative shadow-lg rounded-xl">
            <input
              type="text"
              placeholder="Buscar por nombre o descripción de proyecto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 text-lg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground placeholder:text-muted-foreground transition-all duration-200"
            />
            <SearchIcon size={24} className="absolute left-5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Sección de Proyectos Disponibles */}
        <div className="mb-20 px-4">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Proyectos Disponibles
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="mt-4 text-muted-foreground text-lg">Cargando proyectos...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map(project => (
                <Link
                  key={project.id}
                  to={`/docs/${project.slug}`}
                  className="group bg-card rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 p-7 border border-border flex flex-col justify-between h-full"
                >
                  <div className="flex items-start space-x-5 mb-4">
                    <div className="flex-shrink-0">
                      {project.logo_url ? (
                        <img
                          src={project.logo_url}
                          alt={project.name}
                          className="w-16 h-16 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center border border-border">
                          <Folder size={32} className="text-primary" />
                        </div>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <h3 className="text-xl font-bold text-foreground mb-1 leading-tight">
                        {project.name}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {project.description || 'Sin descripción disponible para este proyecto.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border-light">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1.5 text-secondary" />
                      <span>Actualizado {format(new Date(project.updated_at), 'dd MMM yyyy', { locale: es })}</span>
                    </div>
                    {/* Optional: Add a subtle indicator that it's a link to another page/doc */}
                    <ExternalLink size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-xl shadow-lg border border-border">
              <Folder size={60} className="mx-auto text-muted-foreground opacity-50 mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {searchQuery ? 'No se encontraron resultados' : 'No hay proyectos de documentación disponibles'}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? `Intenta con otra palabra clave. No se encontraron proyectos que coincidan con "${searchQuery}".`
                  : 'Parece que no hay documentación interna disponible en este momento.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicHomePage;