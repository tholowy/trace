import { type FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';
import { projectService } from '../../services/projectService';
import type { Project } from '../../types';

const ProjectSettingsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

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
    is_public: false,
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
          is_public: data.is_public,
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

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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

      // Clear message after 3 seconds
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

    if (
      !window.confirm(
        '¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer y eliminará todos los documentos asociados.'
      )
    ) {
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
    return <div className="flex justify-center p-8 text-muted-foreground">Cargando configuración...</div>;
  }

  if (!project) {
    return <div className="p-4 text-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="p-6 bg-background min-h-screen text-foreground max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Configuración del proyecto</h1>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-md flex items-center">
          <Save size={20} className="mr-2" /> {/* Changed icon to Save for success */}
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Información general */}
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6 border border-border">
            <h2 className="text-lg font-medium mb-4 text-card-foreground">Información general</h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Nombre del proyecto*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input" // Apply custom form-input class
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input min-h-[80px]" // Apply custom form-input and min-height
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="slug" className="block mb-1 text-sm font-medium text-muted-foreground">
                  URL del proyecto (slug)*
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleChange}
                  className="form-input" // Apply custom form-input class
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
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
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary bg-background" // Use primary color for checkbox, adjusted border and bg
                />
                <label htmlFor="is_public" className="ml-2 text-sm font-medium text-muted-foreground">
                  Proyecto público
                </label>
                <p className="text-xs text-muted-foreground ml-2">
                  Si está marcado, cualquiera con el enlace podrá ver la documentación.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary" // Apply custom btn-primary class
                  disabled={saving}
                >
                  <Save size={16} className="mr-1.5" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel lateral */}
        <div>
          {/* Zona de peligro */}
          <div className="bg-card rounded-lg shadow-sm p-6 border border-destructive/40">
            <h2 className="text-lg font-medium mb-4 text-destructive flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Zona de peligro
            </h2>

            <p className="text-muted-foreground mb-4">
              Las acciones a continuación son destructivas y no se pueden deshacer.
            </p>

            <button
              onClick={handleDeleteProject}
              className="w-full btn-primary bg-destructive hover:bg-destructive/90" // Apply btn-primary and override colors for destructive
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