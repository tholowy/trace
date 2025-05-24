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
  ArrowRight
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { pageService } from '../../services/pageService';
import DocumentViewer from '../../components/documents/DocumentViewer';
import type { 
  PublicSite, 
  ProjectVersion, 
  Page,
  PageTreeNode,
  NavigationContext 
} from '../../types';

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
        
        if (token) {
          // Acceso por token
          const { data: tokenData, error: tokenError } = await publicationService.validateAccessToken(token);
          
          if (tokenError || !tokenData?.is_valid) {
            throw new Error('Token de acceso inválido o expirado');
          }
          
          if (tokenData.content_type === 'page') {
            setPage(tokenData.content);
            // Cargar datos del proyecto y sitio
            const { data: siteData } = await publicationService.getPublicSite(tokenData.content.project_id);
            setSite(siteData);
            setProject(siteData?.project);
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
          
          setPage(publicContent!.page);
          setSite(publicContent!.site);
          setProject(publicContent!.project);
          setVersion(publicContent!.version);
        } else {
          throw new Error('No se especificaron parámetros válidos');
        }
        
        // Cargar contexto de navegación
        if (page?.id) {
          const { data: navContext } = await pageService.getNavigationContext(page.id);
          setNavigationContext(navContext);
        }
        
        // Registrar vista
        if (page?.id) {
          await pageService.recordPageView(page.id, {
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
  
  // Generar URL base para navegación
  const getBaseUrl = () => {
    if (token) {
      return `/public/page/${token}`;
    }
    return `/docs/${projectSlug}${version ? `/${version.version_number}` : ''}`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
              Página no encontrada
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error}
            </p>
            <Link 
              to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
              className="inline-flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Contenido no disponible
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            La página solicitada no está disponible
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      style={{ 
        '--primary-color': site.primary_color || '#3B82F6',
        '--secondary-color': site.secondary_color || '#6B7280' 
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="site-header bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                <FileText size={24} className="text-blue-600" style={{ color: 'var(--primary-color)' }} />
              )}
              
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  {site.site_name}
                </h1>
                {site.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {site.description}
                  </p>
                )}
              </div>
            </Link>
            
            {/* Información de versión */}
            {version && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Versión {version.version_number}
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="site-content">
        <div className="container mx-auto px-6 py-8">
          {/* Breadcrumbs */}
          {site.show_breadcrumbs && navigationContext?.breadcrumbs && (
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link 
                to={getBaseUrl()}
                className="hover:text-gray-700 dark:hover:text-gray-300 flex items-center"
              >
                <Home size={14} className="mr-1" />
                {site.site_name}
              </Link>
              
              {navigationContext.breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center">
                  <ChevronRight size={14} className="mx-1" />
                  {index === navigationContext.breadcrumbs.length - 1 ? (
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {crumb.title}
                    </span>
                  ) : (
                    <Link
                      to={`${getBaseUrl()}${crumb.path}`}
                      className="hover:text-gray-700 dark:hover:text-gray-300"
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
                  <h1 className="page-title text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {page.title}
                  </h1>
                  
                  {page.description && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                      {page.description}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      <span>
                        Actualizado el {new Date(page.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Eye size={14} className="mr-1" />
                      <span>Página pública</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            
            {/* Contenido */}
            {page.content && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-8">
                <DocumentViewer content={page.content} />
              </div>
            )}
            
            {/* Navegación entre páginas */}
            {navigationContext && (navigationContext.previous_page || navigationContext.next_page) && (
              <nav className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {navigationContext.previous_page ? (
                    <Link
                      to={`${getBaseUrl()}/${navigationContext.previous_page.slug}`}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                      style={{ '--tw-border-color': 'var(--primary-color)' } as React.CSSProperties}
                    >
                      <ArrowLeft size={20} className="mr-3 text-gray-400" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Anterior</div>
                        <div className="font-medium text-gray-800 dark:text-white truncate">
                          {navigationContext.previous_page.title}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div /> // Espacio vacío para mantener la grilla
                  )}
                  
                  {navigationContext.next_page && (
                    <Link
                      to={`${getBaseUrl()}/${navigationContext.next_page.slug}`}
                      className="flex items-center justify-end p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all text-right"
                      style={{ '--tw-border-color': 'var(--primary-color)' } as React.CSSProperties}
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Siguiente</div>
                        <div className="font-medium text-gray-800 dark:text-white truncate">
                          {navigationContext.next_page.title}
                        </div>
                      </div>
                      <ArrowRight size={20} className="ml-3 text-gray-400" />
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
        <footer className="site-footer bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
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