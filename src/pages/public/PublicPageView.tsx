import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Home, 
  ChevronRight, 
  Calendar, 
  Clock,
  Eye,
  FileText,
  ArrowLeft,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { pageService } from '../../services/pageService';
import DocumentViewer from '../../components/documents/DocumentViewer';
import type { 
  PublicSite, 
  ProjectVersion, 
  Page,
  PageTreeNode,
  NavigationContext, 
  BreadcrumbItem
} from '../../types';
import { supabase } from '../../lib/supabase';

const PublicPageView: FC = () => {
  const { projectSlug, versionNumber, token, '*': pagePath } = useParams<{ 
    projectSlug?: string; 
    versionNumber?: string;
    token?: string;
    '*': string;
  }>();
  
  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar página pública
  useEffect(() => {
    async function loadPublicPage() {
      try {
        setLoading(true);
        setError(null);
        
        let pageData = null;
        let siteData = null;
        let projectData = null;
        let versionData = null;
        
        if (token) {
          // Acceso por token
          const { data: tokenData, error: tokenError } = await publicationService.validateAccessToken(token);
          
          if (tokenError || !tokenData?.is_valid) {
            throw new Error('Token de acceso inválido o expirado');
          }
          
          if (tokenData.content_type === 'page') {
            pageData = tokenData.content;
            // Cargar datos del proyecto y sitio
            const { data: siteInfo } = await publicationService.getPublicSite(tokenData.content.project_id);
            siteData = siteInfo;
            projectData = siteInfo?.project;
          } else {
            throw new Error('Token no válido para página');
          }
        } else if (projectSlug && pagePath) {
          // Acceso público por slug y ruta
          const { data: publicContent, error: contentError } = await publicationService.getPublicPageContent(
            projectSlug,
            pagePath,
            versionNumber
          );
          
          if (contentError) throw contentError;
          
          pageData = publicContent!.page;
          siteData = publicContent!.site;
          projectData = publicContent!.project;
          versionData = publicContent!.version;
        } else {
          throw new Error('No se especificaron parámetros válidos');
        }
        
        // Verificar que la página esté publicada (excepto si es acceso por token autorizado)
        if (!token && pageData && !pageData.is_published) {
          throw new Error('Esta página no está disponible públicamente');
        }
        
        setPage(pageData);
        setSite(siteData);
        setProject(projectData);
        setVersion(versionData);
        
        // Cargar contexto de navegación con páginas publicadas únicamente
        if (pageData?.id) {
          const { data: navContext } = await getPublicNavigationContext(pageData.id, projectData.id);
          setNavigationContext(navContext);
        }
        
        // Registrar vista
        if (pageData?.id) {
          await pageService.recordPageView(pageData.id, {
            user_agent: navigator.userAgent,
            referrer: document.referrer
          });
        }
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadPublicPage();
  }, [projectSlug, versionNumber, pagePath, token]);
  
  // Función para obtener contexto de navegación solo con páginas publicadas
  const getPublicNavigationContext = async (pageId: string, projectId: string) => {
    try {
      // Obtener página actual
      const { data: currentPage } = await pageService.getPageById(pageId);
      
      // Obtener páginas publicadas del proyecto
      const { data: publishedPages } = await pageService.getPublishedPages(projectId);
      
      if (!currentPage || !publishedPages) return { data: null };
      
      // Generar breadcrumbs solo con páginas publicadas
      const breadcrumbs = await generatePublicBreadcrumbs(pageId, publishedPages);
      
      // Obtener páginas hermanas publicadas
      const siblings = publishedPages.filter(p => 
        p.parent_page_id === currentPage.parent_page_id && p.id !== pageId
      ).sort((a, b) => a.order_index - b.order_index);
      
      // Encontrar página anterior y siguiente
      const currentIndex = siblings.findIndex(p => p.id === pageId);
      const previousPage = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
      const nextPage = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;
      
      // Obtener información del proyecto
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      const navigationContext: NavigationContext = {
        current_page: currentPage,
        breadcrumbs: breadcrumbs,
        tree_children: [],
        content_children: [],
        siblings: siblings,
        previous_page: previousPage,
        next_page: nextPage,
        project: project!
      };
      
      return { data: navigationContext };
    } catch (error) {
      console.error('Error getting public navigation context:', error);
      return { data: null };
    }
  };
  
  // Función para generar breadcrumbs solo con páginas publicadas
  const generatePublicBreadcrumbs = async (pageId: string, publishedPages: Page[]) => {
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPageId: string | null = pageId;
    let level = 0;
    
    while (currentPageId) {
      const page = publishedPages.find(p => p.id === currentPageId);
      if (!page) break;
      
      // Generar la ruta hasta esta página
      const path = await generatePublicPagePath(page.id, publishedPages);
      
      breadcrumbs.unshift({
        id: page.id,
        title: page.title,
        slug: page.slug,
        path: path,
        level: level
      });
      
      currentPageId = page.parent_page_id || null;
      level++;
    }
    
    return breadcrumbs;
  };
  
  // Función para generar ruta de página considerando solo páginas publicadas
  const generatePublicPagePath = async (pageId: string, publishedPages: Page[]) => {
    const pathSegments: string[] = [];
    let currentPageId: string | null = pageId;
    
    while (currentPageId) {
      const page = publishedPages.find(p => p.id === currentPageId);
      if (!page) break;
      
      pathSegments.unshift(page.slug);
      currentPageId = page.parent_page_id || null;
    }
    
    return '/' + pathSegments.join('/');
  };
  
  // Generar URL base para navegación
  const getBaseUrl = () => {
    if (token) {
      return `/public/page/${token}`;
    }
    return `/docs/${projectSlug}${version ? `/${version.version_number}` : ''}`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-8 max-w-md">
            <AlertTriangle size={48} className="text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Página no disponible
            </h2>
            <p className="text-destructive/80 mb-4">
              {error}
            </p>
            <Link 
              to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
              className="inline-flex items-center text-destructive hover:text-destructive/80 font-medium"
            >
              <ArrowLeft size={16} className="mr-1" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!site || !project || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Contenido no disponible
          </h2>
          <p className="text-muted-foreground">
            La página solicitada no está disponible
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-background"
      style={{ 
        '--primary-color': site.primary_color || '#3B82F6',
        '--secondary-color': site.secondary_color || '#6B7280' 
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="site-header bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to={getBaseUrl()}
              className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
            >
              {site.logo_url ? (
                <img 
                  src={site.logo_url} 
                  alt={site.site_name}
                  className="h-8 w-8 rounded"
                />
              ) : (
                <FileText size={24} className="text-primary" />
              )}
              
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {site.site_name}
                </h1>
                {site.description && (
                  <p className="text-sm text-muted-foreground">
                    {site.description}
                  </p>
                )}
              </div>
            </Link>
            
            {/* Información de versión */}
            {version && (
              <div className="text-sm text-muted-foreground">
                Versión {version.version_number}
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="site-content">
        <div className="container mx-auto px-6 py-8 max-w-screen-xl">
          {/* Breadcrumbs */}
          {site.show_breadcrumbs && navigationContext?.breadcrumbs && (
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
              <Link 
                to={getBaseUrl()}
                className="hover:text-primary flex items-center transition-colors"
              >
                <Home size={14} className="mr-1" />
                {site.site_name}
              </Link>
              
              {navigationContext.breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center">
                  <ChevronRight size={14} className="mx-1" />
                  {index === navigationContext.breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">
                      {crumb.title}
                    </span>
                  ) : (
                    <Link
                      to={`${getBaseUrl()}${crumb.path}`}
                      className="hover:text-primary transition-colors"
                    >
                      {crumb.title}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          )}
          
          {/* Contenido de la página */}
          <article className="page-content max-w-4xl">
            {/* Header de la página */}
            <header className="mb-8">
              <div className="flex items-start space-x-3 mb-4">
                {page.icon && (
                  <span className="text-2xl">{page.icon}</span>
                )}
                <div className="flex-grow">
                  <h1 className="page-title text-3xl font-bold text-foreground mb-2">
                    {page.title}
                  </h1>
                  
                  {page.description && (
                    <p className="text-lg text-muted-foreground mb-4">
                      {page.description}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      <span>
                        Actualizado el {new Date(page.updated_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Eye size={14} className="mr-1" />
                      <span>Página pública</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Indicadores de estado */}
              <div className="flex items-center space-x-2 mb-4">
                <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full flex items-center">
                  <Eye size={12} className="mr-1" />
                  Publicada
                </span>
                
                <span className="px-2 py-1 bg-accent/30 text-accent-foreground text-xs rounded-full flex items-center">
                  <FileText size={12} className="mr-1" />
                  Página
                </span>
              </div>
            </header>
            
            {/* Contenido */}
            {page.content && (
              <div className="bg-card rounded-lg shadow-sm p-8 mb-8 border border-border">
                <DocumentViewer content={page.content} />
              </div>
            )}
            
            {/* Navegación entre páginas hermanas */}
            {navigationContext && (navigationContext.previous_page || navigationContext.next_page) && (
              <nav className="mt-12 pt-8 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {navigationContext.previous_page ? (
                    <Link
                      to={`${getBaseUrl()}${navigationContext.previous_page.path || '/' + navigationContext.previous_page.slug}`}
                      className="flex items-center p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all group"
                    >
                      <ArrowLeft size={20} className="mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="min-w-0">
                        <div className="text-sm text-muted-foreground">Anterior</div>
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {navigationContext.previous_page.title}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div /> // Espacio vacío para mantener la grilla
                  )}
                  
                  {navigationContext.next_page && (
                    <Link
                      to={`${getBaseUrl()}${navigationContext.next_page.path || '/' + navigationContext.next_page.slug}`}
                      className="flex items-center justify-end p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-right group"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-muted-foreground">Siguiente</div>
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {navigationContext.next_page.title}
                        </div>
                      </div>
                      <ArrowRight size={20} className="ml-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </article>
        </div>
      </main>
      
      {/* Footer */}
      {site.footer_text && (
        <footer className="site-footer bg-card border-t border-border py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {site.footer_text}
            </p>
          </div>
        </footer>
      )}
      
      {/* CSS personalizado */}
      {site.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: site.custom_css }} />
      )}
    </div>
  );
};

export default PublicPageView;