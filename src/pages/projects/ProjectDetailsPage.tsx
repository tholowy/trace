import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, File, FileText } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { pageService } from '../../services/pageService';
import type { Page, Project } from '../../types';

const ProjectDetailsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    async function fetchProjectData() {
      if (typeof projectId !== 'string') return;
      try {
        setLoading(true);
        // Cargar proyecto
        const { data: projectData, error: projectError } = await projectService.getProjectById(projectId);
        if (projectError) throw projectError;
        setProject(projectData);

        // Cargar todas las páginas del proyecto (sin categorías)
        const { data: pagesData, error: pagesError } = await pageService.getPages(projectId, false);
        if (pagesError) throw pagesError;
        setPages(pagesData || []);
      } catch (err: any) {
        setError(`Error al cargar datos del proyecto: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchProjectData();
  }, [projectId]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && !project) {
    return (
      <div className="flex justify-center items-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando proyecto...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-lg">
        {error}
      </div>
    );
  }

  if (!project) {
    return <div className="p-4 text-muted-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto p-6 bg-background text-foreground">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold mr-3">
              {project.name}
            </h1>
            {project.is_public && (
              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                Público
              </span>
            )}
          </div>
          <Link
            to={`/projects/${projectId}/pages/new`}
            className="btn-primary flex items-center"
          >
            <Plus size={16} className="mr-1.5" />
            Nueva página
          </Link>
        </div>
        {project.description && (
          <p className="text-muted-foreground mb-4">
            {project.description}
          </p>
        )}
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Última actualización: {formatDate(project.updated_at)}</span>
        </div>
      </div>
      {/* Lista de páginas */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <span>Páginas</span>
            </h3>
            <Link
              to={`/projects/${projectId}/pages/new`}
              className="btn-secondary inline-flex items-center"
            >
              <Plus size={14} className="mr-1" />
              Nueva página
            </Link>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Cargando páginas...
            </div>
          ) : pages.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">
                No hay páginas
              </h4>
              <p className="text-muted-foreground mb-4">
                No hay páginas en este proyecto
              </p>
              <Link
                to={`/projects/${projectId}/pages/new`}
                className="btn-primary inline-flex items-center"
              >
                <Plus size={16} className="mr-1.5" />
                Crear primera página
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pages.map(page => (
                <Link
                  key={page.id}
                  to={`/projects/${projectId}/pages/${page.id}`}
                  className="p-4 hover:bg-accent/50 rounded-lg transition-colors flex items-start border border-border hover:border-primary"
                >
                  <div className="w-12 h-12 flex-shrink-0 bg-secondary rounded-lg flex items-center justify-center mr-4">
                    <File size={20} className="text-primary" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {page.title}
                      </h4>
                      {page.is_published && (
                        <span className="ml-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full flex-shrink-0">
                          Publicado
                        </span>
                      )}
                    </div>
                    {page.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {page.description}
                      </p>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>Actualizado: {formatDate(page.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;