import { useState, useEffect, type FC } from 'react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProjectFormProps {
  projectId?: string;
  onCancel: () => void;
  onSuccess: (projectId: string) => void;
}

const ProjectForm: FC<ProjectFormProps> = ({ 
  projectId, 
  onCancel,
  onSuccess
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(projectId);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    is_public: false,
    logo_url: ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar proyecto existente si estamos editando
  useEffect(() => {
    async function fetchProject() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const { data, error } = await projectService.getProjectById(projectId);
        
        if (error) throw error;
        
        if (data) {
          setFormData({
            name: data.name,
            description: data.description || '',
            slug: data.slug,
            is_public: data.is_public,
            logo_url: data.logo_url || ''
          });
          
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
        }
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
    
    // Generar slug automáticamente desde el nombre
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
        
      setFormData(prev => ({ ...prev, slug }));
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url;
    
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `project-logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, logoFile);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (err) {
      throw new Error('Error al subir el logo: ' + err);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      let logoUrl = formData.logo_url;
      
      // Subir logo si hay uno nuevo
      if (logoFile) {
        logoUrl = await uploadLogo() || '';
      }
      
      const projectData: any = {
        ...formData,
        logo_url: logoUrl
      };
      
      // Agregar campos adicionales para creación
      if (!isEditing && user) {
        projectData.created_by = user.id;
      }
      
      let result;
      
      if (isEditing && projectId) {
        result = await projectService.updateProject(projectId, projectData);
      } else {
        result = await projectService.createProject(projectData);
      }
      
      const { data, error } = result;
      
      if (error) throw error;
      
      // Si es un nuevo proyecto, agregar al usuario como miembro/admin
      if (!isEditing && data && user) {
        await projectService.addProjectMember(data.id, user.id, 'admin');
      }
      
      if (data) onSuccess(data.id);
    } catch (err: any) {
      setError('Error al guardar el proyecto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          {isEditing ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Logo del Proyecto</label>
            <div className="flex items-start space-x-4">
              <div className="h-24 w-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload size={24} className="text-gray-400" />
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="sr-only"
                />
                <label
                  htmlFor="logo"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                >
                  Seleccionar Imagen
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Formato recomendado: PNG o JPG. Tamaño máximo 2MB.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Nombre del Proyecto*
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Mi Proyecto"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="slug" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              URL del Proyecto (slug)*
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="mi-proyecto"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Esta será la URL para acceder al proyecto: /p/{formData.slug}
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe brevemente el proyecto..."
            />
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
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 mr-2"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
              disabled={loading}
            >
              <Save size={16} className="mr-2" />
              {loading ? 'Guardando...' : 'Guardar Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;