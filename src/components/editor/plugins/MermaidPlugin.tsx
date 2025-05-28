import { YooptaPlugin, useYooptaEditor, useBlockData } from '@yoopta/editor';
import { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import {
  ActivitySquareIcon,
  Code2,
  Eye,
  Columns,
  Maximize,
  ZoomIn,
  ZoomOut,
  X,
  AlertCircle,
  Settings,
  Trash2,
} from 'lucide-react';

// For generating unique IDs, typically you'd use a library like 'uuid'
// For this example, a simple date-based ID will suffice.
const generateUniqueId = () => `yoopta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

enum ViewMode {
  Code = 'code',
  Preview = 'preview',
  Split = 'split',
}

const MermaidDiagram = (props: any) => {
  const { attributes, children, element } = props;
  const editor = useYooptaEditor();
  const readOnly = editor?.readOnly || false;
  const blockData = useBlockData(element.id);

  const elementProps = blockData?.props || element.props || {};

  const {
    code: initialCode = 'graph TD;\nA-->B;\nB-->C;',
    viewMode: initialViewMode = ViewMode.Split
  } = elementProps;

  const [code, setCode] = useState(initialCode);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const diagramContainerRef = useRef<HTMLDivElement>(null);

  const updateElement = useCallback(async (updates: any) => {
    if (!editor) {
      console.error("Editor no disponible para actualizar elemento Mermaid.");
      return;
    }

    try {
      editor.setNodes({
        props: {
          ...element.props,
          ...updates,
        },
      }, { at: editor.findPath(element) });

      setTimeout(() => {
        const context = (window as any).yooptaContext;
        if (context?.onEditorChange) {
          context.onEditorChange(editor.getEditorValue());
        }
      }, 50);
    } catch (err) {
      console.error("Error al actualizar el elemento Mermaid con setNodes:", err);
      setError("Error al actualizar el diagrama en el editor.");
    }
  }, [editor, element]);

  const renderDiagram = useCallback(async (source: string) => {
    if (!source) {
      setSvg('');
      setError(null);
      return;
    }
    try {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      const renderId = `mermaid-diagram-${element.id}-${Date.now()}`;
      const { svg } = await mermaid.render(renderId, source);
      setSvg(svg);
      setError(null);
    } catch (error: any) {
      console.error('Error rendering Mermaid diagram:', error);
      setSvg('');
      setError(`Error en el diagrama: ${error.message || 'Sintaxis incorrecta'}`);
    }
  }, [element.id]);

  useEffect(() => {
    if (blockData?.props?.code !== undefined && blockData.props.code !== code) {
      setCode(blockData.props.code);
    }
    if (blockData?.props?.viewMode !== undefined && blockData.props.viewMode !== viewMode) {
      setViewMode(blockData.props.viewMode);
    }
  }, [blockData?.props?.code, blockData?.props?.viewMode]);

  useEffect(() => {
    renderDiagram(code);
  }, [code, renderDiagram]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    updateElement({ code: newCode });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    updateElement({ viewMode: mode });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleDelete = useCallback(async () => {
    if (!editor) {
      console.error("Editor no disponible para eliminar.");
      return;
    }
    if (confirm("¿Estás seguro de que quieres eliminar este diagrama?")) {
      try {
        editor.deleteBlock(element.id);
        console.log("Bloque de diagrama Mermaid eliminado correctamente:", element.id);
      } catch (err) {
        console.error("Error eliminando bloque de diagrama Mermaid:", err);
        setError("Error al eliminar el diagrama.");
      }
      setShowSettings(false);
    }
  }, [editor, element.id]);

  const SettingsPanel = () => {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-45">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              Configuración de Diagrama
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Edita el código directamente en el área de texto.
              Usa esta sección para eliminar el diagrama completo.
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Diagrama
            </button>
            <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
              >
                Cerrar
              </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const codeEditor = (
      <textarea
        value={code}
        onChange={handleCodeChange}
        placeholder="Ingresa el código Mermaid aquí... (ejemplo: graph TD; A-->B; B-->C;)"
        className="w-full min-h-[150px] p-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-y"
        spellCheck="false"
      />
    );

    const diagramPreview = (
      <div
        ref={diagramContainerRef}
        className="bg-card p-4 flex justify-center overflow-auto max-h-[400px] relative"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center p-4 text-red-500 bg-red-100 border border-red-200 rounded-md">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-diagram-svg" />
        ) : (
          <div className="text-gray-400 text-sm">Esperando código Mermaid...</div>
        )}
      </div>
    );

    switch (viewMode) {
      case ViewMode.Code:
        return <div className="p-3">{codeEditor}</div>;
      case ViewMode.Preview:
        return <div className="p-3">{diagramPreview}</div>;
      case ViewMode.Split:
      default:
        return (
          <div className="flex flex-col md:flex-row h-full">
            <div className="md:w-1/2 p-3 border-b md:border-b-0 md:border-r border-border">
              {codeEditor}
            </div>
            <div className="md:w-1/2 p-3">
              {diagramPreview}
            </div>
          </div>
        );
    }
  };

  return (
    <div {...attributes} className={`border border-border rounded-md overflow-hidden my-4 relative group ${isExpanded ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}`}>
      {!readOnly && (
        <div className={`bg-secondary/20 p-2 border-b border-border flex justify-between items-center ${isExpanded ? 'flex-shrink-0' : ''}`}>
          <div className="flex space-x-1">
            <button
              onClick={() => handleViewModeChange(ViewMode.Code)}
              className={`p-2 rounded-md text-sm flex items-center gap-1 ${viewMode === ViewMode.Code ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Modo Código"
            >
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">Código</span>
            </button>
            <button
              onClick={() => handleViewModeChange(ViewMode.Preview)}
              className={`p-2 rounded-md text-sm flex items-center gap-1 ${viewMode === ViewMode.Preview ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Modo Previsualización"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Previsualizar</span>
            </button>
            <button
              onClick={() => handleViewModeChange(ViewMode.Split)}
              className={`p-2 rounded-md text-sm flex items-center gap-1 ${viewMode === ViewMode.Split ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Modo Dividido"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden sm:inline">Dividido</span>
            </button>
          </div>
          <div className="flex space-x-1">
            {viewMode !== ViewMode.Code && (
              <>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-md text-sm hover:bg-secondary"
                  title="Acercar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-md text-sm hover:bg-secondary"
                  title="Alejar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={toggleExpand}
              className="p-2 rounded-md text-sm hover:bg-secondary"
              title={isExpanded ? "Reducir" : "Expandir"}
            >
              {isExpanded ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <div className={isExpanded ? 'flex-grow overflow-auto' : ''}>
        {renderContent()}
      </div>

      {!readOnly && !isExpanded && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          contentEditable={false}
        >
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            title="Configuración del diagrama"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {showSettings && <SettingsPanel />}
      {children}
    </div>
  );
};

const BaseMermaidPlugin = new YooptaPlugin({
  type: 'Mermaid',
  elements: {
    'mermaid-diagram': {
      render: MermaidDiagram,
      asRoot: true,
      props: {
        code: 'graph TD;\nA-->B;\nB-->C;',
        viewMode: ViewMode.Split,
      },
    }
  },
  options: {
    display: {
      title: 'Diagrama Mermaid',
      description: 'Crear un diagrama con sintaxis Mermaid',
      icon: <ActivitySquareIcon size={24} />,
    },
    shortcuts: ['mermaid', 'diagrama'],
  },
  parsers: {
    html: {
      deserialize: {
        nodeNames: ['MERMAID-DIAGRAM'],
        parse: (el: HTMLElement) => {
            const code = el.getAttribute('code');
            return {
                id: generateUniqueId(), // Generate a unique ID for the new element
                type: 'Mermaid', // Make sure this matches the plugin type
                props: {
                    code: code ? decodeURIComponent(code) : 'graph TD;\nA-->B;\nB-->C;',
                    viewMode: ViewMode.Split,
                },
                children: [{ text: '' }], // Required for SlateElement, even for void elements
            };
        },
      },
      serialize: (element: any) => {
        const { code } = element.props || {};
        if (!code) return '';
        return `<mermaid-diagram code="${encodeURIComponent(code)}"></mermaid-diagram>`;
      },
    },
  },
});

export const MermaidPlugin = BaseMermaidPlugin.extend({
  options: {
    HTMLAttributes: {
      spellCheck: false,
      className: 'yoopta-mermaid-diagram',
    },
  },
});