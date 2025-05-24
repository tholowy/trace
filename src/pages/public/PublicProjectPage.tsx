// PublicProjectPage.tsx
import { useState, useEffect, type FC } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Folder,
  Calendar,
  ArrowRight,
  Eye,
  ChevronRight,
  ChevronDown,
  Home
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { pageService } from '../../services/pageService';
import VersionSelector from '../../components/versions/VersionSelector';
import type {
  PublicSite,
  ProjectVersion,
  Page,
  PageTreeNode
} from '../../types';

const PublicProjectPage: FC = () => {
  const { projectSlug, token } = useParams<{ projectSlug?: string; token?: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Cargar datos del sitio público
  useEffect(() => {
    async function loadPublicSite() {
      try {
        setLoading(true);
        setError(null);

        let projectData = null;
        let siteData = null;
        let currentVersionData = null;

        if (token) {
          // Acceso por token
          const { data: tokenData, error: tokenError } = await publicationService.validateAccessToken(token);

          if (tokenError || !tokenData?.is_valid) {
            throw new Error('Token de acceso inválido o expirado.');
          }

          if (tokenData.content_type === 'project') {
            projectData = tokenData.content;
            const { data: sData } = await publicationService.getPublicSite(tokenData.content.id);
            siteData = sData;
          } else {
            throw new Error('Token no válido para proyecto.');
          }
        } else if (projectSlug) {
          // Acceso público por slug
          const { data: sData, error: siteError } = await publicationService.getPublicSiteBySlug(projectSlug);

          if (siteError) throw siteError;

          siteData = sData!.site;
          projectData = sData!.project;
          currentVersionData = sData!.current_version;
        } else {
          throw new Error('No se especificó proyecto o token.');
        }

        setSite(siteData);
        setProject(projectData);
        setCurrentVersion(currentVersionData);

        // Cargar árbol de páginas publicadas solo si hay un proyecto válido
        if (projectData?.id && currentVersionData?.id) {
          const { data: treeData } = await pageService.getPageTree(projectData.id); //currentVersionData.id TODO
          setPageTree(treeData || []);

          // Expandir nodos de primer nivel por defecto
          const rootIds = new Set((treeData || []).map(node => node.id));
          setExpandedNodes(rootIds);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPublicSite();
  }, [projectSlug, token]);

  // Filtrar páginas por búsqueda
  const filteredPageTree = pageTree.filter(node =>
    !searchTerm ||
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.children && node.children.some(child =>
      child.title.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

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

  // Navegar a página
  const navigateToPage = (page: Page | PageTreeNode) => {
    const basePath = token
      ? `/public/project/${token}`
      : `/docs/${projectSlug}${currentVersion ? `/${currentVersion.version_number}` : ''}`;

    navigate(`${basePath}/${page.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-card rounded-lg p-8 max-w-md shadow-lg border border-destructive/30">
          <h2 className="text-xl font-semibold text-destructive mb-3">
            Error de Acceso
          </h2>
          <p className="text-foreground/80">
            {error} Por favor, verifica tu enlace o token.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-6"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (!site || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-card rounded-lg p-8 max-w-md shadow-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Sitio No Encontrado
          </h2>
          <p className="text-foreground/80">
            El sitio de documentación solicitado no está disponible o no existe.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary mt-6"
          >
            Ir a la Página Principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        '--primary-color': site.primary_color || 'hsl(var(--primary))',
        '--secondary-color': site.secondary_color || 'hsl(var(--secondary))'
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="site-header bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {site.logo_url ? (
                <img
                  src={site.logo_url}
                  alt={site.site_name}
                  className="h-10 w-10 rounded-md object-contain"
                />
              ) : (
                <FileText size={32} className="text-primary" />
              )}

              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {site.site_name}
                </h1>
                {site.description && (
                  <p className="text-sm text-muted-foreground">
                    {site.description}
                  </p>
                )}
              </div>
            </div>

            {/* Selector de versión */}
            {currentVersion && !token && (
              <VersionSelector
                projectId={project.id}
                currentVersionId={currentVersion.id}
                showDrafts={false}
              // compact={true} TODO
              />
            )}
          </div>
        </div>
      </header>

      {/* Layout principal */}
      <div className="flex">
        {/* Navegación lateral */}
        {(site.navigation_style === 'sidebar' || site.navigation_style === 'both') && (
          <aside className="site-navigation w-80 bg-card border-r border-border min-h-[calc(100vh-69px)] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Buscador */}
              {site.show_search && (
                <div className="mb-6">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input pl-10 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Árbol de navegación */}
              <nav className="space-y-1">
                {filteredPageTree.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay contenido disponible.</p>
                  </div>
                ) : (
                  filteredPageTree.map(node => (
                    <NavigationItem
                      key={node.id}
                      node={node}
                      level={0}
                      expanded={expandedNodes.has(node.id)}
                      onToggle={toggleNode}
                      onNavigate={navigateToPage}
                      searchTerm={searchTerm}
                    />
                  ))
                )}
              </nav>
            </div>
          </aside>
        )}

        {/* Contenido principal */}
        <main className="site-content flex-grow">
          <div className="container mx-auto px-6 py-8">
            {/* Breadcrumbs */}
            {site.show_breadcrumbs && (
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link
                  to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
                  className="hover:text-primary flex items-center transition-colors"
                >
                  <Home size={14} className="mr-1" />
                  Inicio
                </Link>
              </nav>
            )}

            {/* Contenido de bienvenida */}
            <div className="max-w-4xl">
              <div className="bg-card rounded-lg shadow-sm p-8 mb-8 border border-border">
                <h1 className="page-title text-4xl font-extrabold text-foreground mb-4 leading-tight">
                  Bienvenido a <span className="text-primary">{site.site_name}</span>
                </h1>

                {site.description && (
                  <p className="text-lg text-muted-foreground mb-6">
                    {site.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {currentVersion && (
                    <div className="flex items-center bg-secondary/30 px-3 py-1 rounded-full">
                      <Calendar size={16} className="mr-2 text-secondary-foreground" />
                      <span>Versión <span className="font-semibold text-foreground">{currentVersion.version_number}</span></span>
                    </div>
                  )}

                  <div className="flex items-center bg-accent/30 px-3 py-1 rounded-full">
                    <Eye size={16} className="mr-2 text-accent-foreground" />
                    <span>Documentación Pública</span>
                  </div>
                </div>
              </div>

              {/* Páginas destacadas */}
              {pageTree.length > 0 && (
                <div className="bg-card rounded-lg shadow-sm p-8 border border-border">
                  <h2 className="text-2xl font-semibold text-foreground mb-6">
                    Contenido Disponible
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageTree.slice(0, 6).map(page => (
                      <button
                        key={page.id}
                        onClick={() => navigateToPage(page)}
                        className="p-4 border border-border rounded-lg hover:shadow-md hover:border-primary transition-all text-left bg-background group"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {page.icon ? (
                              <span className="text-xl text-primary">{page.icon}</span>
                            ) : (
                              <FileText size={22} className="text-primary" />
                            )}
                          </div>

                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                              {page.title}
                            </h3>

                            {page.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {page.description}
                              </p>
                            )}

                            {page.children && page.children.length > 0 && (
                              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                <Folder size={14} className="mr-1" />
                                <span>{page.children.length} páginas</span>
                              </div>
                            )}
                          </div>

                          <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {pageTree.length > 6 && (
                    <div className="mt-6 text-center">
                      <p className="text-muted-foreground">
                        Y {pageTree.length - 6} páginas más en la navegación lateral.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

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

// Componente para elementos de navegación
interface NavigationItemProps {
  node: PageTreeNode;
  level: number;
  expanded: boolean;
  onToggle: (nodeId: string) => void;
  onNavigate: (page: PageTreeNode) => void;
  searchTerm: string;
}

const NavigationItem: FC<NavigationItemProps> = ({
  node,
  level,
  expanded,
  onToggle,
  onNavigate,
  searchTerm
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const matchesSearch = !searchTerm || node.title.toLowerCase().includes(searchTerm.toLowerCase());

  // Si hay búsqueda y no coincide, verificar si algún hijo coincide
  const hasMatchingChild = searchTerm && !matchesSearch && hasChildren &&
    node.children!.some(child => child.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (searchTerm && !matchesSearch && !hasMatchingChild) {
    return null;
  }

  return (
    <div>
      <div
        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors
        ${level > 0 ? 'ml-4' : ''}
        ${searchTerm && matchesSearch ? 'bg-primary/10 text-primary-foreground font-semibold' : 'hover:bg-muted/50 text-foreground'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Botón de expansión */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} // Prevenir navegación al hacer clic en el toggle
            className="p-1 mr-2 rounded-sm hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        {/* Contenido del item */}
        <div
          className="flex items-center flex-grow min-w-0"
          onClick={() => onNavigate(node)}
        >
          <div className="flex-shrink-0 mr-2">
            {node.icon ? (
              <span className={`text-base ${searchTerm && matchesSearch ? 'text-primary' : 'text-primary'}`}>{node.icon}</span>
            ) : hasChildren ? (
              <Folder size={18} className="text-secondary-foreground" />
            ) : (
              <FileText size={18} className="text-muted-foreground" />
            )}
          </div>

          <div className="flex-grow min-w-0">
            <span className={`text-sm font-medium truncate block
              ${searchTerm && matchesSearch ? 'text-primary' : 'text-foreground'}
            `}>
              {node.title}
            </span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {node.children!.length} elementos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hijos expandidos */}
      {hasChildren && expanded && (
        <div className="mt-1">
          {node.children!.map(child => (
            <NavigationItem
              key={child.id}
              node={child}
              level={level + 1}
              expanded={false}
              onToggle={onToggle}
              onNavigate={onNavigate}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicProjectPage;