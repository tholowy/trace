import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Home, 
  GitBranch,
  Calendar,
  FileText,
  Folder,
  Eye,
  ArrowRight,
  Clock,
  User,
  Search,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { publicationService } from '../../services/publicationService';
import { versionService } from '../../services/versionService';
import { pageService } from '../../services/pageService';
import type { 
  PublicSite, 
  ProjectVersion, 
  PageVersion,
  PageTreeNode 
} from '../../types';

const PublicVersionPage: FC = () => {
  const { projectSlug, versionNumber, token } = useParams<{ 
    projectSlug?: string; 
    versionNumber?: string;
    token?: string;
  }>();
  
  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [versionPages, setVersionPages] = useState<PageVersion[]>([]);
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Cargar versión pública
  useEffect(() => {
    async function loadPublicVersion() {
      try {
        setLoading(true);
        setError(null);
        
        if (token) {
          // Acceso por token
          const { data: tokenData, error: tokenError } = await publicationService.validateAccessToken(token);
          
          if (tokenError || !tokenData?.is_valid) {
            throw new Error('Token de acceso inválido o expirado');
          }
          
          if (tokenData.content_type === 'version') {
            setVersion(tokenData.content);
            // Cargar datos del proyecto y sitio
            const { data: siteData } = await publicationService.getPublicSite(tokenData.content.project_id);
            setSite(siteData);
            setProject(siteData?.project);
          } else {
            throw new Error('Token no válido para versión');
          }
        } else if (projectSlug && versionNumber) {
          // Acceso público por slug y versión
          const { data: siteData, error: siteError } = await publicationService.getPublicSiteBySlug(projectSlug);
          
          if (siteError) throw siteError;
          
          setSite(siteData!.site);
          setProject(siteData!.project);
          
          // Buscar la versión específica
          const { data: specificVersion, error: versionError } = await versionService.getVersionByNumber(
            siteData!.project.id, 
            versionNumber
          );
          
          if (versionError) throw versionError;
          setVersion(specificVersion);
        } else {
          throw new Error('No se especificaron parámetros válidos');
        }
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadPublicVersion();
  }, [projectSlug, versionNumber, token]);
  
  // Cargar páginas cuando tengamos la versión
  useEffect(() => {
    async function loadVersionContent() {
      if (!version || !project) return;
      
      try {
        // Cargar páginas de la versión
        const { data: pagesData, error: pagesError } = await versionService.getVersionPages(version.id);
        if (pagesError) throw pagesError;
        setVersionPages(pagesData || []);
        
        // Cargar árbol de páginas de la versión
        const { data: treeData } = await pageService.getPageTree(project.id, version.id);
        setPageTree(treeData || []);
        
        // Expandir nodos de primer nivel
        const rootIds = new Set((treeData || []).map(node => node.id));
        setExpandedNodes(rootIds);
        
      } catch (err: any) {
        setError('Error al cargar contenido de la versión: ' + err.message);
      }
    }
    
    loadVersionContent();
  }, [version, project]);
  
  // Generar URL base para navegación
  const getBaseUrl = () => {
    if (token) {
      return `/public/version/${token}`;
    }
    return `/docs/${projectSlug}/${versionNumber}`;
  };
  
  // Navegar a página específica en esta versión
  const navigateToPage = (page: PageVersion | PageTreeNode) => {
    const baseUrl = getBaseUrl();
    // Construir URL para la página específica
    const pageSlug = 'slug' in page ? page.slug : page.page?.slug;
    window.location.href = `${baseUrl}/${pageSlug}`;
  };
  
  // Toggle expansión de nodos
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // Filtrar páginas por búsqueda
  const filteredPages = versionPages.filter(page =>
    !searchTerm || 
    page.title_snapshot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.description_snapshot?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
              Error de acceso
            </h2>
            <p className="text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!site || !project || !version) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Versión no encontrada
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            La versión solicitada no está disponible
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
            <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                    {site.site_name}
                  </h1>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs rounded-full">
                    v{version.version_number}
                  </span>
                </div>
                {site.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {site.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!token && (
                <Link
                  to={`/docs/${projectSlug}`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                >
                  <Home size={16} className="mr-1" />
                  Versión actual
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Breadcrumbs */}
      {site.show_breadcrumbs && (
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="container mx-auto">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Link
                to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
                className="hover:text-gray-700 dark:hover:text-gray-300"
              >
                {project.name}
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-gray-700 dark:text-gray-300">
                Versión {version.version_number}
              </span>
            </div>
          </div>
        </nav>
      )}
      
      {/* Layout principal */}
      <div className="flex">
        {/* Navegación lateral */}
        {(site.navigation_style === 'sidebar' || site.navigation_style === 'both') && (
          <aside className="site-navigation w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen overflow-y-auto">
            <div className="p-6">
              {/* Información de la versión */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <GitBranch size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    Versión {version.version_number}
                  </span>
                </div>
                {version.version_name && (
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    {version.version_name}
                  </p>
                )}
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <Calendar size={12} className="mr-1" />
                  {format(new Date(version.created_at), 'dd MMM yyyy', { locale: es })}
                </div>
              </div>
              
              {/* Buscador */}
              {site.show_search && (
                <div className="mb-6">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar en esta versión..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}
              
              {/* Árbol de páginas de la versión */}
              <nav className="space-y-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Contenido ({versionPages.length} páginas)
                </h3>
                
                {pageTree.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Esta versión no tiene contenido</p>
                  </div>
                ) : (
                  <PageTreeRenderer
                    nodes={pageTree}
                    expandedNodes={expandedNodes}
                    onToggle={toggleNode}
                    onNavigate={navigateToPage}
                    searchTerm={searchTerm}
                  />
                )}
              </nav>
            </div>
          </aside>
        )}
        
        {/* Contenido principal */}
        <main className="site-content flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header de la versión */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {version.version_name || `Versión ${version.version_number}`}
                  </h1>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Creada el {format(new Date(version.created_at), 'dd MMMM yyyy', { locale: es })}
                    </div>
                    
                    {version.published_at && (
                      <div className="flex items-center">
                        <Eye size={16} className="mr-1" />
                        Publicada el {format(new Date(version.published_at), 'dd MMMM yyyy', { locale: es })}
                      </div>
                    )}
                    
                    {version.created_by_user?.user_profiles?.[0] && (
                      <div className="flex items-center">
                        <User size={16} className="mr-1" />
                        Por {version.created_by_user.user_profiles[0].first_name} {version.created_by_user.user_profiles[0].last_name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {versionPages.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    páginas
                  </div>
                </div>
              </div>
              
              {/* Notas de la versión */}
              {version.release_notes && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    Notas de la versión
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {version.release_notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Lista de páginas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Páginas en esta versión
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? (
                      <>
                        <Search size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No se encontraron páginas que coincidan con "{searchTerm}"</p>
                      </>
                    ) : (
                      <>
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Esta versión no contiene páginas</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredPages.map((pageVersion) => (
                    <div 
                      key={pageVersion.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                      onClick={() => navigateToPage(pageVersion)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                            {pageVersion.title_snapshot}
                          </h3>
                          
                          {pageVersion.description_snapshot && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {pageVersion.description_snapshot}
                            </p>
                          )}
                          
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock size={12} className="mr-1" />
                            Snapshot creado el {format(new Date(pageVersion.created_at), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </div>
                        
                        <ArrowRight size={16} className="text-gray-400 mt-1" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      {site.footer_text && (
        <footer className="site-footer bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6">
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

// Componente para renderizar el árbol de páginas
interface PageTreeRendererProps {
  nodes: PageTreeNode[];
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onNavigate: (page: PageTreeNode) => void;
  searchTerm?: string;
  level?: number;
}

const PageTreeRenderer: FC<PageTreeRendererProps> = ({ 
  nodes, 
  expandedNodes, 
  onToggle, 
  onNavigate, 
  searchTerm,
  level = 0 
}) => {
  // Filtrar nodos por búsqueda
  const filteredNodes = nodes.filter(node => 
    !searchTerm || 
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.children && node.children.some(child => 
      child.title.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );
  
  return (
    <>
      {filteredNodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        
        return (
          <div key={node.id}>
            <div
              className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
              style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggle(node.id);
                }}
                className="p-1 mr-1"
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
              </button>
              
              <div
                className="flex items-center flex-grow"
                onClick={() => onNavigate(node)}
              >
                <div className="mr-2 text-gray-500 dark:text-gray-400">
                  {node.page_type === 'container' ? <Folder size={16} /> : <FileText size={16} />}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {node.title}
                </span>
              </div>
            </div>
            
            {hasChildren && isExpanded && (
              <PageTreeRenderer
                nodes={node.children}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onNavigate={onNavigate}
                searchTerm={searchTerm}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

export default PublicVersionPage;