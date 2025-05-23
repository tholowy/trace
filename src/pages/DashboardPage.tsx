import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Clock, FileText, Plus, Layers, TrendingUp } from 'lucide-react';
import { projectService } from '../services/projectService';
import { pageService } from '../services/pageService';
import { versionService } from '../services/versionService';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from '../components/search/GlobalSearch';
import type { Project, Page, ProjectStats } from '../types';

const DashboardPage: FC = () => {
  const { userProfile } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Cargar proyectos recientes
        const { data: projectsData, error: projectsError } = await projectService.getProjects();

        if (projectsError) throw projectsError;

        const projects = projectsData?.slice(0, 4) || [];
        setRecentProjects(projects);

        // Cargar páginas recientes de todos los proyectos
        const allRecentPages: Page[] = [];

        if (projectsData && projectsData.length > 0) {
          // Obtener páginas recientes de cada proyecto
          for (const project of projectsData.slice(0, 3)) { // Solo los primeros 3 proyectos
            try {
              const { data: pagesData } = await pageService.getPages(project.id);
              if (pagesData) {
                // Añadir información del proyecto a cada página
                const pagesWithProject = pagesData
                  .slice(0, 2) // Max 2 páginas por proyecto
                  .map(page => ({
                    ...page,
                    project: {
                      id: project.id,
                      name: project.name,
                      slug: project.slug
                    }
                  }));
                allRecentPages.push(...pagesWithProject);
              }
            } catch (pageError) {
              console.error(`Error loading pages for project ${project.id}:`, pageError);
            }
          }

          // Ordenar por fecha de actualización y tomar los más recientes
          allRecentPages.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          setRecentPages(allRecentPages.slice(0, 5));
        }

        // Cargar estadísticas de proyectos
        if (projectsData) {
          const statsPromises = projects.map(async (project) => {
            try {
              // Obtener conteo de páginas
              const { data: pagesData } = await pageService.getPages(project.id);
              const pagesCount = pagesData?.length || 0;
              const publishedPagesCount = pagesData?.filter(p => p.is_published).length || 0;

              // Obtener conteo de versiones
              const { data: versionsData } = await versionService.getProjectVersions(project.id);
              const versionsCount = versionsData?.length || 0;

              // Obtener conteo de miembros
              const { data: membersData } = await projectService.getProjectMembers(project.id);
              const membersCount = membersData?.length || 0;

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
                last_page_update: pagesData?.[0]?.updated_at
              } as ProjectStats;
            } catch (error) {
              console.error(`Error loading stats for project ${project.id}:`, error);
              return {
                id: project.id,
                name: project.name,
                slug: project.slug,
                is_public: project.is_public,
                created_at: project.created_at,
                updated_at: project.updated_at,
                members_count: 0,
                pages_count: 0,
                versions_count: 0,
                published_pages_count: 0
              } as ProjectStats;
            }
          });

          const stats = await Promise.all(statsPromises);
          setProjectsStats(stats);
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

  const getTotalStats = () => {
    return projectsStats.reduce((acc, project) => ({
      totalPages: acc.totalPages + project.pages_count,
      totalPublished: acc.totalPublished + project.published_pages_count,
      totalVersions: acc.totalVersions + project.versions_count,
      totalMembers: acc.totalMembers + project.members_count
    }), { totalPages: 0, totalPublished: 0, totalVersions: 0, totalMembers: 0 });
  };

  const stats = getTotalStats();

  return (
    <div className="max-w-screen-xl mx-auto p-6 bg-background text-foreground min-h-screen">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Bienvenido, {userProfile?.first_name || 'Usuario'}
        </h1>
        <p className="text-muted-foreground">
          Gestiona y organiza toda tu documentación de proyectos con el nuevo sistema de páginas.
        </p>
      </div>

      {/* --- */}
      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Tarjeta de Total Páginas */}
        <div className="card-item">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText size={20} className="text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Total Páginas</p>
            <p className="text-2xl font-semibold text-foreground">{stats.totalPages}</p>
          </div>
        </div>

        {/* Tarjeta de Publicadas */}
        <div className="card-item">
          <div className="p-2 bg-success/10 rounded-lg">
            <TrendingUp size={20} className="text-success" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Publicadas</p>
            <p className="text-2xl font-semibold text-foreground">{stats.totalPublished}</p>
          </div>
        </div>

        {/* Tarjeta de Versiones */}
        <div className="card-item">
          <div className="p-2 bg-info/10 rounded-lg">
            <Layers size={20} className="text-info" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Versiones</p>
            <p className="text-2xl font-semibold text-foreground">{stats.totalVersions}</p>
          </div>
        </div>

        {/* Tarjeta de Proyectos */}
        <div className="card-item">
          <div className="p-2 bg-warning/10 rounded-lg">
            <Folder size={20} className="text-warning" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Proyectos</p>
            <p className="text-2xl font-semibold text-foreground">{recentProjects.length}</p>
          </div>
        </div>
      </div>

      {/* --- */}
      {/* Búsqueda global */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-8 border border-border">
        <h2 className="text-lg font-semibold mb-4">
          Busca en toda tu documentación
        </h2>
        <div className="flex items-center">
          <GlobalSearch />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive-foreground rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos recientes */}
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Proyectos recientes
            </h2>
            <Link
              to="/projects"
              className="text-link hover:text-link-hover text-sm"
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-4 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              <span>Cargando proyectos...</span>
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map(project => {
                const projectStats = projectsStats.find(s => s.id === project.id);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center p-3 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors border border-border-light"
                  >
                    <div className="w-10 h-10 flex-shrink-0 bg-secondary rounded-md flex items-center justify-center mr-3 overflow-hidden">
                      {project.logo_url ? (
                        <img
                          src={project.logo_url}
                          alt={project.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Folder size={20} className="text-secondary-foreground" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-medium truncate">
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description || 'Sin descripción'}
                      </p>
                      {projectStats && (
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <span>{projectStats.pages_count} páginas</span>
                          <span>•</span>
                          <span>{projectStats.versions_count} versiones</span>
                          {projectStats.members_count > 0 && (
                            <>
                              <span>•</span>
                              <span>{projectStats.members_count} miembros</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Folder size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                No tienes proyectos recientes. ¡Es hora de empezar algo nuevo!
              </p>
              <Link to="/projects/new" className="btn-primary inline-flex items-center">
                <Plus size={16} className="mr-1.5" />
                Crear proyecto
              </Link>
            </div>
          )}
        </div>

        {/* Páginas recientes */}
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Páginas recientes
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-4 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              <span>Cargando páginas...</span>
            </div>
          ) : recentPages.length > 0 ? (
            <div className="space-y-3">
              {recentPages.map(page => (
                <Link
                  key={page.id}
                  to={`/projects/${page.project_id}/pages/${page.id}`}
                  className="flex items-center p-3 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors border border-border-light"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-secondary rounded-md flex items-center justify-center mr-3 overflow-hidden">
                    {page.icon ? (
                      <span className="text-base">{page.icon}</span>
                    ) : (
                      <FileText size={20} className="text-secondary-foreground" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium truncate">
                      {page.title}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="truncate mr-2">
                        {page.project?.name || ''}
                      </span>
                      <span className="mx-1">•</span>
                      <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                        {page.page_type === 'content' ? 'Contenido' :
                         page.page_type === 'container' ? 'Contenedor' : 'Mixta'}
                      </span>
                      <span className="mx-1">•</span>
                      <Clock size={14} className="mr-1" />
                      {formatDate(page.updated_at)}
                    </div>
                  </div>
                  {!page.is_published && (
                    <div className="flex-shrink-0">
                      <span className="px-2 py-1 text-xs bg-warning/10 text-warning-foreground rounded">
                        Borrador
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No tienes páginas recientes. ¡Empieza a crear contenido!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- */}
      {/* Resumen de actividad mejorado */}
      <div className="mt-6 bg-card rounded-lg shadow-md p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">
          Resumen de actividad
        </h2>

        {projectsStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stats-card">
              <div className="text-2xl font-bold text-primary">
                {stats.totalPages}
              </div>
              <div className="text-sm text-muted-foreground">
                Páginas creadas
              </div>
            </div>

            <div className="stats-card">
              <div className="text-2xl font-bold text-success">
                {stats.totalPublished}
              </div>
              <div className="text-sm text-muted-foreground">
                Páginas publicadas
              </div>
            </div>

            <div className="stats-card">
              <div className="text-2xl font-bold text-info">
                {stats.totalVersions}
              </div>
              <div className="text-sm text-muted-foreground">
                Versiones creadas
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-muted-foreground">
              No hay actividad reciente para mostrar. ¡Crea un proyecto para comenzar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;