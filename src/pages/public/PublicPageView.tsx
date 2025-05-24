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
  Clock,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { pageService } from '../../services/pageService';
import VersionSelector from '../../components/versions/VersionSelector';
import useDebounce from '../../hooks/useDebounce';
import DocumentViewer from '../../components/documents/DocumentViewer';
import type {
  PublicSite,
  ProjectVersion,
  Page,
  PageTreeNode,
  PageSearchResult,
  NavigationContext,
  BreadcrumbItem
} from '../../types';
import { supabase } from '../../lib/supabase';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

const PublicPageView: FC = () => {
  const { projectSlug, versionNumber, token, '*': pagePath } = useParams<{
    projectSlug?: string;
    versionNumber?: string;
    token?: string;
    '*': string;
  }>();
  const navigate = useNavigate();

  // Estados principales (combinados de PublicPageView y PublicProjectPage)
  const [site, setSite] = useState<PublicSite | null>(null);
  const [project, setProject] = useState<any>(null); // project info
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null); // version info for the page or project context
  const [page, setPage] = useState<Page | null>(null); // specific page being viewed
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Estados del buscador (de PublicProjectPage)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PageSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cargar búsquedas recientes del localStorage (de PublicProjectPage)
  useEffect(() => {
    const storageKey = `publicRecentSearches_${projectSlug || token || project?.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, [projectSlug, token, project?.id]);


  // Cargar datos de la página, sitio, proyecto y árbol de navegación
  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true);
        setError(null);

        let pageData: Page | null = null;
        let siteData: PublicSite | null = null;
        let projectData: any = null;
        let versionData: ProjectVersion | null = null;

        if (token) {
          const { data: tokenData, error: tokenError } = await publicationService.validateAccessToken(token);
          if (tokenError || !tokenData?.is_valid) {
            throw new Error('Token de acceso inválido o expirado');
          }

          if (tokenData.content_type === 'page') {
            pageData = tokenData.content as Page;
            const { data: siteInfo } = await publicationService.getPublicSite(tokenData.content.project_id);
            siteData = siteInfo;
            projectData = siteInfo?.project;
            // If page token, version might not be directly in tokenData, could be part of project or site info or default
            if (projectData) {
                 const { data: pVersion } = await publicationService.getProjectCurrentVersion(projectData.id);
                 versionData = pVersion;
            }
          } else if (tokenData.content_type === 'project') {
            // This case might not be hit if routed to PublicProjectPage, but good for robustness
            projectData = tokenData.content;
            const { data: sData } = await publicationService.getPublicSite(tokenData.content.id);
            siteData = sData;
            versionData = sData?.current_version; // Assuming current_version is part of site data for project token
             // If pagePath is available, try to load the page for this project token context
            if (projectData && pagePath) {
                const { data: publicContent } = await publicationService.getPublicPageContent(
                    projectData.slug, // Assuming projectData has slug
                    pagePath,
                    versionData?.version_number // Use current version for project token if page is accessed
                );
                if (publicContent?.page) pageData = publicContent.page;
                // siteData, projectData, versionData would be reaffirmed or set here
            }

          } else {
            throw new Error('Token no válido para esta vista.');
          }
        } else if (projectSlug && pagePath) {
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
          throw new Error('No se especificaron parámetros válidos para cargar la página.');
        }

        if (!token && pageData && !pageData.is_published) {
          throw new Error('Esta página no está disponible públicamente.');
        }

        setPage(pageData);
        setSite(siteData);
        setProject(projectData);
        setCurrentVersion(versionData);

        if (projectData?.id) {
          const { data: publishedPages } = await pageService.getPublishedPages(projectData.id); //
          if (publishedPages) {
            const publishedTree = pageService.buildPageTree(publishedPages); //
            setPageTree(publishedTree);
            // Expandir nodos de primer nivel por defecto
            const rootIds = new Set(publishedTree.map(node => node.id)); //
            setExpandedNodes(rootIds); //
          }
          if (pageData?.id) {
            const { data: navContext } = await getPublicNavigationContext(pageData.id, projectData.id, publishedPages || []);
            setNavigationContext(navContext);

            await pageService.recordPageView(pageData.id, { //
              user_agent: navigator.userAgent, //
              referrer: document.referrer //
            });
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPageData();
  }, [projectSlug, versionNumber, pagePath, token]);


  // Búsqueda de páginas públicas (de PublicProjectPage)
  useEffect(() => {
    if (isSearchOpen && debouncedSearchQuery && project?.id) {
      searchPublicPages(debouncedSearchQuery); //
    } else if (!debouncedSearchQuery && isSearchOpen) {
      setSearchResults([]); //
    }
  }, [debouncedSearchQuery, isSearchOpen, project?.id]); //

  const searchPublicPages = async (searchTerm: string) => { //
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    try {
      setSearchLoading(true);
      const { data, error } = await pageService.searchPages({ //
        query: searchTerm, //
        project_id: project.id, //
        only_published: true, //
        limit: 10 //
      });
      if (error) throw error;
      setSearchResults(data || []);

      if (searchTerm.trim().length > 0) {
        const newSearch: RecentSearch = { //
          id: Date.now().toString(), //
          query: searchTerm, //
          timestamp: new Date().toISOString() //
        };
        const storageKey = `publicRecentSearches_${projectSlug || token || project.id}`; //
        const updatedSearches = [
          newSearch,
          ...recentSearches.filter(s => s.query.toLowerCase() !== searchTerm.toLowerCase()).slice(0, 4) //
        ];
        setRecentSearches(updatedSearches); //
        localStorage.setItem(storageKey, JSON.stringify(updatedSearches)); //
      }
    } catch (err) {
      console.error('Error searching public pages:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const getPublicNavigationContext = async (pageId: string, projectId: string, publishedPages: Page[]) => { //
    try {
      const currentPage = publishedPages.find(p => p.id === pageId); //
      if (!currentPage) return { data: null }; //

      const breadcrumbs = await generatePublicBreadcrumbs(pageId, publishedPages); //
      const siblings = publishedPages.filter(p => //
        p.parent_page_id === currentPage.parent_page_id && p.id !== pageId //
      ).sort((a, b) => a.order_index - b.order_index); //

      const currentIndexInSiblings = siblings.findIndex(p => p.id === pageId);
      // Correction: To find previous/next, we need to find the current page *within its siblings context* if it's part of them,
      // or find its position within the sorted list of its parent's children.
      // The original logic for prev/next might need adjustment if current page is not in `siblings` (e.g. if it's a root page).
      // For simplicity, assuming the current page is among its siblings for prev/next.
      // More robustly:
      const parentChildren = publishedPages.filter(p => p.parent_page_id === currentPage.parent_page_id)
                                         .sort((a, b) => a.order_index - b.order_index);
      const currentActualIndex = parentChildren.findIndex(p => p.id === pageId);
      const previousPage = currentActualIndex > 0 ? parentChildren[currentActualIndex - 1] : undefined; //
      const nextPage = currentActualIndex < parentChildren.length - 1 ? parentChildren[currentActualIndex + 1] : undefined; //


      const { data: projectDetails } = await supabase //
        .from('projects') //
        .select('*') //
        .eq('id', projectId) //
        .single(); //

      const navContext: NavigationContext = { //
        current_page: currentPage, //
        breadcrumbs: breadcrumbs, //
        tree_children: [], // Can be populated if needed, e.g., direct children for a section
        content_children: [], // Can be populated if needed
        siblings: siblings, //
        previous_page: previousPage, //
        next_page: nextPage, //
        project: projectDetails! //
      };
      return { data: navContext }; //
    } catch (error) {
      console.error('Error getting public navigation context:', error); //
      return { data: null }; //
    }
  };

  const generatePublicBreadcrumbs = async (pageId: string, publishedPages: Page[]) => { //
    const breadcrumbs: BreadcrumbItem[] = []; //
    let currentPageId: string | null = pageId; //
    let level = 0; //

    while (currentPageId) {
      const pageInTree = publishedPages.find(p => p.id === currentPageId); //
      if (!pageInTree) break; //
      const path = await generatePublicPagePath(pageInTree.id, publishedPages); //
      breadcrumbs.unshift({ //
        id: pageInTree.id, //
        title: pageInTree.title, //
        slug: pageInTree.slug, //
        path: path, //
        level: level //
      });
      currentPageId = pageInTree.parent_page_id || null; //
      level++; //
    }
    return breadcrumbs; //
  };

  const generatePublicPagePath = async (pageId: string, publishedPages: Page[]) => { //
    const pathSegments: string[] = []; //
    let currentPageId: string | null = pageId; //
    while (currentPageId) {
      const page = publishedPages.find(p => p.id === currentPageId); //
      if (!page) break; //
      pathSegments.unshift(page.slug); //
      currentPageId = page.parent_page_id || null; //
    }
    return '/' + pathSegments.join('/'); //
  };

  const getBaseUrl = (forPageNavigation = false) => { //
    // For page navigation (sidebar, search results), we need the slug/version path
    if (token) {
        // If accessing via page token, links should ideally maintain that token context
        // or resolve to the canonical slug/version/path structure if the token is for a specific page.
        // For simplicity here, assuming token access to a page means further navigation might also use tokens or switch to slug.
        // Let's prioritize slug-based navigation if project/version info is available.
        if (project?.slug) {
             return `/docs/${project.slug}${currentVersion ? `/${currentVersion.version_number}` : ''}`;
        }
        // Fallback for token-based navigation if project slug isn't resolved for some reason
        // This part might need refinement based on desired token behavior for linked pages
        return forPageNavigation ? `/public/page/` : `/public/project/${token}`; // placeholder if token is the only context
    }
    return `/docs/${projectSlug}${currentVersion ? `/${currentVersion.version_number}` : ''}`; //
  };


  // Manejo del buscador (de PublicProjectPage)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { //
    if (!isSearchOpen) return;
    const totalItems = searchResults.length + recentSearches.length; //
    if (e.key === 'Escape') { //
      setIsSearchOpen(false); //
      return;
    }
    if (e.key === 'ArrowDown') { //
      e.preventDefault();
      setSelectedSearchIndex(prev => prev < totalItems - 1 ? prev + 1 : 0); //
    } else if (e.key === 'ArrowUp') { //
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : totalItems - 1); //
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0 && totalItems > 0) { //
      e.preventDefault();
      if (selectedSearchIndex < searchResults.length) { //
        navigateToPage(searchResults[selectedSearchIndex]); //
      } else {
        const recentIndex = selectedSearchIndex - searchResults.length; //
        if (recentIndex >= 0 && recentIndex < recentSearches.length) { //
          setSearchQuery(recentSearches[recentIndex].query); //
          searchPublicPages(recentSearches[recentIndex].query); //
        }
      }
    }
  };

  useEffect(() => { //
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false); //
      }
    };
    document.addEventListener('mousedown', handleClickOutside); //
    return () => {
      document.removeEventListener('mousedown', handleClickOutside); //
    };
  }, []); //

  useEffect(() => { //
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus(); //
      setSelectedSearchIndex(0); //
    }
  }, [isSearchOpen]); //

  const toggleNode = (nodeId: string) => { //
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId); //
      } else {
        newSet.add(nodeId); //
      }
      return newSet;
    });
  };

    const flattenTree = (nodes: PageTreeNode[]): PageTreeNode[] => {
      let flatList: PageTreeNode[] = [];
      nodes.forEach(node => {
        flatList.push(node);
        if (node.children && node.children.length > 0) {
          flatList = flatList.concat(flattenTree(node.children));
        }
      });
      return flatList;
    };

  // Navegar a página (combinado y adaptado)
  const navigateToPage = (targetPage: Page | PageTreeNode | PageSearchResult) => { //
    const basePath = getBaseUrl(true); // Use true to get the slug/version path for navigation

    let pageItemPath = '';
    if ('path' in targetPage && targetPage.path) { // Es un SearchResult o tiene path pre-calculado
      pageItemPath = targetPage.path; //
    } else if ('slug' in targetPage) { // Es un Page o PageTreeNode, construir la ruta dinámicamente
        // This needs robust path generation based on the PageTreeNode structure or fetching full path
        // For now, assuming 'slug' is the final segment for simplicity if path isn't available
        // A full path reconstruction might be needed here if targetPage is aTreeNode without a full 'path'
        // For simplicity, using slug directly, assuming it's a root page or path will be appended to base.
        // This should ideally use a function like generatePublicPagePath if only slug is available for a nested page.
        
        // If we have publishedPages, we can generate the full path
        if (pageTree.length > 0) { // Check if pageTree (as a flat list of published pages) is available
            const allPublishedPages = flattenTree(pageTree); // you'll need to implement flattenTree or pass publishedPages directly
            generatePublicPagePath(targetPage.id, allPublishedPages).then(generatedPath => {
                 navigate(`${basePath}${generatedPath}`);
            });
        } else { // Fallback if tree/published pages aren't readily available for path generation
            pageItemPath = `/${targetPage.slug}`;
        }
    }
    
    // If path was generated asynchronously above, this direct navigate won't run or will run with empty path.
    // Ensure async path generation completes before navigating or simplify.
    // For now, assuming pageItemPath is set synchronously:
    if (pageItemPath) {
        navigate(`${basePath}${pageItemPath}`);
    } else if ('slug'in targetPage && pageTree.length === 0) { // Fallback for simple slug if no tree for path gen
        navigate(`${basePath}/${targetPage.slug}`);
    }

    setIsSearchOpen(false); //
  };


  const clearRecentSearches = () => { //
    setRecentSearches([]); //
    const storageKey = `publicRecentSearches_${projectSlug || token || project?.id}`; //
    localStorage.removeItem(storageKey); //
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
          <AlertTriangle size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-destructive mb-3">
            Error
          </h2>
          <p className="text-foreground/80 mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate(projectSlug ? `/docs/${projectSlug}` : (token ? `/public/project/${token}`: '/docs'))}
            className="btn-primary inline-flex items-center"
          >
             <ArrowLeft size={16} className="mr-1" />
            Volver al inicio del proyecto
          </button>
        </div>
      </div>
    );
  }

  if (!site || !project || !page) { //
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-card rounded-lg p-8 max-w-md shadow-lg border border-border">
          <FileText size={48} className="text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Contenido No Encontrado
          </h2>
          <p className="text-foreground/80 mb-4">
            La página o el sitio solicitado no está disponible o no se pudo cargar.
          </p>
          <button
             onClick={() => navigate(projectSlug ? `/docs/${projectSlug}` : (token ? `/public/project/${token}`: '/docs'))}
            className="btn-secondary"
          >
            Volver al Inicio del Proyecto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        '--primary-color': site.primary_color || 'hsl(var(--primary))', //
        '--secondary-color': site.secondary_color || 'hsl(var(--secondary))' //
      } as React.CSSProperties}
      onKeyDown={handleSearchKeyDown} //
    >
      {/* Header (adaptado de PublicProjectPage) */}
      <header className="site-header bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to={getBaseUrl(false)} // Link to project root or token specific root
              className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
            >
              {site.logo_url ? ( //
                <img
                  src={site.logo_url} //
                  alt={site.site_name} //
                  className="h-10 w-10 rounded-md object-contain" //
                />
              ) : (
                <FileText size={32} className="text-primary" /> //
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {site.site_name}
                </h1>
                {site.description && ( //
                  <p className="text-sm text-muted-foreground">
                    {site.description}
                  </p>
                )}
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              {site.show_search && ( //
                <button
                  onClick={() => setIsSearchOpen(true)} //
                  className="flex items-center text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 bg-secondary rounded-md shadow-sm transition-colors duration-200" //
                >
                  <Search size={16} className="mr-2" />
                  <span className="hidden sm:inline">Buscar documentación...</span>
                  <span className="sm:hidden">Buscar...</span>
                </button>
              )}
              {currentVersion && !token && project?.id && ( //
                <VersionSelector
                  projectId={project.id} //
                  currentVersionId={currentVersion.id} //
                  showDrafts={false} //
                  // Ensure version selector navigates correctly, potentially needs a projectSlug
                  // and a way to reconstruct URL for different versions of the *current* page if possible
                  // or navigate to the root of the selected version.
                  // This might require passing projectSlug to VersionSelector or enhancing its navigation logic.
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Layout principal con Sidebar */}
      <div className="flex">
        {/* Navegación lateral (Sidebar de PublicProjectPage) */}
        {(site.navigation_style === 'sidebar' || site.navigation_style === 'both') && pageTree.length > 0 && ( /* */
          <aside className="site-navigation w-80 bg-card border-r border-border min-h-[calc(100vh-69px)] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <nav className="space-y-1">
                {pageTree.map(node => ( //
                  <NavigationItem
                    key={node.id} //
                    node={node} //
                    level={0} //
                    expanded={expandedNodes.has(node.id)} //
                    onToggle={toggleNode} //
                    onNavigate={navigateToPage} //
                    // Pass current page ID to highlight in sidebar
                    currentPageId={page?.id}
                  />
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Contenido principal de la página */}
        <main className="site-content flex-grow">
          <div className="container mx-auto px-6 py-8 max-w-screen-xl"> {/* adapted from PublicProjectPage main content container */}
            {/* Breadcrumbs */}
            {site.show_breadcrumbs && navigationContext?.breadcrumbs && navigationContext.breadcrumbs.length > 0 && ( //
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link
                  to={getBaseUrl(false)} // To project home
                  className="hover:text-primary flex items-center transition-colors" //
                >
                  <Home size={14} className="mr-1" />
                  {site.site_name}
                </Link>
                {navigationContext.breadcrumbs.map((crumb, index) => ( //
                  <div key={crumb.id} className="flex items-center">
                    <ChevronRight size={14} className="mx-1" />
                    {index === navigationContext.breadcrumbs.length - 1 ? ( //
                      <span className="text-foreground font-medium">
                        {crumb.title}
                      </span>
                    ) : (
                      <Link
                        to={`${getBaseUrl(true)}${crumb.path}`} //
                        className="hover:text-primary transition-colors" //
                      >
                        {crumb.title}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            )}

            {/* Contenido de la página (de PublicPageView) */}
            <article className="page-content max-w-4xl">
              <header className="mb-8">
                <div className="flex items-start space-x-3 mb-4">
                  {page.icon && ( //
                    <span className="text-2xl">{page.icon}</span> //
                  )}
                  <div className="flex-grow">
                    <h1 className="page-title text-3xl font-bold text-foreground mb-2">
                      {page.title}
                    </h1>
                    {page.description && ( //
                      <p className="text-lg text-muted-foreground mb-4">
                        {page.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>
                          Actualizado el {new Date(page.updated_at).toLocaleDateString('es-ES', { //
                            year: 'numeric', month: 'long', day: 'numeric'
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
                {/* <div className="flex items-center space-x-2 mb-4"> TODO
                  <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full flex items-center">
                    <Eye size={12} className="mr-1" />
                    Publicada
                  </span>
                  <span className="px-2 py-1 bg-accent/30 text-accent-foreground text-xs rounded-full flex items-center">
                    <FileText size={12} className="mr-1" />
                    Página
                  </span>
                </div> */}
              </header>

              {page.content && ( //
                <div className="bg-card rounded-lg shadow-sm p-8 mb-8 border border-border prose dark:prose-invert max-w-none">
                  <DocumentViewer content={page.content} />
                </div>
              )}

              {navigationContext && (navigationContext.previous_page || navigationContext.next_page) && ( //
                <nav className="mt-12 pt-8 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {navigationContext.previous_page ? ( //
                      <Link
                        to={`${getBaseUrl(true)}${navigationContext.previous_page.path || '/' + navigationContext.previous_page.slug}`} //
                        className="flex items-center p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all group" //
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
                      <div /> /* Espacio vacío */ //
                    )}
                    {navigationContext.next_page && ( //
                      <Link
                        to={`${getBaseUrl(true)}${navigationContext.next_page.path || '/' + navigationContext.next_page.slug}`} //
                        className="flex items-center justify-end p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-right group" //
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
      </div>

      {/* Footer (de PublicProjectPage) */}
      {site.footer_text && ( //
        <footer className="site-footer bg-card border-t border-border py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {site.footer_text}
            </p>
          </div>
        </footer>
      )}

      {/* Modal de búsqueda (de PublicProjectPage) */}
      {isSearchOpen && ( //
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 p-4 z-50">
          <div
            ref={searchRef} //
            className="bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-border" //
          >
            <div className="p-4 border-b border-border flex items-center">
              <Search size={18} className="text-muted-foreground mr-3" />
              <input
                ref={searchInputRef} //
                type="text"
                value={searchQuery} //
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedSearchIndex(0); }} //
                placeholder="Busca en la documentación..." //
                className="flex-grow bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg" //
              />
              {searchQuery && ( //
                <button
                  onClick={() => setSearchQuery('')} //
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200" //
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-grow custom-scrollbar">
              {searchLoading ? ( //
                <div className="flex justify-center items-center p-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Buscando...</span>
                </div>
              ) : searchQuery && searchResults.length > 0 ? ( //
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultados</h3>
                  <ul>
                    {searchResults.map((result, index) => ( //
                      <li key={result.id}>
                        <button
                          onClick={() => navigateToPage(result)} //
                          className={`w-full text-left p-3 rounded-md flex items-start group transition-colors duration-200 ${selectedSearchIndex === index ? 'bg-primary/10 text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`} //
                        >
                          <FileText size={18} className="mt-0.5 mr-3 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                          <div>
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{result.title}</div>
                            {result.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{result.description}</div>}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  {recentSearches.length > 0 && !searchQuery && ( //
                    <div className="p-2">
                      <div className="px-3 py-2 flex justify-between items-center border-b border-border mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Búsquedas recientes</h3>
                        <button onClick={clearRecentSearches} className="text-xs text-link hover:text-link-hover transition-colors duration-200">Limpiar</button>
                      </div>
                      <ul>
                        {recentSearches.map((item, index) => ( //
                          <li key={item.id}>
                            <button
                              onClick={() => { setSearchQuery(item.query); searchPublicPages(item.query); }} //
                              className={`w-full text-left p-3 rounded-md flex items-center group transition-colors duration-200 ${selectedSearchIndex === searchResults.length + index ? 'bg-primary/10 text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`} //
                            >
                              <Clock size={16} className="mr-3 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                              <span className="text-foreground group-hover:text-primary transition-colors duration-200">{item.query}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {searchQuery && !searchLoading && searchResults.length === 0 && ( //
                    <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">No se encontraron resultados para "<span className="text-foreground font-semibold">{searchQuery}</span>"</p>
                      <p>Intenta con otra palabra clave o verifica la ortografía.</p>
                    </div>
                  )}
                  {!searchQuery && recentSearches.length === 0 && ( //
                     <div className="p-8 text-center text-muted-foreground">
                      <Search size={36} className="mx-auto mb-4 text-muted-foreground/60" />
                      <p className="text-lg font-medium mb-2">¿Qué estás buscando?</p>
                      <p>Comienza a escribir para buscar en la documentación.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-center space-x-4 bg-secondary/20">
              <div className="flex items-center"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd><span className="ml-2">para navegar</span></div>
              <div className="flex items-center"><kbd className="kbd">Enter</kbd><span className="ml-2">para seleccionar</span></div>
              <div className="flex items-center"><kbd className="kbd">Esc</kbd><span className="ml-2">para cerrar</span></div>
            </div>
          </div>
        </div>
      )}

      {/* CSS personalizado */}
      {site.custom_css && ( //
        <style dangerouslySetInnerHTML={{ __html: site.custom_css }} /> //
      )}
    </div>
  );
};


// Componente para elementos de navegación (de PublicProjectPage)
interface NavigationItemProps {
  node: PageTreeNode; //
  level: number; //
  expanded: boolean; //
  onToggle: (nodeId: string) => void; //
  onNavigate: (page: PageTreeNode) => void; //
  currentPageId?: string | null; // Added to highlight current page
}

const NavigationItem: FC<NavigationItemProps> = ({ //
  node, //
  level, //
  expanded, //
  onToggle, //
  onNavigate, //
  currentPageId
}) => {
  const hasChildren = node.children && node.children.length > 0; //
  const isCurrentPage = node.id === currentPageId;

  return (
    <div>
      <div
        className={`flex items-center p-2 rounded-md transition-colors group
        ${level > 0 ? 'ml-4' : ''} ${isCurrentPage ? 'bg-primary/10 text-primary-foreground' : 'hover:bg-muted/50 text-foreground'}`} //
        style={{ paddingLeft: `${level * 16 + 8}px` }} //
        onClick={() => onNavigate(node)} // Make the whole item clickable
      >
        {hasChildren && ( //
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} //
            className={`p-1 mr-2 rounded-sm transition-colors 
                        ${isCurrentPage ? 'text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'}`}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && <div className="w-5 mr-2"></div> /* Spacer for alignment when no children */}


        <div className="flex items-center flex-grow min-w-0 cursor-pointer">
          <div className="flex-shrink-0 mr-2">
            {node.icon ? ( //
              <span className={`text-base ${isCurrentPage ? 'text-primary' : 'text-primary group-hover:text-primary'}`}>{node.icon}</span> //
            ) : hasChildren ? ( //
              <Folder size={18} className={`${isCurrentPage ? 'text-primary' : 'text-secondary-foreground group-hover:text-primary'}`} /> //
            ) : (
              <FileText size={18} className={`${isCurrentPage ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} /> //
            )}
          </div>
          <div className="flex-grow min-w-0">
            <span className={`text-sm font-medium truncate block ${isCurrentPage ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
              {node.title}
            </span>
            {hasChildren && ( //
              <span className="text-xs text-muted-foreground">
                {node.children!.length} elementos
              </span>
            )}
          </div>
        </div>
      </div>
      {hasChildren && expanded && ( //
        <div className="mt-1">
          {node.children!.map(child => ( //
            <NavigationItem
              key={child.id} //
              node={child} //
              level={level + 1} //
              expanded={false} //
              onToggle={onToggle} //
              onNavigate={onNavigate} //
              currentPageId={currentPageId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicPageView;