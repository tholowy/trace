import { YooptaPlugin } from '@yoopta/editor';
import { useState, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';
import { ActivitySquareIcon } from 'lucide-react';

// Componente de renderizado para el diagrama Mermaid
const MermaidDiagram = (props: any) => {
  const { attributes, children, element, readOnly, editor } = props;
  const [code, setCode] = useState(element.code || 'graph TD;\nA-->B;\nB-->C;');
  const [svg, setSvg] = useState('');
  
  const renderDiagram = useCallback(async (source: string) => {
    if (!source) return;
    try {
      const { svg } = await mermaid.render('mermaid-diagram-' + Date.now(), source);
      setSvg(svg);
    } catch (error: any) {
      console.error('Error rendering Mermaid diagram:', error);
      setSvg(`<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
        Error en el diagrama: ${error.message || 'Sintaxis incorrecta'}
      </div>`);
    }
  }, []);
  
  // Renderizar diagrama al cargar o cambiar el código
  useEffect(() => {
    if (code) {
      renderDiagram(code);
    }
  }, [code, renderDiagram]);
  
  // Manejar cambios en el editor de código
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    
    // Actualizar el elemento en el editor
    if (editor && editor.findPath) {
      try {
        const path = editor.findPath(element);
        editor.setNodes({ code: newCode }, { at: path });
      } catch (err) {
        console.error('Error al actualizar el diagrama Mermaid:', err);
      }
    }
  };
  
  return (
    <div {...attributes} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden my-4">
      {!readOnly && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
          <textarea
            value={code}
            onChange={handleCodeChange}
            placeholder="Ingresa el código Mermaid aquí... (ejemplo: graph TD; A-->B; B-->C;)"
            className="w-full min-h-[100px] p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
          />
        </div>
      )}
      
      <div
        className="bg-white dark:bg-gray-800 p-4 flex justify-center overflow-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {children}
    </div>
  );
};

// Crear el plugin base usando la clase YooptaPlugin
const BaseMermaidPlugin = new YooptaPlugin({
  type: 'Mermaid',
  elements: {
    'mermaid-diagram': {
      render: MermaidDiagram,
      asRoot: true,
      props: {
        code: 'graph TD;\nA-->B;\nB-->C;',
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
      },
    },
  },
});

// Extender el plugin con opciones personalizadas
export const MermaidPlugin = BaseMermaidPlugin.extend({
  options: {
    // Puedes personalizar las opciones aquí o mantener las mismas
    HTMLAttributes: {
      spellCheck: false,
      className: 'yoopta-mermaid-diagram',
    },
  },
});