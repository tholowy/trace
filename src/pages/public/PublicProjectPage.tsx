import { useState, useEffect, useRef, type FC } from 'react';
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
  Home,
  X,
  Clock
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { pageService } from '../../services/pageService';
import VersionSelector from '../../components/versions/VersionSelector';
import useDebounce from '../../hooks/useDebounce';
import type {
  PublicSite,
  ProjectVersion,
  Page,
  PageTreeNode,
  PageSearchResult
} from '../../types';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

const PublicProjectPage: FC = () => {
  const { projectSlug, token } = useParams<{ projectSlug?: string; token?: string }>();
  const navigate = useNavigate();

  // Estados principales
  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Estados del buscador
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PageSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`publicRecentSearches_${projectSlug || token}`);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, [projectSlug, token]);

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

        // Cargar árbol de páginas PUBLICADAS únicamente
        if (projectData?.id) {
          const { data: publishedPages } = await pageService.getPublishedPages(projectData.id);
          if (publishedPages) {
            const publishedTree = pageService.buildPageTree(publishedPages);
            setPageTree(publishedTree);

            // Expandir nodos de primer nivel por defecto
            const rootIds = new Set(publishedTree.map(node => node.id));
            setExpandedNodes(rootIds);
          }
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPublicSite();
  }, [projectSlug, token]);

  // Búsqueda de páginas públicas
  useEffect(() => {
    if (isSearchOpen && debouncedSearchQuery && project?.id) {
      searchPublicPages(debouncedSearchQuery);
    } else if (!debouncedSearchQuery && isSearchOpen) {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, isSearchOpen, project?.id]);

  const searchPublicPages = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);

      const { data, error } = await pageService.searchPages({
        query: searchTerm,
        project_id: project.id,
        only_published: true, // Solo páginas publicadas
        limit: 10
      });

      if (error) throw error;

      setSearchResults(data || []);

      // Guardar en búsquedas recientes
      if (searchTerm.trim().length > 0) {
        const newSearch: RecentSearch = {
          id: Date.now().toString(),
          query: searchTerm,
          timestamp: new Date().toISOString()
        };

        const storageKey = `publicRecentSearches_${projectSlug || token}`;
        const updatedSearches = [
          newSearch,
          ...recentSearches.filter(s => s.query.toLowerCase() !== searchTerm.toLowerCase()).slice(0, 4)
        ];

        setRecentSearches(updatedSearches);
        localStorage.setItem(storageKey, JSON.stringify(updatedSearches));
      }
    } catch (err) {
      console.error('Error searching public pages:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Manejo del buscador
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen) return;

    const totalItems = searchResults.length + recentSearches.length;

    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev < totalItems - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : totalItems - 1);
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0 && totalItems > 0) {
      e.preventDefault();
      if (selectedSearchIndex < searchResults.length) {
        navigateToPage(searchResults[selectedSearchIndex]);
      } else {
        const recentIndex = selectedSearchIndex - searchResults.length;
        if (recentIndex >= 0 && recentIndex < recentSearches.length) {
          setSearchQuery(recentSearches[recentIndex].query);
          searchPublicPages(recentSearches[recentIndex].query);
        }
      }
    }
  };

  // Cerrar buscador al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Enfocar input al abrir buscador
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setSelectedSearchIndex(0);
    }
  }, [isSearchOpen]);

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
  const navigateToPage = (page: Page | PageTreeNode | PageSearchResult) => {
    const basePath = token
      ? `/public/project/${token}`
      : `/docs/${projectSlug}${currentVersion ? `/${currentVersion.version_number}` : ''}`;

    // Generar la ruta según el tipo de objeto
    let pagePath = '';
    if ('path' in page && page.path) {
      // Es un SearchResult
      pagePath = page.path;
    } else if ('slug' in page) {
      // Es un Page o PageTreeNode, construir la ruta
      pagePath = `/${page.slug}`;
    }

    navigate(`${basePath}${pagePath}`);
    setIsSearchOpen(false);
  };

  // Limpiar búsquedas recientes
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(`publicRecentSearches_${projectSlug || token}`);
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
          <p className="text-foreground/80 mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
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
          <p className="text-foreground/80 mb-4">
            El sitio de documentación solicitado no está disponible.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
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
      onKeyDown={handleSearchKeyDown}
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

            <div className="flex items-center space-x-4">
              {/* Buscador */}
              {site.show_search && (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 bg-secondary rounded-md shadow-sm transition-colors duration-200"
                >
                  <Search size={16} className="mr-2" />
                  <span className="hidden sm:inline">Buscar documentación...</span>
                  <span className="sm:hidden">Buscar...</span>
                </button>
              )}

              {/* Selector de versión */}
              {currentVersion && !token && (
                <VersionSelector
                  projectId={project.id}
                  currentVersionId={currentVersion.id}
                  showDrafts={false}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Layout principal */}
      <div className="flex">
        {/* Navegación lateral */}
        {(site.navigation_style === 'sidebar' || site.navigation_style === 'both') && (
          <aside className="site-navigation w-80 bg-card border-r border-border min-h-[calc(100vh-69px)] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Árbol de navegación */}
              <nav className="space-y-1">
                {pageTree.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay contenido publicado disponible.</p>
                  </div>
                ) : (
                  pageTree.map(node => (
                    <NavigationItem
                      key={node.id}
                      node={node}
                      level={0}
                      expanded={expandedNodes.has(node.id)}
                      onToggle={toggleNode}
                      onNavigate={navigateToPage}
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

      {/* Modal de búsqueda */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 p-4 z-45">
          <div
            ref={searchRef}
            className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-border"
          >
            {/* Barra de búsqueda */}
            <div className="p-4 border-b border-border flex items-center">
              <Search size={18} className="text-muted-foreground mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedSearchIndex(0); }}
                placeholder="Busca en la documentación..."
                className="flex-grow bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            <div className="overflow-y-auto flex-grow custom-scrollbar">
              {searchLoading ? (
                <div className="flex justify-center items-center p-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Buscando...</span>
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resultados
                  </h3>
                  <ul>
                    {searchResults.map((result, index) => (
                      <li key={result.id}>
                        <button
                          onClick={() => navigateToPage(result)}
                          className={`w-full text-left p-3 rounded-md flex items-start group transition-colors duration-200
                            ${selectedSearchIndex === index
                              ? 'bg-primary/10 text-primary-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                          <FileText size={18} className="mt-0.5 mr-3 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                          <div>
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                              {result.title}
                            </div>
                            {result.description && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {result.description}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  {/* Búsquedas recientes */}
                  {recentSearches.length > 0 && !searchQuery && (
                    <div className="p-2">
                      <div className="px-3 py-2 flex justify-between items-center border-b border-border mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Búsquedas recientes
                        </h3>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-link hover:text-link-hover transition-colors duration-200"
                        >
                          Limpiar
                        </button>
                      </div>
                      <ul>
                        {recentSearches.map((item, index) => (
                          <li key={item.id}>
                            <button
                              onClick={() => {
                                setSearchQuery(item.query);
                                searchPublicPages(item.query);
                              }}
                              className={`w-full text-left p-3 rounded-md flex items-center group transition-colors duration-200
                                ${selectedSearchIndex === searchResults.length + index
                                  ? 'bg-primary/10 text-primary-foreground'
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                            >
                              <Clock size={16} className="mr-3 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                              <span className="text-foreground group-hover:text-primary transition-colors duration-200">
                                {item.query}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchQuery && !searchLoading && searchResults.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">
                        No se encontraron resultados para "<span className="text-foreground font-semibold">{searchQuery}</span>"
                      </p>
                      <p>Intenta con otra palabra clave o verifica la ortografía.</p>
                    </div>
                  )}

                  {!searchQuery && recentSearches.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">
                        ¿Qué estás buscando?
                      </p>
                      <p>
                        Comienza a escribir para buscar en la documentación.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-center space-x-4 bg-secondary/20">
              <div className="flex items-center">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                <span className="ml-2">para navegar</span>
              </div>
              <div className="flex items-center">
                <kbd className="kbd">Enter</kbd>
                <span className="ml-2">para seleccionar</span>
              </div>
              <div className="flex items-center">
                <kbd className="kbd">Esc</kbd>
                <span className="ml-2">para cerrar</span>
              </div>
            </div>
          </div>
        </div>
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
}

const NavigationItem: FC<NavigationItemProps> = ({
  node,
  level,
  expanded,
  onToggle,
  onNavigate
}) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors
        ${level > 0 ? 'ml-4' : ''}
        hover:bg-muted/50 text-foreground
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Botón de expansión */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
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
              <span className="text-base text-primary">{node.icon}</span>
            ) : hasChildren ? (
              <Folder size={18} className="text-secondary-foreground" />
            ) : (
              <FileText size={18} className="text-muted-foreground" />
            )}
          </div>

          <div className="flex-grow min-w-0">
            <span className="text-sm font-medium truncate block text-foreground">
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicProjectPage;