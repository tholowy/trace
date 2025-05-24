// Modificaciones para tu ProjectSettingsPage.tsx

import { type FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2, Globe, Eye } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { publicationService } from '../../services/publicationService';
import type { Project, PublicSite } from '../../types';

const ProjectSettingsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [publicSite, setPublicSite] = useState<PublicSite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    slug: string;
    is_public: boolean;
    // Configuración básica del sitio público
    site_name: string;
    site_description: string;
  }>({
    name: '',
    description: '',
    slug: '',
    is_public: false,
    site_name: '',
    site_description: '',
  });

  useEffect(() => {
    async function fetchProjectData() {
      if (!projectId) return;

      try {
        setLoading(true);

        // Obtener proyecto
        const { data: projectData, error: projectError } = await projectService.getProjectById(projectId);
        if (projectError) throw projectError;
        if (!projectData) throw new Error('Proyecto no encontrado');

        setProject(projectData);

        // Si el proyecto es público, intentar obtener configuración del sitio
        let siteData = null;
        if (projectData.is_public) {
          const { data: siteResult } = await publicationService.getPublicSite(projectId);
          siteData = siteResult;
          setPublicSite(siteData);
        }

        setFormData({
          name: projectData.name,
          description: projectData.description || '',
          slug: projectData.slug,
          is_public: projectData.is_public,
          site_name: siteData?.site_name || projectData.name,
          site_description: siteData?.description || projectData.description || '',
        });
      } catch (err: any) {
        setError('Error al cargar el proyecto: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
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

      // 1. Actualizar proyecto
      const { data: updatedProject, error: projectError } = await projectService.updateProject(projectId, {
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
        is_public: formData.is_public,
      });

      if (projectError) throw projectError;
      setProject(updatedProject);

      // 2. Si se marcó como público, crear/actualizar configuración del sitio
      if (formData.is_public) {
        const siteConfig = {
          site_name: formData.site_name,
          description: formData.site_description,
          navigation_style: 'sidebar' as const,
          show_search: true,
          show_breadcrumbs: true,
          is_active: true,
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
        };

        const { data: siteData, error: siteError } = await publicationService.createOrUpdatePublicSite(
          projectId,
          siteConfig
        );

        if (siteError) throw siteError;
        setPublicSite(siteData);
      } else if (!formData.is_public && publicSite) {
        // Si se desmarcó como público, desactivar el sitio
        await publicationService.createOrUpdatePublicSite(projectId, { is_active: false });
        setPublicSite(null);
      }

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
          <Save size={20} className="mr-2" />
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
                  className="form-input"
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
                  className="form-input min-h-[80px]"
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
                  className="form-input"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta será la URL para acceder al proyecto: /p/{formData.slug}
                </p>
              </div>

              <div className="mb-6 p-4 border border-border rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    id="is_public"
                    name="is_public"
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary border-border rounded focus:ring-primary bg-background"
                  />
                  <label htmlFor="is_public" className="ml-2 text-sm font-medium text-foreground flex items-center">
                    <Globe size={16} className="mr-1" />
                    Proyecto público
                  </label>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  Si está marcado, cualquiera con el enlace podrá ver la documentación.
                  {formData.is_public && (
                    <span className="block mt-1 text-primary">
                      URL pública: /docs/{formData.slug}
                    </span>
                  )}
                </p>

                {/* Configuración adicional del sitio público */}
                {formData.is_public && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <h3 className="text-sm font-medium text-foreground">Configuración del sitio público</h3>
                    
                    <div>
                      <label htmlFor="site_name" className="block mb-1 text-sm font-medium text-muted-foreground">
                        Nombre del sitio público
                      </label>
                      <input
                        id="site_name"
                        name="site_name"
                        type="text"
                        value={formData.site_name}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={formData.name}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Aparecerá como título en el sitio público
                      </p>
                    </div>

                    <div>
                      <label htmlFor="site_description" className="block mb-1 text-sm font-medium text-muted-foreground">
                        Descripción del sitio
                      </label>
                      <textarea
                        id="site_description"
                        name="site_description"
                        value={formData.site_description}
                        onChange={handleChange}
                        className="form-input min-h-[60px]"
                        rows={2}
                        placeholder={formData.description}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="space-y-6">
          {/* Vista previa del sitio público */}
          {formData.is_public && (
            <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
              <h2 className="text-lg font-medium mb-4 text-card-foreground flex items-center">
                <Eye size={20} className="mr-2" />
                Sitio público
              </h2>
              
              <p className="text-muted-foreground mb-4 text-sm">
                Tu documentación está disponible públicamente
              </p>

              <a
                href={`/docs/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center"
              >
                <Globe size={16} className="mr-1.5" />
                Ver sitio público
              </a>
            </div>
          )}

          {/* Zona de peligro */}
          <div className="bg-card rounded-lg shadow-sm p-6 border border-destructive/40">
            <h2 className="text-lg font-medium mb-4 text-destructive flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Zona de peligro
            </h2>

            <p className="text-muted-foreground mb-4 text-sm">
              Las acciones a continuación son destructivas y no se pueden deshacer.
            </p>

            <button
              onClick={handleDeleteProject}
              className="w-full btn-primary bg-destructive hover:bg-destructive/90"
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