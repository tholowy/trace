import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Folder, File, FileText, ChevronRight, ChevronDown, Search, X, FolderOpen } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { documentService } from '../../services/documentService';
import { categoryService } from '../../services/categoryService';
import type { Category, Document, Project } from '../../types';
import CategoryManager from '../../components/projects/CategoryManager';

interface CategoryTreeItemProps {
  category: Category;
  projectId: string;
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  allCategories: Category[];
  searchTerm: string;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (categoryId: string) => void;
}

const ProjectDetailsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    if (!projectId) return;
    
    async function fetchProjectData() {
      if (projectId === undefined) return;
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
        
        // Si hay categorías, seleccionar la primera por defecto
        if (categoriesData && categoriesData.length > 0) {
          const firstCategory = categoriesData.find(cat => !cat.parent_id);
          if (firstCategory) {
            setSelectedCategoryId(firstCategory.id);
            
            // Cargar documentos de la primera categoría
            const { data: documentsData, error: documentsError } = await documentService.getDocuments(
              projectId, 
              firstCategory.id
            );
            if (documentsError) throw documentsError;
            setDocuments(documentsData || []);
          }
        } else {
          // Si no hay categorías, cargar todos los documentos del proyecto
          const { data: documentsData, error: documentsError } = await documentService.getDocuments(projectId);
          if (documentsError) throw documentsError;
          setDocuments(documentsData || []);
        }
      } catch (err: any) {
        setError(`Error al cargar datos del proyecto: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjectData();
  }, [projectId]);
  
  const handleCategorySelect = async (categoryId: string) => {
    if (!projectId) return;
    
    try {
      setSelectedCategoryId(categoryId);
      setLoading(true);
      
      // Cargar documentos de la categoría seleccionada
      const { data, error } = await documentService.getDocuments(projectId, categoryId);
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (err: any) {
      setError(`Error al cargar documentos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCategoryCreate = (category: Category) => {
    // Actualizar lista de categorías
    setCategories(prevCategories => [...prevCategories, category]);
  };
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const clearCategorySearch = () => {
    setCategorySearchTerm('');
  };
  
  // Filtrar y organizar categorías en árbol
  const getFilteredCategoryTree = () => {
    const filteredCategories = categorySearchTerm
      ? categories.filter(cat => 
          cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
        )
      : categories;
    
    return filteredCategories.filter(category => !category.parent_id);
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading && !project) {
    return <div className="flex justify-center p-8">Cargando proyecto...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!project) {
    return <div className="p-4">Proyecto no encontrado</div>;
  }
  
  // Obtener el nombre de la categoría seleccionada
  const selectedCategory = categories.find(category => category.id === selectedCategoryId);
  
  return (
    <div className="max-w-screen-xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mr-3">
              {project.name}
            </h1>
            {project.is_public && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                Público
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Folder size={16} className="mr-1.5" />
              Gestionar categorías
            </button>
            
            <Link
              to={`/projects/${projectId}/documents/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus size={16} className="mr-1.5" />
              Nuevo documento
            </Link>
          </div>
        </div>
        
        {project.description && (
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Última actualización: {formatDate(project.updated_at)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel lateral de categorías */}
        <div className="lg:col-span-1">
          {showCategoryManager ? (
            <CategoryManager 
              projectId={projectId as string}
              onCategorySelect={handleCategorySelect}
              onCategoryCreate={handleCategoryCreate}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Categorías
                  </h3>
                  
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Gestionar
                  </button>
                </div>
                
                {/* Buscador de categorías */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar categorías..." 
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  {categorySearchTerm && (
                    <button
                      onClick={clearCategorySearch}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-2">No hay categorías</p>
                    <button
                      onClick={() => setShowCategoryManager(true)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <Plus size={14} className="mr-1" />
                      Crear categoría
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-1">
                    {getFilteredCategoryTree().map(category => (
                      <CategoryTreeItem
                        key={category.id}
                        category={category}
                        projectId={projectId!}
                        selectedCategoryId={selectedCategoryId}
                        onCategorySelect={handleCategorySelect}
                        allCategories={categories}
                        searchTerm={categorySearchTerm}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleCategory}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Lista de documentos */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                  <span>Documentos</span>
                  {selectedCategory && (
                    <>
                      <ChevronRight size={16} className="mx-1 text-gray-400" />
                      <span className="text-blue-600 dark:text-blue-400">{selectedCategory.name}</span>
                    </>
                  )}
                </h3>
                
                <Link
                  to={
                    selectedCategoryId
                      ? `/projects/${projectId}/categories/${selectedCategoryId}/documents/new`
                      : `/projects/${projectId}/documents/new`
                  }
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Plus size={14} className="mr-1" />
                  Nuevo documento
                </Link>
              </div>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Cargando documentos...
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    No hay documentos
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {selectedCategory 
                      ? `No hay documentos en la categoría "${selectedCategory.name}"`
                      : 'No hay documentos en este proyecto'
                    }
                  </p>
                  <Link
                    to={
                      selectedCategoryId
                        ? `/projects/${projectId}/categories/${selectedCategoryId}/documents/new`
                        : `/projects/${projectId}/documents/new`
                    }
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Plus size={16} className="mr-1.5" />
                    Crear primer documento
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.map(doc => (
                    <Link
                      key={doc.id}
                      to={`/projects/${projectId}/documents/${doc.id}`}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg transition-colors flex items-start border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <div className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-4">
                        <File size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center mb-1">
                          <h4 className="font-medium text-gray-800 dark:text-white truncate">
                            {doc.title}
                          </h4>
                          {doc.is_published && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full flex-shrink-0">
                              Publicado
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>Actualizado: {formatDate(doc.updated_at)}</span>
                          <span className="mx-2">•</span>
                          <span>Versión: {doc.version}</span>
                          {doc.author && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Por: {doc.author.name || doc.author.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar categorías en árbol
const CategoryTreeItem: FC<CategoryTreeItemProps> = ({
  category,
  projectId,
  selectedCategoryId,
  onCategorySelect,
  allCategories,
  searchTerm,
  expandedCategories,
  onToggleCategory
}) => {
  const childCategories = allCategories.filter(cat => cat.parent_id === category.id);
  const hasChildren = childCategories.length > 0;
  const isExpanded = expandedCategories[category.id];
  const isSelected = selectedCategoryId === category.id;
  
  // Verificar si la categoría coincide con el término de búsqueda
  const matchesSearch = !searchTerm || category.name.toLowerCase().includes(searchTerm.toLowerCase());
  
  // Si hay búsqueda y esta categoría no coincide, verificar si algún hijo coincide
  const hasMatchingChild = searchTerm && !matchesSearch && 
    childCategories.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
  // Si no coincide la búsqueda y no tiene hijos que coincidan, no mostrar
  if (searchTerm && !matchesSearch && !hasMatchingChild) {
    return null;
  }
  
  return (
    <div>
      <div className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
        isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}>
        <div 
          className="flex items-center min-w-0 flex-grow"
          onClick={() => onCategorySelect(category.id)}
        >
          <div className="flex-shrink-0 mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCategory(category.id);
                }}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isExpanded ? 
                  <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" /> : 
                  <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />
                }
              </button>
            ) : (
              <div className="w-5" />
            )}
          </div>
          
          {isSelected ? (
            <FolderOpen size={16} className="mr-2 flex-shrink-0" />
          ) : (
            <Folder size={16} className="mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          )}
          
          <div className="min-w-0 flex-grow">
            <span className={`text-sm font-medium truncate block ${
              isSelected ? '' : 'group-hover:text-gray-900 dark:group-hover:text-gray-100'
            }`}>
              {category.name}
            </span>
            {category.document_count && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {category.document_count.count || 0} documentos
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700 mt-1">
          {childCategories.map(childCategory => (
            <CategoryTreeItem
              key={childCategory.id}
              category={childCategory}
              projectId={projectId}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={onCategorySelect}
              allCategories={allCategories}
              searchTerm={searchTerm}
              expandedCategories={expandedCategories}
              onToggleCategory={onToggleCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsPage;