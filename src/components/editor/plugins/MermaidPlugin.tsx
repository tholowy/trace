import { YooptaPlugin, useYooptaEditor, useBlockData, useYooptaReadOnly } from '@yoopta/editor';
import { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import {
  ActivitySquareIcon,
  Maximize,
  ZoomIn,
  ZoomOut,
  X,
  AlertCircle,
  Settings,
  Trash2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Generar ID único para elementos Mermaid
const generateUniqueId = () => `yoopta-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MermaidDiagram = (props: any) => {
  const { attributes, children, element } = props;
  const editor = useYooptaEditor();
  const readOnly = useYooptaReadOnly();
  const blockData = useBlockData(element.id);

  // Usar blockData si existe, sino usar element.props
  const elementProps = blockData?.props || element.props || {};

  console.log('Mermaid Debug:', { blockData, element, elementProps });

  const {
    code: initialCode = 'graph TD;\nA-->B;\nB-->C;',
    height: initialHeight = 400
  } = elementProps;

  // Estados locales
  const [code, setCode] = useState(initialCode);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [blockHeight, setBlockHeight] = useState(initialHeight);
  const [localMermaidData, setLocalMermaidData] = useState<any>(null);
  
  // Estados para el modal maximizado
  const [isMaximized, setIsMaximized] = useState(false);
  const [modalZoomLevel, setModalZoomLevel] = useState(1);
  const [modalPanOffset, setModalPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalDiagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        e.preventDefault();
        setIsMaximized(false);
        setIsPanning(false);
      }
    };

    if (isMaximized) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMaximized]);

  // Sincronizar con blockData cuando cambie
  useEffect(() => {
    if (blockData?.props) {
      const { code: newCode, height: newHeight } = blockData.props;
      
      if (newCode !== undefined && newCode !== code) {
        setCode(newCode);
      }
      if (newHeight !== undefined && newHeight !== blockHeight) {
        setBlockHeight(newHeight);
      }
    }
  }, [blockData?.props, code, blockHeight]);

  // Limpiar estado local cuando blockData se sincroniza
  useEffect(() => {
    if (blockData?.props && localMermaidData) {
      console.log('🔄 BlockData sincronizado, limpiando estado local');
      setTimeout(() => {
        setLocalMermaidData(null);
      }, 500);
    }
  }, [blockData?.props, localMermaidData]);

  const updateElement = useCallback(async (updates: any) => {
    if (!editor || readOnly) {
      return;
    }

    console.log('🔄 Actualizando elemento Mermaid:', {
      elementId: element.id,
      updates: updates,
    });

    // Actualizar estado local inmediatamente para UI responsiva
    const newLocalData = {
      ...elementProps,
      ...updates,
    };
    setLocalMermaidData(newLocalData);

    try {
      const currentValue = editor.getEditorValue();
      console.log('📊 Valor actual del editor:', currentValue);

      let targetBlockId = null;
      let targetBlock = null;

      // Buscar el bloque contenedor - similar al plugin de imagen
      Object.keys(currentValue).forEach((blockId) => {
        const block = currentValue[blockId];
        
        // Verificar si es el bloque principal
        if (block.id === element.id) {
          targetBlockId = blockId;
          targetBlock = block;
        } 
        // Verificar si está en el array value
        else if (block.value && Array.isArray(block.value)) {
          const elementInBlock = block.value.find((el: any) => el.id === element.id);
          if (elementInBlock) {
            targetBlockId = blockId;
            targetBlock = block;
          }
        }
        // Verificar si es un bloque de tipo Mermaid
        else if (block.type === 'Mermaid') {
          targetBlockId = blockId;
          targetBlock = block;
        }
      });

      if (!targetBlockId || !targetBlock) {
        console.error('❌ No se encontró el bloque contenedor');
        return;
      }

      console.log('📍 Bloque encontrado:', { targetBlockId, targetBlock });

      let updatedBlockData;

      // Si el bloque tiene un array value, actualizar el elemento dentro del array
      if (targetBlock.value && Array.isArray(targetBlock.value)) {
        updatedBlockData = {
          ...targetBlock,
          value: targetBlock.value.map((el: any) => {
            if (el.id === element.id) {
              return {
                ...el,
                props: {
                  ...el.props,
                  ...updates,
                },
              };
            }
            return el;
          }),
        };
      } else {
        // Si no tiene array value, actualizar props directamente en el bloque
        updatedBlockData = {
          ...targetBlock,
          props: {
            ...targetBlock.props,
            ...updates,
          },
          // También asegurar que tenga un value array para consistencia
          value: targetBlock.value || [
            {
              id: element.id,
              type: 'mermaid-diagram',
              props: {
                ...elementProps,
                ...updates,
                nodeType: 'void',
              },
              children: [{ text: '' }],
            },
          ],
        };
      }

      console.log('📝 Datos del bloque actualizado:', updatedBlockData);

      const newEditorValue = {
        ...currentValue,
        [targetBlockId]: updatedBlockData,
      };

      editor.setEditorValue(newEditorValue);
      console.log('✅ Editor actualizado con setEditorValue');

      // Notificar cambios al contexto
      setTimeout(() => {
        const context = (window as any).yooptaContext;
        if (context?.onEditorChange) {
          console.log('📡 Notificando cambio al contexto');
          context.onEditorChange(newEditorValue);
        }
      }, 100);

    } catch (err) {
      console.error('❌ Error al actualizar el elemento Mermaid:', err);
      setError('Error al actualizar el diagrama en el editor.');
      // Mantener datos locales en caso de error
    }
  }, [editor, element.id, readOnly, elementProps]);

  // Función para renderizar el diagrama Mermaid
  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvg('');
      setError(null);
      return;
    }

    try {
      mermaid.initialize({ 
        startOnLoad: false, 
        securityLevel: 'strict',
        theme: 'default',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
      
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

  // Renderizar diagrama cuando cambie el código
  useEffect(() => {
    renderDiagram(code);
  }, [code, renderDiagram]);

  // Manejar cambios en el código
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const newCode = e.target.value;
    setCode(newCode);
    updateElement({ code: newCode });
  }, [updateElement]);

  // Manejar eventos de teclado en el textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    
    if (e.ctrlKey && e.key === 'a') {
      return;
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
      
      updateElement({ code: newValue });
    }
  }, [code, updateElement]);

  const handleTextareaClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
  }, []);

  const handleHeightChange = useCallback((delta: number) => {
    const newHeight = Math.max(200, Math.min(800, blockHeight + delta));
    setBlockHeight(newHeight);
    updateElement({ height: newHeight });
  }, [blockHeight, updateElement]);

  const openMaximizedView = useCallback(() => {
    setIsMaximized(true);
    setModalZoomLevel(1);
    setModalPanOffset({ x: 0, y: 0 });
  }, []);

  const closeMaximizedView = useCallback(() => {
    setIsMaximized(false);
    setIsPanning(false);
  }, []);

  const handleModalZoomIn = useCallback(() => {
    setModalZoomLevel(prev => Math.min(prev + 0.2, 5));
  }, []);

  const handleModalZoomOut = useCallback(() => {
    setModalZoomLevel(prev => Math.max(prev - 0.2, 0.2));
  }, []);

  const resetModalZoomAndPan = useCallback(() => {
    setModalZoomLevel(1);
    setModalPanOffset({ x: 0, y: 0 });
  }, []);

  const handleModalMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isMaximized && modalDiagramRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setModalZoomLevel(prev => Math.max(0.2, Math.min(5, prev + delta)));
      }
    };

    if (isMaximized && modalDiagramRef.current) {
      const element = modalDiagramRef.current;
      element.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        element.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isMaximized]);

  // Listeners globales para paneo en modal
  useEffect(() => {
    if (isPanning && isMaximized) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        
        setModalPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      };

      const handleGlobalMouseUp = () => {
        setIsPanning(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, isMaximized, lastPanPoint]);

  const handleDelete = useCallback(async () => {
    if (!editor || readOnly) {
      return;
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este diagrama?")) {
      try {
        const currentValue = editor.getEditorValue();
        
        // Buscar el bloque que contiene este elemento
        const blockId = Object.keys(currentValue).find(id => {
          const block = currentValue[id];
          return block.id === element.id || 
                 (block.value && Array.isArray(block.value) && 
                  block.value.some((el: any) => el.id === element.id)) ||
                 (block.type === 'Mermaid');
        });

        if (blockId) {
          console.log("🗑️ Eliminando bloque:", blockId);
          editor.deleteBlock({ blockId });
        } else {
          console.error("❌ No se encontró el bloque para eliminar");
          setError("No se pudo encontrar el bloque para eliminar.");
        }
      } catch (err) {
        console.error("Error eliminando bloque de diagrama Mermaid:", err);
        setError("Error al eliminar el diagrama.");
      }
      setShowSettings(false);
    }
  }, [editor, element.id, readOnly]);

  const SettingsPanel = () => {
    return (
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        contentEditable={false}
      >
        <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              Configuración de Diagrama
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Altura del bloque: {blockHeight}px
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleHeightChange(-50)}
                  className="p-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="50"
                  value={blockHeight}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value);
                    setBlockHeight(newHeight);
                    updateElement({ height: newHeight });
                  }}
                  className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => handleHeightChange(50)}
                  className="p-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Edita el código directamente en el área de texto.
              Usa el botón maximizar para una vista completa con controles de zoom.
              <br />
              <span className="font-medium">Presiona 'Escape' para salir del modo maximizado.</span>
            </p>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Diagrama
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MaximizedModal = () => {
    if (!isMaximized) return null;

    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col z-50" contentEditable={false}>
        {/* Header del modal */}
        <div className="bg-card border-b border-border p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-card-foreground">
            Diagrama Mermaid - Vista Maximizada {readOnly && '(Solo lectura)'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleModalZoomOut}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm px-3 py-1 bg-muted rounded-md min-w-[4rem] text-center">
              {Math.round(modalZoomLevel * 100)}%
            </span>
            <button
              onClick={handleModalZoomIn}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetModalZoomAndPan}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
              title="Resetear vista"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={closeMaximizedView}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
              title="Cerrar (o presiona Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor de código en el modal - siempre visible */}
          <div className="w-1/3 bg-card border-r border-border p-4 overflow-auto">
            <div className="mb-3">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Código Mermaid {readOnly && '(Solo lectura)'}
              </label>
            </div>
            <textarea
              value={code}
              onChange={readOnly ? undefined : handleCodeChange}
              onKeyDown={readOnly ? undefined : handleKeyDown}
              onClick={readOnly ? undefined : handleTextareaClick}
              readOnly={readOnly}
              placeholder="Código Mermaid..."
              className={`w-full h-full p-3 bg-input border border-border rounded-md text-sm font-mono focus:outline-none text-foreground placeholder:text-muted-foreground resize-none ${
                readOnly 
                  ? 'cursor-default' 
                  : 'focus:ring-2 focus:ring-ring'
              }`}
              spellCheck="false"
            />
          </div>

          {/* Vista del diagrama */}
          <div className="flex-1 bg-secondary/20 relative overflow-hidden">
            <div
              ref={modalDiagramRef}
              className={`w-full h-full flex items-center justify-center ${
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleModalMouseDown}
              style={{ touchAction: 'none' }}
            >
              <div
                style={{
                  transform: `translate(${modalPanOffset.x}px, ${modalPanOffset.y}px) scale(${modalZoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                {error ? (
                  <div className="flex flex-col items-center justify-center p-8 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="text-center max-w-md">{error}</p>
                  </div>
                ) : svg ? (
                  <div dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-diagram-svg" />
                ) : (
                  <div className="text-muted-foreground text-xl">Esperando código Mermaid...</div>
                )}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm text-card-foreground text-sm px-3 py-2 rounded-md border border-border">
              Arrastra para mover • Rueda para zoom • <kbd className="kbd text-xs ml-1">Esc</kbd> para cerrar
            </div>
          </div>
        </div>
      </div>
    );
  };

  // En modo readonly, solo mostrar preview con botón de maximizar
  if (readOnly) {
    return (
      <>
        <div 
          {...attributes} 
          className="border border-border rounded-lg overflow-hidden my-4 relative group bg-card"
          contentEditable={false}
          suppressContentEditableWarning={true}
        >
          {/* Botón de maximizar para readonly */}
          <button
            onClick={openMaximizedView}
            className="absolute top-2 right-2 p-2 bg-card/80 backdrop-blur-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors opacity-0 group-hover:opacity-100 z-10"
            title="Vista maximizada con código (presiona Escape para salir)"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <div 
            className="bg-card p-4 relative overflow-hidden flex items-center justify-center"
            style={{ minHeight: '200px', height: blockHeight }}
          >
            {error ? (
              <div className="flex flex-col items-center justify-center p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="w-6 h-6 mb-2" />
                <p className="text-sm text-center">{error}</p>
              </div>
            ) : svg ? (
              <div 
                dangerouslySetInnerHTML={{ __html: svg }} 
                className="mermaid-diagram-svg max-w-full max-h-full"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Esperando código Mermaid...</div>
            )}
          </div>
          {children}
        </div>

        <MaximizedModal />
      </>
    );
  }

  // Modo edición: código arriba, gráfica debajo
  return (
    <>
      <div 
        {...attributes} 
        className="border border-border rounded-lg overflow-hidden my-4 relative group bg-card"
        contentEditable={false}
        suppressContentEditableWarning={true}
      >
        {/* Toolbar */}
        <div 
          className="bg-secondary/50 p-2 border-b border-border flex justify-between items-center"
          contentEditable={false}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Diagrama Mermaid</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Configuración del diagrama"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={openMaximizedView}
              className="p-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Vista maximizada (presiona Escape para salir)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido: código arriba, gráfica debajo */}
        <div style={{ height: blockHeight }}>
          {/* Editor de código */}
          <div className="border-b border-border bg-card" style={{ height: '40%' }}>
            <div className="p-3 h-full">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                onClick={handleTextareaClick}
                placeholder="Ingresa el código Mermaid aquí... (ejemplo: graph TD; A-->B; B-->C;)"
                className="w-full h-full p-3 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
                spellCheck="false"
                contentEditable={false}
                suppressContentEditableWarning={true}
              />
            </div>
          </div>

          {/* Vista del diagrama */}
          <div className="bg-card" style={{ height: '60%' }}>
            <div 
              className="p-4 relative overflow-hidden flex items-center justify-center h-full"
            >
              {error ? (
                <div className="flex flex-col items-center justify-center p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-6 h-6 mb-2" />
                  <p className="text-sm text-center">{error}</p>
                </div>
              ) : svg ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: svg }} 
                  className="mermaid-diagram-svg max-w-full max-h-full"
                />
              ) : (
                <div className="text-muted-foreground text-sm">Esperando código Mermaid...</div>
              )}
            </div>
          </div>
        </div>

        {showSettings && <SettingsPanel />}
        {children}
      </div>

      <MaximizedModal />
    </>
  );
};

// Configuración del Plugin - simplificada sin viewMode
const BaseMermaidPlugin = new YooptaPlugin({
  type: 'Mermaid',
  elements: {
    'mermaid-diagram': {
      render: MermaidDiagram,
      props: {
        nodeType: 'void',
        code: 'graph TD;\nA-->B;\nB-->C;',
        height: 400,
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
          const height = el.getAttribute('height');
          return {
            id: generateUniqueId(),
            type: 'Mermaid',
            props: {
              code: code ? decodeURIComponent(code) : 'graph TD;\nA-->B;\nB-->C;',
              height: height ? parseInt(height) : 400,
            },
            children: [{ text: '' }],
          };
        },
      },
      serialize: (element: any) => {
        const { code, height } = element.props || {};
        if (!code) return '';
        return `<mermaid-diagram code="${encodeURIComponent(code)}" height="${height || 400}"></mermaid-diagram>`;
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