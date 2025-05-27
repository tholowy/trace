import { useState, useEffect, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Folder, Users, Calendar, MoreHorizontal, Pencil, Trash2, FileText, Layers, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { projectService } from '../../services/projectService';
import { pageService } from '../../services/pageService';
import { versionService } from '../../services/versionService';
import type { Project, ProjectStats } from '../../types';

const ProjectsPage: FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await projectService.getProjects();

      if (error) throw error;

      const projectsData = data || [];
      setProjects(projectsData);

      // Load stats for each project
      if (projectsData.length > 0) {
        await loadProjectsStats(projectsData);
      }
    } catch (err: any) {
      setError('Error al cargar proyectos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsStats = async (projectsList: Project[]) => {
    try {
      setLoadingStats(true);

      const statsPromises = projectsList.map(async (project) => {
        try {
          // Get project pages
          const { data: pagesData } = await pageService.getPages(project.id);
          const pagesCount = pagesData?.length || 0;
          const publishedPagesCount = pagesData?.filter(p => p.is_published).length || 0;

          // Get project versions
          const { data: versionsData } = await versionService.getProjectVersions(project.id);
          const versionsCount = versionsData?.length || 0;

          // Get project members
          const { data: membersData } = await projectService.getProjectMembers(project.id);
          const membersCount = membersData?.length || 0;

          // Find the last page update
          const lastPageUpdate = pagesData && pagesData.length > 0
            ? pagesData.reduce((latest, page) =>
                new Date(page.updated_at) > new Date(latest.updated_at) ? page : latest
              ).updated_at
            : undefined;

          return {
            id: project.id,
            name: project.name,
            slug: project.slug,
            is_public: project.is_public,
            created_at: project.created_at,
            updated_at: project.updated_at,
            members_count: membersCount,
            pages_count: pagesCount,
            versions_count: versionsCount,
            published_pages_count: publishedPagesCount,
            last_page_update: lastPageUpdate
          } as ProjectStats;
        } catch (error) {
          console.error(`Error loading stats for project ${project.id}:`, error);
          // Return default stats in case of error
          return {
            id: project.id,
            name: project.name,
            slug: project.slug,
            is_public: project.is_public,
            created_at: project.created_at,
            updated_at: project.updated_at,
            members_count: 0,
            pages_count: 0,
            versions_count: 1, // At least the initial version
            published_pages_count: 0
          } as ProjectStats;
        }
      });

      const stats = await Promise.all(statsPromises);
      setProjectsStats(stats);
    } catch (error) {
      console.error('Error loading projects stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const project = projects.find(p => p.id === id);
    const projectStats = projectsStats.find(s => s.id === id);

    const confirmMessage = projectStats && projectStats.pages_count > 0
      ? `¿Estás seguro de eliminar "${project?.name}"? Esta acción eliminará ${projectStats.pages_count} páginas y ${projectStats.versions_count} versiones. Esta acción no se puede deshacer.`
      : `¿Estás seguro de eliminar "${project?.name}"? Esta acción no se puede deshacer.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await projectService.deleteProject(id);

      if (error) throw error;

      setProjects(projects.filter(project => project.id !== id));
      setProjectsStats(projectsStats.filter(stats => stats.id !== id));
    } catch (err: any) {
      setError('Error al eliminar proyecto: ' + err.message);
    }
  };

  const getProjectStats = (projectId: string) => {
    return projectsStats.find(stats => stats.id === projectId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando proyectos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive-foreground">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-2 text-sm text-destructive-foreground hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus proyectos de documentación con páginas y versiones
          </p>
        </div>
        <Link
          to="/projects/new"
          className="btn-primary flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Nuevo Proyecto
        </Link>
      </div>

      {/* General Stats */}
      {projectsStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
            <div className="text-2xl font-bold text-primary">
              {projects.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Proyectos totales
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
            <div className="text-2xl font-bold text-accent">
              {projectsStats.reduce((sum, stats) => sum + stats.pages_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Páginas totales
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
            <div className="text-2xl font-bold text-primary">
              {projectsStats.reduce((sum, stats) => sum + stats.versions_count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Versiones totales
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
            <div className="text-2xl font-bold text-secondary-foreground">
              {projects.filter(p => p.is_public).length}
            </div>
            <div className="text-sm text-muted-foreground">
              Proyectos públicos
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-lg shadow-sm">
          <Folder size={64} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No hay proyectos</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primer proyecto para comenzar a documentar.
          </p>
          <Link to="/projects/new" className="btn-primary inline-flex items-center">
            <Plus size={16} className="mr-2" />
            Nuevo Proyecto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map(project => {
        const stats = getProjectStats(project.id);
        return (
          <div
            key={project.id}
            className="group bg-card rounded-lg shadow-sm border border-border hover:shadow-md transition p-5 flex flex-col justify-between cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
            tabIndex={0}
            role="button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate(`/projects/${project.id}`);
              }
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Folder size={20} className="text-primary" />
                  <span className="font-semibold text-lg">{project.name}</span>
                  {project.is_public && (
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">Público</span>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Link
                    to={`/projects/${project.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={e => handleDeleteProject(project.id, e)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                  <Link
                    to={`/projects/${project.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-accent"
                    title="Ver"
                  >
                    <Eye size={16} />
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users size={14} className="mr-1" />
                  {stats?.members_count ?? 0} miembros
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText size={14} className="mr-1" />
                  {stats?.pages_count ?? 0} páginas
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Layers size={14} className="mr-1" />
                  {stats?.versions_count ?? 1} versiones
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText size={14} className="mr-1" />
                  {stats?.published_pages_count ?? 0} publicadas
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                Creado: {format(new Date(project.created_at), "dd MMM yyyy", { locale: es })}
              </div>
              {stats?.last_page_update && (
                <div className="flex items-center gap-1">
                  <MoreHorizontal size={12} />
                  Última actualización: {format(new Date(stats.last_page_update), "dd MMM yyyy", { locale: es })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
      )}
    </div>
  );
};

export default ProjectsPage;