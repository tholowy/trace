import { YooptaPlugin, useYooptaEditor } from '@yoopta/editor';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { pageService } from '../../../services/pageService';
import type { Page } from '../../../types';

// A simple utility to generate a unique ID for inner elements (if needed)
const generateShortId = () => {
  return Math.random().toString(36).substring(2, 9);
};

// =============== INTERFACES ===============

interface SubPageElement {
  id: string; // Add id to the interface as it's directly from element.id
  pageId?: string;
  title?: string;
  isNew?: boolean; // Keep this if you use it for internal logic
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
  console.log('SubPageComponent attributes:', attributes);
  console.log('SubPageComponent element:', element); // This should now show the ID

  const editor = useYooptaEditor();

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state directly from element props. This is crucial.
  const [displayTitle, setDisplayTitle] = useState<string | undefined>(element.title);

  // This ref is still useful to prevent multiple rapid backend calls if the
  // `createAndReplaceSubPageAutomatically` runs multiple times before the
  // `element.pageId` is updated by Yoopta.
  const hasPageCreationStartedRef = useRef(false);

  const navigate = useNavigate();
  const { projectId, pageId: currentPageId } = useParams<{ projectId: string; pageId: string }>();

  // Function to create new subpage automatically and replace the block
  const createAndReplaceSubPageAutomatically = useCallback(async () => {
    // Only proceed if element.pageId is explicitly missing, we have project ID and editor
    // AND page creation hasn't already started for this component instance.
    if (element.pageId || !projectId || !editor || hasPageCreationStartedRef.current) {
      return;
    }

    hasPageCreationStartedRef.current = true; // Mark that page creation process has started
    setError(null);
    setLoading(true); // Show loading state

    try {
      console.log('Creando subpágina automáticamente en el backend...');

      const result = await pageService.createPage({
        project_id: projectId,
        parent_page_id: currentPageId,
        title: 'Nueva página',
        is_published: false
      });

      if (result.data) {
        console.log('Subpágina creada en el backend:', result.data);

        // The ID of the current, existing block from the element prop
        const currentBlockId = element.id; 
        console.log('ID del bloque actual (element.id):', currentBlockId);

        if (currentBlockId) {
          // Define the content for the new block, using the same ID
          const newBlockContent = {
            id: currentBlockId, // Use the existing block ID
            type: 'SubPage', // This is the block type defined in your plugin
            value: [
              {
                id: 'subpage-element-' + generateShortId(), // Unique ID for the inner element
                type: 'sub-page', // This is the element type
                children: [{ text: '' }],
                props: {
                  pageId: result.data.id,
                  title: result.data.title,
                  isNew: false // Now it's not "new" in terms of needing a backend page
                }
              }
            ]
          };

          console.log('Reemplazando bloque existente con ID:', currentBlockId, 'con nuevo contenido:', newBlockContent);
          // Use editor.updateBlock if replaceBlock is causing issues, but replaceBlock is safer here.
          // If you reverted to updateBlock, stick with updateBlock. If you were using replaceBlock, continue.
          editor.updateBlock(currentBlockId, newBlockContent); 

          // Update local state to reflect the new page data immediately
          setDisplayTitle(result.data.title);
          setPage(result.data); // Update the fetched page state
          console.log('Subpágina creada y bloque actualizado/reemplazado en el editor.');
        } else {
            console.error('Error: element.id no está disponible. El bloque no se actualizará en el editor.');
        }

      } else {
        throw new Error('No se pudo crear la página en el backend.');
      }
    } catch (error: any) {
      console.error('Error al crear la subpágina:', error);
      setError(error.message || 'Error al crear la subpágina');
      hasPageCreationStartedRef.current = false; // Allow retry if an error occurred
    } finally {
      setLoading(false); // Hide loading state
    }
  }, [projectId, currentPageId, editor, element.id, element.pageId]); // Depend on element.id and element.pageId

  // Effect to trigger automatic creation ONLY if element.pageId is explicitly empty
  useEffect(() => {
    // Only trigger if element.pageId is undefined or an empty string,
    // and we haven't already initiated the creation process for this component instance.
    if (!element.pageId && !hasPageCreationStartedRef.current) {
      createAndReplaceSubPageAutomatically();
    }
  }, [element.pageId, createAndReplaceSubPageAutomatically]);


  // Effect to load page information if pageId exists (either initially or after creation)
  useEffect(() => {
    const loadPage = async () => {
      // Use element.pageId for fetching, as this is the canonical source from Yoopta.
      if (!element.pageId) return;

      // If we already have the page data in 'page' state and it matches element.pageId, no need to fetch again
      if (page && page.id === element.pageId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await pageService.getPageById(element.pageId);
        if (result.data) {
          setPage(result.data);
          setDisplayTitle(result.data.title);
        } else {
          setError('Página no encontrada o eliminada.');
        }
      } catch (error) {
        console.error('Error al cargar la página:', error);
        setError('Error al cargar la página.');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [element.pageId, page]); // Depend on element.pageId (the source of truth from Yoopta) and local 'page' state

  // Navegar a la página existente
  const handleNavigateToPage = useCallback(() => {
    // Use element.pageId for navigation as it's the most reliable source.
    if (element.pageId && projectId) {
      navigate(`/projects/${projectId}/pages/${element.pageId}/edit`);
    }
  }, [element.pageId, projectId, navigate]);

  // --- Render Logic ---

  // If element.pageId is missing (new block) and we are loading or have no error yet, show creating message
  if (!element.pageId && loading && !error) {
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

  // If there's an error
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
              // Reset the ref to allow re-attempt
              hasPageCreationStartedRef.current = false;
              setError(null);
              createAndReplaceSubPageAutomatically();
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

  // Use element.title if available, otherwise displayTitle or fallback
  const finalPageTitle = element.title || displayTitle || page?.title || 'Cargando...';

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
                {finalPageTitle}
              </h4>
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
              )}
            </div>
          </div>
        </div>
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

export const SubPagePlugin = BaseSubPagePlugin.extend({
  options: {
    HTMLAttributes: {
      spellCheck: false,
      className: 'yoopta-sub-page',
    },
  },
});

export default SubPagePlugin;