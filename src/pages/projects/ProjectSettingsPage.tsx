import { type FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';
import { projectService } from '../../services/projectService';
import type { Project } from '../../types';
// import { useAuth } from '../../context/AuthContext';

const ProjectSettingsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  // const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    slug: string;
    is_public: boolean;
  }>({
    name: '',
    description: '',
    slug: '',
    is_public: false
  });
  
  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await projectService.getProjectById(projectId);
        
        if (error) throw error;
        if (!data) throw new Error('Proyecto no encontrado');
        
        setProject(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          slug: data.slug,
          is_public: data.is_public
        });
      } catch (err: any) {
        setError('Error al cargar el proyecto: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [projectId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const { data, error } = await projectService.updateProject(projectId, formData);
      
      if (error) throw error;
      
      setProject(data);
      setSuccess('Configuración actualizada correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError('Error al guardar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteProject = async () => {
    if (!projectId) return;
    
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer y eliminará todos los documentos asociados.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      const { error } = await projectService.deleteProject(projectId);
      
      if (error) throw error;
      
      navigate('/projects');
    } catch (err: any) {
      setError('Error al eliminar el proyecto: ' + err.message);
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando configuración...</div>;
  }
  
  if (!project) {
    return <div className="p-4">Proyecto no encontrado</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Configuración del proyecto
      </h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-md">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Información general */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">
              Información general
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del proyecto*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="slug" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL del proyecto (slug)*
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Esta será la URL para acceder al proyecto: /p/{formData.slug}
                </p>
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  id="is_public"
                  name="is_public"
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="is_public" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proyecto público
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  Si está marcado, cualquiera con el enlace podrá ver la documentación.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                  disabled={saving}
                >
                  <Save size={16} className="mr-1.5" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Categorías */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">
              Categorías
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Las categorías te permiten organizar tus documentos en grupos lógicos.
            </p>
            
            {/* Aquí iría la gestión de categorías */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Funcionalidad en desarrollo.
            </p>
          </div>
        </div>
        
        {/* Panel lateral */}
        <div>
          {/* Zona de peligro */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-red-200 dark:border-red-900/40">
            <h2 className="text-lg font-medium mb-4 text-red-600 dark:text-red-400 flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Zona de peligro
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Las acciones a continuación son destructivas y no se pueden deshacer.
            </p>
            
            <button
              onClick={handleDeleteProject}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
              disabled={saving}
            >
              <Trash2 size={16} className="mr-1.5" />
              {saving ? 'Eliminando...' : 'Eliminar proyecto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;