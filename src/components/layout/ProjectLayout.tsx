import { useState, useEffect, type FC } from 'react';
import { Outlet, useParams, Link, NavLink } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Users, 
  Settings, 
  File, 
  Folder,
  Search,
  X
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import { categoryService } from '../../services/categoryService';
import { documentService } from '../../services/documentService';
// import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import type { Project, Category, Document } from '../../types';

interface CategoryItemProps {
  category: Category;
  projectId: string;
  expanded: boolean;
  allCategories: Category[];
  searchTerm: string;
  expandedCategories: Record<string, boolean>;
  toggleCategory: (categoryId: string) => void;
}

const ProjectLayout: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  // const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    async function fetchProjectData() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        
        // Cargar proyecto
        const { data: projectData, error: projectError } = await projectService.getProjectById(projectId);
        if (projectError) throw projectError;
        setProject(projectData);
        
        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await categoryService.getCategories(projectId);
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
        
        // Expandir categorías de primer nivel por defecto
        const expanded: Record<string, boolean> = {};
        categoriesData?.forEach(category => {
          if (!category.parent_id) {
            expanded[category.id] = true;
          }
        });
        setExpandedCategories(expanded);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjectData();
  }, [projectId]);
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const clearSearch = () => {
    setSearchTerm('');
  };
  
  // Filtrar y organizar categorías en árbol
  const getFilteredCategoryTree = () => {
    const filteredCategories = searchTerm
      ? categories.filter(cat => 
          cat.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : categories;
    
    return filteredCategories.filter(category => !category.parent_id);
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando proyecto...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }
  
  if (!project) {
    return <div className="p-4">Proyecto no encontrado</div>;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra de navegación superior */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/projects" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <ChevronLeft size={20} />
            </Link>
            
            <div className="flex items-center">
              {project.logo_url ? (
                <img 
                  src={project.logo_url} 
                  alt={project.name} 
                  className="h-8 w-8 rounded-md mr-2"
                />
              ) : (
                <Folder size={20} className="text-gray-500 mr-2" />
              )}
              
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
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
                  `px-3 py-1.5 text-sm rounded-md ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/40'
                  }`
                }
              >
                Documentos
              </NavLink>
              
              <NavLink 
                to={`/projects/${projectId}/members`}
                className={({ isActive }) => 
                  `px-3 py-1.5 text-sm rounded-md flex items-center ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/40'
                  }`
                }
              >
                <Users size={16} className="mr-1" />
                Miembros
              </NavLink>
              
              <NavLink 
                to={`/projects/${projectId}/settings`}
                className={({ isActive }) => 
                  `px-3 py-1.5 text-sm rounded-md flex items-center ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/40'
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
      
      {/* Contenido principal con sidebar */}
      <div className="flex-grow flex overflow-hidden h-[calc(100vh-4rem)]">
        {/* Barra lateral fija */}
        <aside className={`${sidebarOpen ? 'w-80' : 'w-16'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 overflow-hidden h-full`}>
          <div className="h-full flex flex-col">
            {/* Buscadores */}
            {sidebarOpen && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3 flex-shrink-0">
                {/* Buscador de documentos */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar documentos..." 
                    className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                
                {/* Buscador de categorías */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar categorías..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Botón para crear nuevo documento */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Link 
                to={`/projects/${projectId}/documents/new`}
                className={`inline-flex items-center justify-center w-full border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 ${sidebarOpen ? 'px-4 py-2 ' : 'px-0 w-full py-2'}`}
              >
                <Plus size={16} className="mr-1.5" />
                {sidebarOpen ? 'Nuevo documento' : ''}
              </Link>
            </div>
            
            {/* Categorías y documentos - con scroll */}
            <div className="flex-grow overflow-y-auto">
              <nav className="p-3">
                {categories.length === 0 ? (
                  <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">
                    {sidebarOpen ? 'No hay categorías' : ''}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {getFilteredCategoryTree().map((category) => (
                      <CategoryItem 
                        key={category.id} 
                        category={category} 
                        projectId={projectId!}
                        expanded={sidebarOpen}
                        allCategories={categories}
                        searchTerm={searchTerm}
                        expandedCategories={expandedCategories}
                        toggleCategory={toggleCategory}
                      />
                    ))}
                  </div>
                )}
              </nav>
            </div>
            
            {/* Botón para contraer/expandir */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={sidebarOpen ? 'Contraer sidebar' : 'Expandir sidebar'}
              >
                {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </aside>
        
        {/* Contenido principal */}
        <main className="flex-grow bg-gray-50 dark:bg-gray-900 overflow-y-auto h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Componente para mostrar una categoría y sus documentos en árbol
const CategoryItem: FC<CategoryItemProps> = ({ 
  category, 
  projectId, 
  expanded, 
  allCategories, 
  searchTerm,
  expandedCategories,
  toggleCategory 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Obtener subcategorías
  const childCategories = allCategories.filter(cat => cat.parent_id === category.id);
  const hasChildren = childCategories.length > 0;
  const isExpanded = expandedCategories[category.id];
  
  // Verificar si la categoría coincide con el término de búsqueda
  const matchesSearch = !searchTerm || category.name.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Si hay búsqueda y esta categoría no coincide, no mostrarla
  if (searchTerm && !matchesSearch) {
    return null;
  }
  
  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const { data, error } = await documentService.getDocuments(projectId, category.id);
        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error("Error al cargar documentos:", error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }
    
    if (expanded && isExpanded) {
      fetchDocuments();
    }
  }, [category.id, projectId, expanded, isExpanded]);
  
  return (
    <div>
      <div 
        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
        onClick={() => toggleCategory(category.id)}
      >
        <div className="flex items-center min-w-0 flex-grow">
          <div className="flex-shrink-0 mr-2">
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" /> : <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <div className="w-4" />
            )}
          </div>
          <Folder size={16} className="text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
          {expanded && (
            <div className="min-w-0 flex-grow">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate block">
                {category.name}
              </span>
              {category.document_count && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {category.document_count.count || 0} docs
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && expanded && (
        <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700">
          {/* Subcategorías */}
          {childCategories.map(childCategory => (
            <CategoryItem
              key={childCategory.id}
              category={childCategory}
              projectId={projectId}
              expanded={expanded}
              allCategories={allCategories}
              searchTerm={searchTerm}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
            />
          ))}
          
          {/* Documentos */}
          {loading ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 ml-6">
              Cargando...
            </div>
          ) : documents.length > 0 ? (
            documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/projects/${projectId}/documents/${doc.id}`}
                className="ml-6 flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 group"
              >
                <File size={14} className="text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                <span className="truncate">{doc.title}</span>
              </Link>
            ))
          ) : null}
          
          <Link
            to={`/projects/${projectId}/categories/${category.id}/documents/new`}
            className="ml-6 flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 group"
          >
            <Plus size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate">Nuevo documento</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectLayout;