import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Folder, Calendar, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Document, Project } from '../../types';

const PublicDocsPage: FC = () => {
  const [publicDocuments, setPublicDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    async function loadPublicContent() {
      try {
        setLoading(true);
        
        // Cargar proyectos
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('name', { ascending: true });
          
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
        
        // Cargar documentos públicos con información del proyecto y categoría
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select(`
            *,
            project:project_id (
              id,
              name,
              description
            ),
            category:category_id (
              id,
              name
            )
          `)
          .eq('is_published', true)
          .order('updated_at', { ascending: false });
          
        if (docsError) throw docsError;
        setPublicDocuments(docsData || []);
        
      } catch (error) {
        console.error('Error loading public content:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadPublicContent();
  }, []);

  // Filtrar documentos
  const filteredDocuments = publicDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = selectedProject === 'all' || doc.project_id === selectedProject;
    
    return matchesSearch && matchesProject;
  });

  // Agrupar documentos por proyecto
  const documentsByProject = filteredDocuments.reduce((acc, doc) => {
    const projectName = doc.project?.name || 'Sin proyecto';
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Documentación
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Encuentra toda la documentación y recursos disponibles
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Buscar documentación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Filtro por proyecto */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos los proyectos</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando documentación...</p>
        </div>
      ) : Object.keys(documentsByProject).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(documentsByProject).map(([projectName, docs]) => (
            <div key={projectName} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Folder size={24} className="mr-2 text-blue-600 dark:text-blue-400" />
                {projectName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map(doc => (
                  <Link
                    key={doc.id}
                    to={`/docs/${doc.id}`}
                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                          {doc.title}
                        </h3>
                        
                        {doc.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.category?.name}
                          </span>
                          
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Calendar size={12} className="mr-1" />
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || selectedProject !== 'all' 
              ? 'No se encontraron documentos' 
              : 'No hay documentación disponible'
            }
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedProject !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no hay documentación pública disponible'
            }
          </p>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {publicDocuments.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Documentos públicos
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {projects.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Proyectos disponibles
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Object.keys(documentsByProject).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Categorías de documentación
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocsPage;