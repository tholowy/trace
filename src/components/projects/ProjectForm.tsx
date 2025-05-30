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

      // Obtener el usuario actual para crear la estructura de carpetas
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Usar la misma estructura que imageService
      const filePath = `${user.id}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentation-images')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentation-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error('Error al subir el logo: ' + errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      let logoUrl = formData.logo_url;

      if (logoFile) {
        logoUrl = await uploadLogo() || '';
      }

      const projectData: any = {
        ...formData,
        logo_url: logoUrl
      };

      if (!isEditing && user) {
        projectData.created_by = user.id;
      }

      let result;

      if (isEditing && projectId) {
        result = await projectService.updateProject(projectId, projectData);
      } else {
        result = await projectService.createProject(projectData);
      }

      const { data, error: submissionError } = result;

      if (submissionError) throw submissionError;

      if (!isEditing && data && user) {
        await projectService.addProjectMember(data.id, user.id, 1);
      }

      if (data) onSuccess(data.id);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError('Error al guardar el proyecto: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4"> {/* Added a max-width container for better readability on large screens */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" /> {/* Slightly more space for the icon */}
          Volver
        </button>
      </div>

      {/* Applied card styling from your design system */}
      <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 sm:p-8 border border-border"> {/* Added border for consistency */}
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          {isEditing ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
        </h1>

        {error && (
          // Applied destructive alert styling
          <div className="mb-4 p-3 bg-destructive text-destructive-foreground rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6"> {/* Added space-y for consistent vertical spacing */}
          <div> {/* Changed from mb-6 to rely on space-y-6 from form */}
            <label className="block text-sm font-medium mb-2 text-foreground">Logo del Proyecto</label> {/* Increased mb for label */}
            <div className="flex flex-col sm:flex-row items-start sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border-light shrink-0"> {/* Added border */}
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload size={32} className="text-muted-foreground" /> /* Slightly larger icon */
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
                  // Applied btn-secondary styling
                  className="btn-secondary cursor-pointer"
                >
                  Seleccionar Imagen
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG o JPG. Máx 2MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5 text-foreground">
              Nombre del Proyecto*
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              // Applied form-input styling
              className="form-input"
              placeholder="Mi Proyecto"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1.5 text-foreground">
              URL del Proyecto (slug)*
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              // Applied form-input styling
              className="form-input"
              placeholder="mi-proyecto"
              required
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Será la URL: /p/{formData.slug || "mi-proyecto"}
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1.5 text-foreground">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              // Applied form-input styling, recommend adding rows and potentially h-auto if h-9 is too restrictive
              className="form-input h-auto" // Allow textarea to respect rows
              rows={4} // Reasonable default height
              placeholder="Describe brevemente tu proyecto..."
            />
          </div>

          <div className="flex items-start"> {/* Changed to items-start for better alignment with multiline text */}
            <input
              id="is_public"
              name="is_public"
              type="checkbox"
              checked={formData.is_public}
              onChange={handleChange}
              // Styled checkbox to use theme colors
              className="h-4 w-4 accent-primary border-input rounded focus:ring-ring mt-0.5 shrink-0"
            />
            <div className="ml-3 text-sm"> {/* Wrapped label and p in a div for better structure */}
              <label htmlFor="is_public" className="font-medium text-foreground">
                Proyecto público
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Si está marcado, cualquiera con el enlace podrá ver la documentación.
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center pt-2 space-x-3"> {/* Added space-x for button spacing */}
            <button
              type="button"
              onClick={onCancel}
              // Applied btn-secondary styling
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              // Applied btn-primary styling
              className="btn-primary"
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