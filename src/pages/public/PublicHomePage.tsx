import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Calendar, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project } from '../../types';

const PublicHomePage: FC = () => {
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadPublicProjects() {
      try {
        setLoading(true);
        
        // Cargar proyectos públicos
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('is_public', true)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setPublicProjects(projects || []);
      } catch (error) {
        console.error('Error loading public projects:', error);
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
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Documentación Pública
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Encuentra toda la documentación y recursos disponibles
        </p>
        
        {/* Búsqueda principal */}
        <div className="max-w-2xl mx-auto relative">
          <input
            type="text"
            placeholder="Buscar proyectos o documentación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <SearchIcon size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Lista de proyectos públicos */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Proyectos Disponibles
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando proyectos...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <Link
                key={project.id}
                to={`/p/${project.slug}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {project.logo_url ? (
                      <img
                        src={project.logo_url}
                        alt={project.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Folder size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {project.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {project.description || 'Sin descripción disponible'}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={14} className="mr-1" />
                      Actualizado {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Folder size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No se encontraron resultados' : 'No hay proyectos públicos'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery 
                ? `No se encontraron proyectos que coincidan con "${searchQuery}"`
                : 'Aún no hay documentación pública disponible'
              }
            </p>
          </div>
        )}
      </div>

      {/* Call to action */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          ¿Necesitas crear documentación?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Registrate en Trace para crear y gestionar tu propia documentación
        </p>
        <Link
          to="/register"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Comenzar ahora
        </Link>
      </div>
    </div>
  );
};

export default PublicHomePage;