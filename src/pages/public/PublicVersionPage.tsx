import { useState, useEffect, useRef, type FC } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  X,
  AlertTriangle,
  BookOpen,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { publicationService } from '../../services/publicationService';
import { versionService } from '../../services/versionService';
import useDebounce from '../../hooks/useDebounce';
import type { 
  PublicSite, 
  ProjectVersion, 
  PageVersion
} from '../../types';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

const PublicVersionPage: FC = () => {
  const { projectSlug, versionNumber, token } = useParams<{ 
    projectSlug?: string; 
    versionNumber?: string;
    token?: string;
  }>();
  
  const navigate = useNavigate();
  
  // Estados principales
  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null);
  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [publishedPages, setPublishedPages] = useState<PageVersion[]>([]);
  const [pageTree, setPageTree] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Estados del buscador
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PageVersion[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const storageKey = `versionRecentSearches_${projectSlug || token}_${versionNumber}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, [projectSlug, token, versionNumber]);
  
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
          
          // Verificar que la versión no sea un borrador para acceso público sin token
          if (!token && specificVersion.is_draft) {
            throw new Error('Esta versión no está disponible públicamente');
          }
          
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
  
  // Cargar páginas publicadas cuando tengamos la versión
  useEffect(() => {
    async function loadVersionContent() {
      if (!version || !project) return;
      
      try {
        // Cargar solo páginas publicadas de la versión
        const { data: pagesData, error: pagesError } = await versionService.getPublishedVersionPages(version.id);
        if (pagesError) throw pagesError;
        setPublishedPages(pagesData || []);
        
        // Cargar árbol de páginas publicadas de la versión
        const { data: treeData, error: treeError } = await versionService.getPublishedVersionPageTree(version.id);
        if (treeError) throw treeError;
        setPageTree(treeData || []);
        
        // Expandir nodos de primer nivel
        const rootIds = new Set((treeData || []).map((node: any) => node.id));
        setExpandedNodes(rootIds);
        
      } catch (err: any) {
        setError('Error al cargar contenido de la versión: ' + err.message);
      }
    }
    
    loadVersionContent();
  }, [version, project]);

  // Búsqueda de páginas en la versión
  useEffect(() => {
    if (isSearchOpen && debouncedSearchQuery && version?.id) {
      searchVersionPages(debouncedSearchQuery);
    } else if (!debouncedSearchQuery && isSearchOpen) {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, isSearchOpen, version?.id]);

  const searchVersionPages = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);

      const { data, error } = await versionService.searchPublishedVersionPages(
        version!.id, 
        searchTerm, 
        10
      );

      if (error) throw error;
      setSearchResults(data || []);

      // Guardar en búsquedas recientes
      if (searchTerm.trim().length > 0) {
        const newSearch: RecentSearch = {
          id: Date.now().toString(),
          query: searchTerm,
          timestamp: new Date().toISOString()
        };

        const storageKey = `versionRecentSearches_${projectSlug || token}_${versionNumber}`;
        const updatedSearches = [
          newSearch,
          ...recentSearches.filter(s => s.query.toLowerCase() !== searchTerm.toLowerCase()).slice(0, 4)
        ];

        setRecentSearches(updatedSearches);
        localStorage.setItem(storageKey, JSON.stringify(updatedSearches));
      }
    } catch (err) {
      console.error('Error searching version pages:', err);
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
          searchVersionPages(recentSearches[recentIndex].query);
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
  
  // Generar URL base para navegación
  const getBaseUrl = () => {
    if (token) {
      return `/public/version/${token}`;
    }
    return `/docs/${projectSlug}/${versionNumber}`;
  };
  
  // Navegar a página específica en esta versión
  const navigateToPage = (pageVersion: PageVersion) => {
    const baseUrl = getBaseUrl();
    const pageSlug = pageVersion.page?.slug || 'page';
    navigate(`${baseUrl}/${pageSlug}`);
    setIsSearchOpen(false);
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

  // Limpiar búsquedas recientes
  const clearRecentSearches = () => {
    setRecentSearches([]);
    const storageKey = `versionRecentSearches_${projectSlug || token}_${versionNumber}`;
    localStorage.removeItem(storageKey);
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
              Versión no disponible
            </h2>
            <p className="text-destructive/80 mb-4">
              {error}
            </p>
            <Link 
              to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
              className="inline-flex items-center text-destructive hover:text-destructive/80 font-medium"
            >
              <ArrowRight size={16} className="mr-1 rotate-180" />
              Volver al proyecto
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!site || !project || !version) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Versión no encontrada
          </h2>
          <p className="text-muted-foreground">
            La versión solicitada no está disponible
          </p>
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
                  className="h-8 w-8 rounded"
                />
              ) : (
                <FileText size={24} className="text-primary" />
              )}
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-foreground">
                    {site.site_name}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary text-sm rounded-full border border-primary/20">
                    <GitBranch size={12} className="mr-1" />
                    v{version.version_number}
                  </span>
                </div>
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
                  <span className="hidden sm:inline">Buscar en versión...</span>
                  <span className="sm:hidden">Buscar...</span>
                </button>
              )}

              {!token && (
                <Link
                  to={`/docs/${projectSlug}`}
                  className="text-primary hover:text-primary/80 text-sm flex items-center font-medium transition-colors"
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
        <nav className="bg-card/50 border-b border-border px-4 py-3">
          <div className="container mx-auto">
            <div className="flex items-center text-sm text-muted-foreground">
              <Link
                to={token ? `/public/project/${token}` : `/docs/${projectSlug}`}
                className="hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-foreground font-medium">
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
          <aside className="site-navigation w-80 bg-card border-r border-border min-h-[calc(100vh-69px)] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Información de la versión */}
              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center space-x-2 mb-3">
                  <GitBranch size={18} className="text-primary" />
                  <span className="font-semibold text-foreground">
                    Versión {version.version_number}
                  </span>
                </div>
                
                {version.version_name && (
                  <p className="text-sm text-muted-foreground mb-3 font-medium">
                    {version.version_name}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {format(new Date(version.created_at), 'dd MMM yyyy', { locale: es })}
                  </div>
                  <div className="flex items-center bg-success/10 text-success px-2 py-1 rounded-full">
                    <Eye size={10} className="mr-1" />
                    {publishedPages.length} páginas
                  </div>
                </div>
              </div>
              
              {/* Árbol de navegación */}
              <nav className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                  <BookOpen size={16} className="mr-2" />
                  Contenido disponible
                </h3>
                
                {pageTree.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Esta versión no tiene contenido publicado</p>
                  </div>
                ) : (
                  <PageTreeRenderer
                    nodes={pageTree}
                    expandedNodes={expandedNodes}
                    onToggle={toggleNode}
                    onNavigate={(node) => {
                      const pageVersion = publishedPages.find(p => p.page_id === node.id);
                      if (pageVersion) navigateToPage(pageVersion);
                    }}
                  />
                )}
              </nav>
            </div>
          </aside>
        )}
        
        {/* Contenido principal */}
        <main className="site-content flex-grow">
          <div className="container mx-auto px-6 py-8 max-w-6xl">
            {/* Header de la versión */}
            <div className="mb-8">
              <div className="bg-card rounded-lg shadow-sm p-8 border border-border">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-grow">
                    <h1 className="page-title text-3xl font-bold text-foreground mb-3">
                      {version.version_name || `Versión ${version.version_number}`}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center bg-accent/30 px-3 py-1 rounded-full">
                        <Calendar size={14} className="mr-2" />
                        Creada el {format(new Date(version.created_at), 'dd MMMM yyyy', { locale: es })}
                      </div>
                      
                      {version.published_at && (
                        <div className="flex items-center bg-success/20 text-success-foreground px-3 py-1 rounded-full">
                          <Eye size={14} className="mr-2" />
                          Publicada el {format(new Date(version.published_at), 'dd MMMM yyyy', { locale: es })}
                        </div>
                      )}
                      
                      {version.created_by_user?.user_profiles?.[0] && (
                        <div className="flex items-center bg-secondary/30 px-3 py-1 rounded-full">
                          <User size={14} className="mr-2" />
                          Por {version.created_by_user.user_profiles[0].first_name} {version.created_by_user.user_profiles[0].last_name}
                        </div>
                      )}
                    </div>

                    {/* Estados */}
                    <div className="flex items-center space-x-2">
                      {version.is_current && (
                        <span className="inline-flex items-center text-xs text-success-foreground bg-success/10 px-2 py-1 rounded-full border border-success/20">
                          <Tag size={10} className="mr-1" />
                          Versión actual
                        </span>
                      )}
                      
                      {version.is_draft && (
                        <span className="inline-flex items-center text-xs text-warning-foreground bg-warning/10 px-2 py-1 rounded-full border border-warning/20">
                          <Clock size={10} className="mr-1" />
                          Borrador
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {publishedPages.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      página{publishedPages.length !== 1 ? 's' : ''} publicada{publishedPages.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                {/* Notas de la versión */}
                {version.release_notes && (
                  <div className="border-t border-border pt-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      Notas de la versión
                    </h2>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {version.release_notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Lista de páginas */}
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Páginas en esta versión
                </h2>
              </div>
              
              <div className="divide-y divide-border">
                {publishedPages.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText size={64} className="mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium mb-2">No hay páginas disponibles</h3>
                    <p>Esta versión no contiene páginas publicadas</p>
                  </div>
                ) : (
                  publishedPages.map((pageVersion) => (
                    <div 
                      key={pageVersion.id}
                      className="p-6 hover:bg-accent/20 cursor-pointer transition-all duration-200 group"
                      onClick={() => navigateToPage(pageVersion)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-grow min-w-0">
                          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {pageVersion.title_snapshot || 'Sin título'}
                          </h3>
                          
                          {pageVersion.description_snapshot && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {pageVersion.description_snapshot}
                            </p>
                          )}
                          
                          <div className="flex items-center text-xs text-muted-foreground space-x-4">
                            <div className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              Snapshot: {format(new Date(pageVersion.created_at), 'dd MMM yyyy', { locale: es })}
                            </div>
                            
                            <span className="inline-flex items-center bg-success/10 text-success-foreground px-2 py-1 rounded-full">
                              <Eye size={10} className="mr-1" />
                              Publicada
                            </span>
                          </div>
                        </div>
                        
                        <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

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
                placeholder={`Buscar en versión ${version.version_number}...`}
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
                  <span>Buscando en la versión...</span>
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resultados en versión {version.version_number}
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
                              {result.title_snapshot}
                            </div>
                            {result.description_snapshot && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {result.description_snapshot}
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
                                searchVersionPages(item.query);
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
                      <p>en la versión {version.version_number}</p>
                    </div>
                  )}

                  {!searchQuery && recentSearches.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">
                        Buscar en versión {version.version_number}
                      </p>
                      <p>
                        Encuentra páginas específicas en esta versión del proyecto
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

// Componente para renderizar el árbol de páginas
interface PageTreeRendererProps {
  nodes: any[];
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onNavigate: (node: any) => void;
  level?: number;
}

const PageTreeRenderer: FC<PageTreeRendererProps> = ({ 
  nodes, 
  expandedNodes, 
  onToggle, 
  onNavigate,
  level = 0 
}) => {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        
        return (
          <div key={node.id}>
            <div
              className="flex items-center p-2 rounded-md hover:bg-accent/50 cursor-pointer group transition-colors"
              style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggle(node.id);
                }}
                className="p-1 mr-2 rounded hover:bg-background/80 transition-colors"
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
              </button>
              
              <div
                className="flex items-center flex-grow min-w-0"
                onClick={() => onNavigate(node)}
              >
                <div className="mr-2 text-muted-foreground">
                  {hasChildren ? <Folder size={16} /> : <FileText size={16} />}
                </div>
                <span className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
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