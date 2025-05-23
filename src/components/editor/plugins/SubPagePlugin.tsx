import { YooptaPlugin, useYooptaEditor, useBlockData } from '@yoopta/editor';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { pageService } from '../../../services/pageService';
import type { 
  Page, 
  ServiceResponse
} from '../../../types';

// =============== INTERFACES ===============

interface SubPageElement {
  pageId?: string;
  title?: string;
}

interface SubPageProps {
  attributes: any;
  children: any;
  element: SubPageElement;
  readOnly?: boolean;
}

// =============== COMPONENTE PRINCIPAL ===============

const SubPageComponent: React.FC<SubPageProps> = ({ 
  attributes, 
  children, 
  element, 
  readOnly = false
}) => {
  const editor = useYooptaEditor();
  const blockData = useBlockData(attributes?.['data-yoopta-block-id']);
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Usar ref para evitar doble ejecución en modo desarrollo
  const hasCreatedRef = useRef(false);
  const navigate = useNavigate();

  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();

  // Función para crear nueva subpágina automáticamente
  const createSubPageAutomatically = useCallback(async () => {
    if (!projectId || !editor || hasCreatedRef.current) {
      return;
    }

    hasCreatedRef.current = true;
    setError(null);
    
    try {
      console.log('Creando subpágina automáticamente...');
      
      const result = await pageService.createPage({
        project_id: projectId,
        parent_page_id: pageId,
        title: 'Nueva página',
        is_published: false
      });

      if (result.data) {
        console.log('Subpágina creada:', result.data);
        
        // Actualizar el bloque actual con el pageId de la nueva página
        const blockId = attributes?.['data-yoopta-block-id'];
        if (blockId) {
          editor.updateBlock(blockId, {
            type: 'SubPage',
            value: [
              {
                id: 'subpage',
                type: 'sub-page',
                children: [{ text: '' }],
                props: {
                  pageId: result.data.id,
                  title: result.data.title,
                  isNew: false
                }
              }
            ]
          });
        }
        
        // Navegar a la nueva página después de un pequeño delay para que se guarde
        // setTimeout(() => {
        //   const newPageUrl = `/projects/${projectId}/pages/${result.data?.id}/edit`;
        //   navigate(newPageUrl);
        // }, 300);
      } else {
        throw new Error('No se pudo crear la página');
      }
    } catch (error: any) {
      console.error('Error al crear la subpágina:', error);
      setError(error.message || 'Error al crear la subpágina');
      hasCreatedRef.current = false; // Resetear para permitir retry
    }
  }, [projectId, pageId, navigate, editor, attributes]);

  // Crear automáticamente cuando es un bloque nuevo sin pageId
  useEffect(() => {
    if (!element.pageId && !hasCreatedRef.current) {
      createSubPageAutomatically();
    }
  }, [element.pageId, createSubPageAutomatically]);

  // Cargar información de la página si existe
  useEffect(() => {
    const loadPage = async () => {
      if (!element.pageId) return;
      
      setLoading(true);
      try {
        const result = await pageService.getPageById(element.pageId);
        if (result.data) {
          setPage(result.data);
        }
      } catch (error) {
        console.error('Error loading page:', error);
        setError('Error al cargar la página');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [element.pageId]);


  // Navegar a la página existente
  const handleNavigateToPage = useCallback(() => {
    if (element.pageId && projectId) {
      navigate(`/projects/${projectId}/pages/${element.pageId}/edit`);
    }
  }, [element.pageId, projectId, navigate]);

  // Manejar eliminación del bloque
  const handleRemove = useCallback(async () => {
    if (element.pageId && page) {
      // Preguntar si también quiere eliminar la página
      const deleteSubPage = window.confirm(
        `¿También quieres eliminar la página "${page.title}"?\n\n` +
        'Selecciona "Aceptar" para eliminar la página completamente, o "Cancelar" para solo quitar la referencia.'
      );

      if (deleteSubPage) {
        try {
          await pageService.deletePage(element.pageId);
        } catch (error) {
          console.error('Error al eliminar la página:', error);
        }
      }
    }

    // Eliminar el bloque del editor
    const blockId = attributes?.['data-yoopta-block-id'];
    if (blockId && editor) {
      editor.deleteBlock(blockId);
    }
  }, [editor, element, page, attributes]);

  // Si no hay pageId y no hay error, está creando la página
  if (!element.pageId && !error) {
    return (
      <div {...attributes} className="border border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-4 my-4 bg-blue-50 dark:bg-blue-900/20 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">Creando nueva página...</span>
        </div>
        {children}
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div {...attributes} className="border border-dashed border-red-300 dark:border-red-600 rounded-lg p-4 my-4 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText size={20} className="text-red-400" />
            <div>
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">Error al crear subpágina</span>
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              hasCreatedRef.current = false;
              setError(null);
              createSubPageAutomatically();
            }}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
        {children}
      </div>
    );
  }

  const pageTitle = element.title || page?.title || 'Cargando...';

  return (
    <div 
      {...attributes} 
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 my-2 bg-white dark:bg-gray-800 hover:shadow-sm transition-all duration-200 cursor-pointer" 
      onClick={handleNavigateToPage}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-grow">
          <div className="flex-shrink-0">
            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                {pageTitle}
              </h4>
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        {!readOnly && (
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleNavigateToPage}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Abrir página"
            >
              <ExternalLink size={12} />
            </button>
            
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

// =============== CREAR EL PLUGIN ===============

const BaseSubPagePlugin = new YooptaPlugin({
  type: 'SubPage',
  elements: {
    'sub-page': {
      render: (props) => (
        <SubPageComponent
          attributes={props.attributes}
          children={props.children}
          element={props.element as SubPageElement}
        />
      ),
      asRoot: true,
      props: {
        pageId: '',
        title: ''
      },
    }
  },
  options: {
    display: {
      title: 'Subpágina',
      description: 'Crear una nueva página anidada',
      icon: <FileText size={24} />,
    },
    shortcuts: ['subpage', 'pagina', '/page', '/subpage'],
  },
  parsers: {
    html: {
      deserialize: {
        nodeNames: ['SUB-PAGE'],
      },
    },
  },
});

// Extender el plugin con opciones personalizadas
export const SubPagePlugin = BaseSubPagePlugin.extend({
  options: {
    HTMLAttributes: {
      spellCheck: false,
      className: 'yoopta-sub-page',
    },
  },
});

export default SubPagePlugin;