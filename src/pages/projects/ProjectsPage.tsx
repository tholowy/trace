import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Users, Calendar, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { projectService } from '../../services/projectService';
// import { useAuth } from '../../context/AuthContext';
import type { Project } from '../../types';

const ProjectsPage: FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const { user } = useAuth();
  
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const { data, error } = await projectService.getProjects();
        
        if (error) throw error;
        
        setProjects(data || []);
      } catch (err: any) {
        setError('Error al cargar proyectos: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjects();
  }, []);
  
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const { error } = await projectService.deleteProject(id);
      
      if (error) throw error;
      
      setProjects(projects.filter(project => project.id !== id));
    } catch (err: any) {
      setError('Error al eliminar proyecto: ' + err.message);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando proyectos...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Link 
          to="/projects/new" 
          className="btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Nuevo Proyecto
        </Link>
      </div>
      
      {projects.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Folder size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Comienza creando tu primer proyecto de documentación
          </p>
          <Link to="/projects/new" className="btn-primary">
            Crear proyecto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {project.logo_url ? (
                  <img 
                    src={project.logo_url} 
                    alt={project.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Folder size={64} className="text-gray-400" />
                )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                    {project.name}
                  </h3>
                  <div className="relative">
                    <button 
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.preventDefault();
                        // Implementar menú de opciones
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {/* Menú de opciones */}
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {project.description || 'Sin descripción'}
                </p>
                
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar size={14} className="mr-1" />
                  Actualizado {format(new Date(project.updated_at), 'dd MMM yyyy', { locale: es })}
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex">
                    <Users size={16} className="mr-1 text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {/* Aquí iría el número de miembros */}
                      3 miembros
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link 
                      to={`/projects/${project.id}/edit`}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil size={16} />
                    </Link>
                    <button 
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;