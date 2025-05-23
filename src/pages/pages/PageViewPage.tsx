import { useState, useEffect, type FC } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pageService } from '../../services/pageService';
import {
  Pencil,
  Clock,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  History,
  Share,
  MoreHorizontal,
  Copy,
  Move,
  Trash2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewer from '../../components/documents/DocumentViewer';
import VersionSelector from '../../components/versions/VersionSelector';
import type { Page, NavigationContext } from '../../types';

const PageViewPage: FC = () => {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<Page | null>(null);
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);

  // Cargar página y contexto de navegación
  useEffect(() => {
    async function fetchPageData() {
      if (!pageId) return;

      try {
        setLoading(true);
        setError(null);

        // Cargar página
        const { data: pageData, error: pageError } = await pageService.getPageById(pageId);
        if (pageError) throw pageError;
        setPage(pageData);

        // Cargar contexto de navegación
        const { data: navData, error: navError } = await pageService.getNavigationContext(pageId);
        if (navError) throw navError;
        setNavigationContext(navData);

        // Registrar vista
        await pageService.recordPageView(pageId, {
          user_agent: navigator.userAgent,
          referrer: document.referrer
        });

      } catch (err: any) {
        setError('Error al cargar la página: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPageData();
  }, [pageId]);

  // Función para cambiar estado de publicación
  const togglePublished = async () => {
    if (!page || !pageId) return;

    try {
      setPublishing(true);

      const { data, error } = await pageService.updatePage(pageId, {
        is_published: !page.is_published
      });

      if (error) throw error;
      setPage(data);
    } catch (err: any) {
      setError(`Error al ${page.is_published ? 'despublicar' : 'publicar'} la página: ` + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Manejar acciones del menú
  const handleAction = async (action: string) => {
    if (!page) return;

    setShowActionsMenu(false);

    switch (action) {
      case 'duplicate':
        try {
          const { data: duplicated } = await pageService.duplicatePage(page.id, {
            new_title: `${page.title} (Copia)`
          });
          if (duplicated) {
            navigate(`/projects/${projectId}/pages/${duplicated.id}`);
          }
        } catch (err: any) {
          setError('Error al duplicar la página: ' + err.message);
        }
        break;

      case 'move':
        // Implementar modal de mover página
        console.log('Mover página');
        break;

      case 'delete':
        if (window.confirm(`¿Estás seguro de eliminar "${page.title}"?`)) {
          try {
            await pageService.deletePage(page.id);
            navigate(`/projects/${projectId}`);
          } catch (err: any) {
            setError('Error al eliminar la página: ' + err.message);
          }
        }
        break;

      case 'share':
        // Implementar modal de compartir
        console.log('Compartir página');
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando página...</span>
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

  if (!page) {
    return <div className="p-4 text-muted-foreground">Página no encontrada</div>;
  }

  // Formatear fecha de actualización
  const formattedDate = page.updated_at
    ? format(new Date(page.updated_at), 'dd MMMM yyyy', { locale: es })
    : '';

  // Determinar nombre del editor
  const editorName = page.updated_by_user?.user_profiles?.[0]
    ? `${page.updated_by_user.user_profiles[0].first_name} ${page.updated_by_user.user_profiles[0].last_name}`
    : page.updated_by_user?.email || 'Usuario desconocido';

  return (
    <div className="max-w-screen-xl mx-auto p-6 bg-background text-foreground">
      {/* Breadcrumbs */}
      {navigationContext?.breadcrumbs && navigationContext.breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          <Link
            to={`/projects/${projectId}`}
            className="hover:text-primary"
          >
            {navigationContext.project.name}
          </Link>
          {navigationContext.breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center">
              <ChevronRight size={16} className="mx-1" />
              {index === navigationContext.breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  to={`/projects/${projectId}/pages/${crumb.id}`}
                  className="hover:text-primary"
                >
                  {crumb.title}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header de la página */}
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Metadata - SIN TIPO DE PÁGINA */}
          <div className="flex items-center text-sm text-muted-foreground space-x-4">
            <div className="flex items-center">
              <Calendar size={16} className="mr-1" />
              <span>Actualizado el {formattedDate}</span>
            </div>
            <div className="flex items-center">
              <Pencil size={16} className="mr-1" />
              <span>Por {editorName}</span>
            </div>
            {/* Información adicional sobre subpáginas */}
            {page.has_subpage_blocks && (
              <div className="flex items-center">
                <FileText size={16} className="mr-1" />
                <span>Contiene subpáginas</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-2">
            {/* Selector de versión */}
            <VersionSelector
              projectId={projectId!}
              showDrafts={true}
            />

            {/* Botón de historial */}
            <Link
              to={`/projects/${projectId}/versions`}
              className="btn-secondary flex items-center"
            >
              <History size={16} className="mr-1.5" />
              Historial
            </Link>

            {/* Botón de publicar/despublicar */}
            <button
              onClick={togglePublished}
              className={`${
                page.is_published
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'bg-success/10 text-success hover:bg-success/20'
              } px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-200`}
              disabled={publishing}
            >
              {page.is_published ? (
                <>
                  <EyeOff size={16} className="mr-1.5" />
                  {publishing ? 'Despublicando...' : 'Despublicar'}
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-1.5" />
                  {publishing ? 'Publicando...' : 'Publicar'}
                </>
              )}
            </button>

            {/* Botón de editar */}
            <Link
              to={`/projects/${projectId}/pages/${pageId}/edit`}
              className="btn-primary flex items-center"
            >
              <Pencil size={16} className="mr-1.5" />
              Editar
            </Link>

            {/* Menú de acciones */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="btn-ghost p-2"
              >
                <MoreHorizontal size={16} />
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleAction('duplicate')}
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground flex items-center transition-colors"
                    >
                      <Copy size={14} className="mr-2" />
                      Duplicar página
                    </button>

                    <button
                      onClick={() => handleAction('move')}
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground flex items-center transition-colors"
                    >
                      <Move size={14} className="mr-2" />
                      Mover página
                    </button>

                    <button
                      onClick={() => handleAction('share')}
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground flex items-center transition-colors"
                    >
                      <Share size={14} className="mr-2" />
                      Compartir
                    </button>

                    <hr className="my-1 border-border" />

                    <button
                      onClick={() => handleAction('delete')}
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center transition-colors"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Eliminar página
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Título y descripción */}
        <div className="flex items-start space-x-3 mb-4">
          {page.icon && (
            <span className="text-2xl">{page.icon}</span>
          )}
          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {page.title}
            </h1>

            {page.description && (
              <p className="text-muted-foreground mb-4">
                {page.description}
              </p>
            )}

            {/* Indicadores de estado - SIN TIPO DE PÁGINA */}
            <div className="flex items-center space-x-2">
              {!page.is_published && (
                <span className="px-2 py-1 bg-warning/10 text-warning-foreground text-xs rounded-full">
                  Borrador
                </span>
              )}

              {/* Nuevo indicador para sistema simplificado */}
              <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs rounded-full flex items-center">
                <FileText size={12} className="mr-1" />
                Página
              </span>

              {/* Indicador si tiene subpáginas */}
              {page.has_subpage_blocks && (
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                  Con subpáginas
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido de la página */}
      {page.content && (
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <DocumentViewer content={page.content} />
        </div>
      )}

      {/* Mostrar páginas hijas SIEMPRE (ya no depende del tipo) */}
      <ChildPagesSection projectId={projectId!} parentPageId={pageId!} />

      {/* Navegación entre páginas hermanas */}
      {navigationContext && (navigationContext.previous_page || navigationContext.next_page) && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex justify-between">
            {navigationContext.previous_page ? (
              <Link
                to={`/projects/${projectId}/pages/${navigationContext.previous_page.id}`}
                className="flex items-center text-link hover:text-link-hover"
              >
                <ChevronRight size={16} className="mr-1 rotate-180" />
                <div>
                  <div className="text-sm text-muted-foreground">Anterior</div>
                  <div className="font-medium">{navigationContext.previous_page.title}</div>
                </div>
              </Link>
            ) : <div />}

            {navigationContext.next_page && (
              <Link
                to={`/projects/${projectId}/pages/${navigationContext.next_page.id}`}
                className="flex items-center text-link hover:text-link-hover text-right"
              >
                <div>
                  <div className="text-sm text-muted-foreground">Siguiente</div>
                  <div className="font-medium">{navigationContext.next_page.title}</div>
                </div>
                <ChevronRight size={16} className="ml-1" />
              </Link>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Componente para mostrar páginas hijas - SIMPLIFICADO
interface ChildPagesSectionProps {
  projectId: string;
  parentPageId: string;
}

const ChildPagesSection: React.FC<ChildPagesSectionProps> = ({ projectId, parentPageId }) => {
  const [childPages, setChildPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChildPages() {
      try {
        const { data } = await pageService.getPages(projectId);
        const children = data?.filter(page => page.parent_page_id === parentPageId) || [];
        setChildPages(children);
      } catch (error) {
        console.error('Error loading child pages:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChildPages();
  }, [projectId, parentPageId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando subpáginas...</span>
      </div>
    );
  }

  if (childPages.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg shadow-sm p-6 mt-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Subpáginas Jerárquicas
      </h2>
      
      <p className="text-sm text-muted-foreground mb-4">
        Estas son las páginas que tienen esta página como padre en la jerarquía.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {childPages.map(page => (
          <Link
            key={page.id}
            to={`/projects/${projectId}/pages/${page.id}`}
            className="p-4 border border-border rounded-lg hover:shadow-md hover:border-primary transition-all bg-background"
          >
            <div className="flex items-start space-x-3">
              {page.icon && (
                <span className="text-lg">{page.icon}</span>
              )}
              <div className="flex-grow min-w-0">
                <h3 className="font-medium text-foreground mb-1 truncate">
                  {page.title}
                </h3>

                {page.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {page.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center">
                    <FileText size={12} className="mr-1" />
                    Página
                  </span>

                  <div className="flex items-center space-x-1">
                    {!page.is_published && (
                      <span className="text-xs px-2 py-0.5 bg-warning/10 text-warning-foreground rounded">
                        Borrador
                      </span>
                    )}
                    
                    {page.has_subpage_blocks && (
                      <span className="text-xs px-2 py-0.5 bg-green/10 text-green-foreground rounded">
                        Con subpáginas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PageViewPage;