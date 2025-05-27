import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  File, 
  Folder, 
  FolderOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Move,
  Search,
  X,
  FileText,
  Database
} from 'lucide-react';
import { pageService } from '../../services/pageService';
import type { 
  Page, 
  PageTreeNode, 
  CreatePageOptions 
} from '../../types';

interface PageTreeProps {
  projectId: string;
  selectedPageId?: string;
  onPageSelect?: (page: Page) => void;
  onPageCreate?: (parentId?: string) => void;
  onPageEdit?: (page: Page) => void;
  onPageDelete?: (page: Page) => void;
  enableDragAndDrop?: boolean;
  showCreateButtons?: boolean;
  searchable?: boolean;
  collapsible?: boolean;
  maxDepth?: number;
}

interface PageTreeItemProps {
  node: PageTreeNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (page: Page) => void;
  onAction: (action: string, page: Page) => void;
  showActions: boolean;
  maxDepth?: number;
}

const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node,
  level,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  onAction,
  showActions,
  maxDepth = 10
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const canHaveChildren = level < maxDepth;

  const handleSelect = () => {
    onSelect({
      id: node.id,
      title: node.title,
      slug: node.slug,
      has_content: node.has_content,
      is_published: node.is_published,
      order_index: node.order_index,
      level: node.level,
      path: node.path,
      project_id: '', // Se completaría desde el contexto
      parent_page_id: node.parent_id,
      created_at: '',
      updated_at: ''
    } as Page);
  };

  return (
    <div className="select-none">
      {/* Nodo principal */}
      <div
        className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
          isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="flex items-center flex-grow min-w-0" onClick={handleSelect}>
          {/* Botón de expansión */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                onToggle(node.id);
              }
            }}
            className="p-1 mr-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <div className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Icono de tipo de página */}
          <div className={`mr-2 flex-shrink-0 ${
            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {node.icon && <span className="text-base">{node.icon}</span>}
          </div>

          {/* Título y metadata */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium truncate ${
                isSelected ? '' : 'group-hover:text-gray-900 dark:group-hover:text-gray-100'
              }`}>
                {node.title}
              </span>
              
              {/* Indicadores de estado */}
              <div className="flex items-center space-x-1">
                {!node.is_published && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded">
                    Draft
                  </span>
                )}
              </div>
            </div>
            
            {/* Información adicional */}
            {hasChildren && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {node.children.length} página{node.children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Menú de acciones */}
        {showActions && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsMenu(!showActionsMenu);
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
            >
              <MoreHorizontal size={14} />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onAction('edit', node as any);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Edit size={14} className="mr-2" />
                    Editar
                  </button>
                  
                  {canHaveChildren && (
                    <button
                      onClick={() => {
                        onAction('create-child', node as any);
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Plus size={14} className="mr-2" />
                      Nueva subpágina
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onAction('duplicate', node as any);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Copy size={14} className="mr-2" />
                    Duplicar
                  </button>
                  
                  <button
                    onClick={() => {
                      onAction('move', node as any);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Move size={14} className="mr-2" />
                    Mover
                  </button>
                  
                  <hr className="my-1 border-gray-200 dark:border-gray-600" />
                  
                  <button
                    onClick={() => {
                      onAction('delete', node as any);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Páginas hijas */}
      {hasChildren && isExpanded && (
        <div className="ml-0">
          {node.children.map((childNode) => (
            <PageTreeItem
              key={childNode.id}
              node={childNode}
              level={level + 1}
              isSelected={false} // Se determinaría desde el componente padre
              isExpanded={false} // Se determinaría desde el estado padre
              onToggle={onToggle}
              onSelect={onSelect}
              onAction={onAction}
              showActions={showActions}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PageTree: React.FC<PageTreeProps> = ({
  projectId,
  selectedPageId,
  onPageSelect,
  onPageCreate,
  onPageEdit,
  onPageDelete,
  enableDragAndDrop = false,
  showCreateButtons = true,
  searchable = true,
  collapsible = true,
  maxDepth = 10
}) => {
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();

  // Cargar árbol de páginas
  const loadPageTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await pageService.getPageTree(projectId);
      
      if (error) throw error;
      
      setPageTree(data || []);
      
      // Expandir nodos de primer nivel por defecto
      const rootNodeIds = new Set((data || []).map(node => node.id));
      setExpandedNodes(rootNodeIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPageTree();
  }, [loadPageTree]);

  // Filtrar árbol por búsqueda
  const filteredTree = React.useMemo(() => {
    if (!searchTerm.trim()) return pageTree;

    const filterNodes = (nodes: PageTreeNode[]): PageTreeNode[] => {
      return nodes.reduce<PageTreeNode[]>((acc, node) => {
        const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase());
        const filteredChildren = filterNodes(node.children || []);
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
        
        return acc;
      }, []);
    };

    return filterNodes(pageTree);
  }, [pageTree, searchTerm]);

  // Manejar expansión/contracción de nodos
  const handleToggleNode = (nodeId: string) => {
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

  // Manejar selección de página
  const handlePageSelect = (page: Page) => {
    onPageSelect?.(page);
  };

  // Manejar acciones del menú contextual
  const handlePageAction = async (action: string, page: Page) => {
    switch (action) {
      case 'edit':
        onPageEdit?.(page);
        break;
        
      case 'create-child':
        setCreateParentId(page.id);
        setShowCreateModal(true);
        break;
        
      case 'duplicate':
        try {
          await pageService.duplicatePage(page.id, {
            new_title: `${page.title} (Copia)`
          });
          loadPageTree();
        } catch (error: any) {
          setError(error.message);
        }
        break;
        
      case 'move':
        // Implementar modal de mover página
        console.log('Mover página:', page);
        break;
        
      case 'delete':
        if (window.confirm(`¿Estás seguro de eliminar "${page.title}"?`)) {
          try {
            await pageService.deletePage(page.id);
            loadPageTree();
            onPageDelete?.(page);
          } catch (error: any) {
            setError(error.message);
          }
        }
        break;
    }
  };

  // Manejar creación de nueva página
  const handleCreatePage = async (options: CreatePageOptions) => {
    try {
      await pageService.createPage({
        ...options,
        project_id: projectId,
        parent_page_id: createParentId
      });
      
      setShowCreateModal(false);
      setCreateParentId(undefined);
      loadPageTree();
      
      onPageCreate?.(createParentId);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Expandir/contraer todo
  const handleExpandAll = () => {
    const getAllNodeIds = (nodes: PageTreeNode[]): string[] => {
      return nodes.reduce<string[]>((acc, node) => {
        acc.push(node.id);
        if (node.children) {
          acc.push(...getAllNodeIds(node.children));
        }
        return acc;
      }, []);
    };

    setExpandedNodes(new Set(getAllNodeIds(pageTree)));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando páginas...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Páginas
          </h3>
          
          <div className="flex items-center space-x-2">
            {collapsible && (
              <>
                <button
                  onClick={handleExpandAll}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Expandir todo
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleCollapseAll}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Contraer todo
                </button>
              </>
            )}
            
            {showCreateButtons && (
              <button
                onClick={() => {
                  setCreateParentId(undefined);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Plus size={14} className="mr-1" />
                Nueva página
              </button>
            )}
          </div>
        </div>
        
        {/* Buscador */}
        {searchable && (
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar páginas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Árbol de páginas */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTree.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? (
              <>
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">No se encontraron páginas</p>
                <p className="text-sm">
                  No hay páginas que coincidan con "{searchTerm}"
                </p>
              </>
            ) : (
              <>
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">No hay páginas</p>
                <p className="text-sm mb-4">
                  Crea la primera página para comenzar a organizar tu documentación
                </p>
                {showCreateButtons && (
                  <button
                    onClick={() => {
                      setCreateParentId(undefined);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} className="mr-2" />
                    Crear primera página
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredTree.map((node) => (
              <PageTreeItem
                key={node.id}
                node={node}
                level={0}
                isSelected={selectedPageId === node.id}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={handleToggleNode}
                onSelect={handlePageSelect}
                onAction={handlePageAction}
                showActions={true}
                maxDepth={maxDepth}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear página */}
      {showCreateModal && (
        <CreatePageModal
          isOpen={showCreateModal}
          parentId={createParentId}
          onClose={() => {
            setShowCreateModal(false);
            setCreateParentId(undefined);
          }}
          onCreate={handleCreatePage}
        />
      )}
    </div>
  );
};

// Modal para crear nueva página
interface CreatePageModalProps {
  isOpen: boolean;
  parentId?: string;
  onClose: () => void;
  onCreate: (options: CreatePageOptions) => void;
}

const CreatePageModal: React.FC<CreatePageModalProps> = ({
  isOpen,
  parentId,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      parent_page_id: parentId
    });

    // Reset form
    setTitle('');
    setDescription('');
    setIcon('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {parentId ? 'Nueva subpágina' : 'Nueva página'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Título de la página"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icono (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="📝"
              maxLength={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Crear página
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PageTree;