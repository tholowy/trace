import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Clock, FileText, Plus } from 'lucide-react';
import { projectService } from '../services/projectService';
import { documentService } from '../services/documentService';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from '../components/search/GlobalSearch';
import type { Project, Document } from '../types';

const DashboardPage: FC = () => {
  const { userProfile } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Cargar proyectos recientes
        const { data: projectsData, error: projectsError } = await projectService.getProjects();
        
        if (projectsError) throw projectsError;
        
        setRecentProjects(projectsData?.slice(0, 4) || []);
        
        // Cargar documentos recientes si hay proyectos
        if (projectsData && projectsData.length > 0) {
          const { data: documentsData, error: documentsError } = await documentService.getDocuments(
            projectsData[0].id
          );
          
          if (documentsError) throw documentsError;
          
          setRecentDocuments(documentsData?.slice(0, 5) || []);
        }
      } catch (err: any) {
        setError('Error al cargar datos del dashboard: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="max-w-screen-xl mx-auto p-6">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Bienvenido, {userProfile?.first_name || 'Usuario'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona y organiza toda tu documentación de proyectos
        </p>
      </div>
      
      {/* Búsqueda global */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Busca en toda tu documentación
        </h2>
        <div className="flex items-center">
          <GlobalSearch />
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proyectos recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Proyectos recientes
            </h2>
            <Link 
              to="/projects" 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              Ver todos
            </Link>
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Cargando proyectos...
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map(project => (
                <Link 
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-md transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center mr-3">
                    {project.logo_url ? (
                      <img 
                        src={project.logo_url} 
                        alt={project.name} 
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <Folder size={20} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-white truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {project.description || 'Sin descripción'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/40 rounded-md">
              <Folder size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                No tienes proyectos recientes
              </p>
              <Link to="/projects/new" className="btn-primary inline-flex text-white bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 flex items-center">
                <Plus size={16} className="mr-1.5" />
                Crear proyecto
              </Link>
            </div>
          )}
        </div>
        
        {/* Documentos recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Documentos recientes
            </h2>
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Cargando documentos...
            </div>
          ) : recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {recentDocuments.map(doc => (
                <Link 
                  key={doc.id}
                  to={`/projects/${doc.project_id}/documents/${doc.id}`}
                  className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-md transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center mr-3">
                    <FileText size={20} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-white truncate">
                      {doc.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate mr-2">
                        {doc.project?.name || ''}
                      </span>
                      <span className="mx-1">•</span>
                      <Clock size={14} className="mr-1" />
                      {formatDate(doc.updated_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/40 rounded-md">
              <FileText size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-300">
                No tienes documentos recientes
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Actividad reciente */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Actividad reciente
        </h2>
        
        <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/40 rounded-md">
          <p className="text-gray-600 dark:text-gray-300">
            No hay actividad reciente para mostrar
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
