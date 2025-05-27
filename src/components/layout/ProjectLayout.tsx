import { useState, useEffect, type FC } from 'react';
import { Outlet, useParams, Link, NavLink } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Users,
  Settings,
  File,
  Folder,
  Search,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  Clock,
  ChevronRight, // Importar para los iconos de expansión/contracción
  ChevronsDownUp
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import { pageService } from '../../services/pageService';
import ThemeToggle from '../common/ThemeToggle';
import type { Project, Page, PageTreeNode } from '../../types'; // Importar PageTreeNode

// Componente auxiliar para renderizar los ítems del árbol de páginas
interface PageTreeItemProps {
  node: PageTreeNode;
  projectId: string;
  sidebarOpen: boolean;
  searchTerm: string;
}

const PageTreeItem: FC<PageTreeItemProps> = ({ node, projectId, sidebarOpen, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(false); // Estado para expandir/contraer
  const hasChildren = node.children && node.children.length > 0;
  const isMatchingSearch = searchTerm ? node.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;

  // Si hay un término de búsqueda, expandir automáticamente los nodos que coincidan o tengan hijos que coincidan
  useEffect(() => {
    if (searchTerm) {
      const checkChildrenMatch = (children: PageTreeNode[]): boolean => {
        return children.some(child => 
          child.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          checkChildrenMatch(child.children)
        );
      };
      if (isMatchingSearch || checkChildrenMatch(node.children)) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false); // Contraer todo si no hay búsqueda
    }
  }, [searchTerm, node.children, isMatchingSearch]);


  return (
    <div>
      <div
        className={`
          flex items-center p-2 rounded-md hover:bg-muted text-sm text-muted-foreground hover:text-foreground group transition-colors
          ${!sidebarOpen ? 'justify-center' : ''}
          ${node.level && sidebarOpen ? `ml-${node.level * 4}` : ''}
          ${searchTerm && !isMatchingSearch && 'opacity-50'}
        `}
      >
        {hasChildren && sidebarOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1 -ml-1 mr-1 rounded-sm hover:bg-background-hover transition-colors"
            title={isOpen ? 'Contraer' : 'Expandir'}
          >
            {isOpen ? <ChevronsDownUp size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        <Link
          key={node.id}
          to={`/projects/${projectId}/pages/${node.id}`}
          className={`flex items-center flex-grow ${!sidebarOpen ? 'justify-center' : ''}`}
        >
          <span className="text-xl leading-none mr-2">{node.icon || <File size={14} className="text-muted-foreground" />}</span>
          {sidebarOpen && <span className="truncate">{node.title}</span>}
        </Link>
      </div>
      {isOpen && hasChildren && sidebarOpen && (
        <div className="ml-4 border-l border-border"> {/* Indentación visual para los hijos */}
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              projectId={projectId}
              sidebarOpen={sidebarOpen}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectLayout: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]); // Usar PageTreeNode[]
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    async function fetchProjectData() {
      if (!projectId) return;
      try {
        setLoading(true);
        const { data: projectData, error: projectError } = await projectService.getProjectById(projectId);
        if (projectError) throw projectError;
        setProject(projectData);

        // Obtener el árbol de páginas directamente
        const { data: treeData, error: treeError } = await pageService.getPageTree(projectId);
        if (treeError) throw treeError;
        setPageTree(treeData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProjectData();
  }, [projectId]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Función para aplanar el árbol y filtrar por término de búsqueda (para el componente de búsqueda)
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

  const filteredTree = searchTerm
    ? flattenTree(pageTree).filter(node => node.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : pageTree;


  if (loading) {
    return <div className="flex justify-center items-center h-screen text-muted-foreground">Cargando proyecto...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive-foreground">Error: {error}</div>;
  }

  if (!project) {
    return <div className="p-4 text-muted-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-45">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex items-center">
              {project.logo_url ? (
                <img
                  src={project.logo_url}
                  alt={project.name}
                  className="h-8 w-8 rounded-md mr-2 object-cover"
                />
              ) : (
                <Folder size={20} className="text-primary mr-2" />
              )}
              <h1 className="text-xl font-semibold text-foreground">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-1">
              <NavLink
                to={`/projects/${projectId}`}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                  }`
                }
              >
                Páginas
              </NavLink>
              <NavLink
                to={`/projects/${projectId}/members`}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md flex items-center transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                  }`
                }
              >
                <Users size={16} className="mr-1" />
                Miembros
              </NavLink>
              <NavLink
                to={`/projects/${projectId}/versions`}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md flex items-center transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                  }`
                }
              >
                <Clock size={16} className="mr-1" />
                Versiones
              </NavLink>
              <NavLink
                to={`/projects/${projectId}/settings`}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md flex items-center transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                  }`
                }
              >
                <Settings size={16} className="mr-1" />
                Configuración
              </NavLink>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* Main Content with Sidebar */}
      <div className="flex-grow flex overflow-hidden h-[calc(100vh-4rem)]">
        {/* Fixed Sidebar */}
        <aside className={`${sidebarOpen ? 'w-80' : 'w-16'} flex-shrink-0 bg-card border-r border-border transition-all duration-300 overflow-hidden h-full relative`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0 flex items-center justify-between">
              {sidebarOpen &&
                <div className="relative mb-0 flex-grow">
                  <input
                    type="text"
                    placeholder="Buscar páginas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-8 pr-8 w-full"
                  />
                  <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              }
              {/* Toggle button for sidebar */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`py-2 ${sidebarOpen ? 'px-2 ml-2' : 'pl-1'} rounded-full hover:bg-muted transition-colors z-10`}
                title={sidebarOpen ? 'Contraer barra lateral' : 'Expandir barra lateral'}
              >
                {sidebarOpen ? <PanelLeftClose size={20} className="text-muted-foreground" /> : <PanelLeftOpen size={20} className="text-muted-foreground" />}
              </button>
            </div>

            {/* Create New Page Button */}
            <div className={`border-b border-border flex-shrink-0 ${sidebarOpen ? 'p-4' : 'py-4 px-2 flex justify-center'}`}>
              <Link
                to={`/projects/${projectId}/pages/new`}
                className={`
                  btn-primary
                  ${sidebarOpen ? 'w-full justify-center' : 'w-10 h-10 flex items-center justify-center p-0'}
                `}
                title={sidebarOpen ? 'Nueva página' : 'Nueva página'}
              >
                <Plus size={16} className={`${sidebarOpen ? 'mr-2' : ''}`} />
                {sidebarOpen && 'Nueva página'}
              </Link>
            </div>

            {/* Pages List (Tree View) */}
            <div className="flex-grow overflow-y-auto">
              <nav className="p-3">
                {filteredTree.length === 0 && searchTerm ? (
                  <div className="text-center p-4 text-sm text-muted-foreground">
                    {sidebarOpen ? 'No se encontraron páginas con ese criterio.' : ''}
                  </div>
                ) : filteredTree.length === 0 && !searchTerm ? (
                  <div className="text-center p-4 text-sm text-muted-foreground">
                    {sidebarOpen ? 'No hay páginas en este proyecto.' : ''}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredTree.map((node) => (
                      <PageTreeItem
                        key={node.id}
                        node={node}
                        projectId={projectId}
                        sidebarOpen={sidebarOpen}
                        searchTerm={searchTerm}
                      />
                    ))}
                  </div>
                )}
              </nav>
            </div>
          </div>
        </aside>
        {/* Main Content Area */}
        <main className="flex-grow bg-background overflow-y-auto h-full p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProjectLayout;