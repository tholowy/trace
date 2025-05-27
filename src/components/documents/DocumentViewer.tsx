import YooptaEditor, { createYooptaEditor, YooptaPlugin } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Heading from '@yoopta/headings';
import BlockQuote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Link from '@yoopta/link';
import Lists from '@yoopta/lists';
import Table from '@yoopta/table';
import { useEffect, useMemo, useState, type FC } from 'react';
import mermaid from 'mermaid';
import { ActivitySquareIcon } from 'lucide-react';
import { ImagePlugin } from '../editor/plugins/ImagePlugin';
// import SubPagePlugin from '../editor/plugins/SubPagePlugin';

// Configuración de Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose'
});

const MermaidViewDiagram = (props: any) => {
  const { attributes, element, children } = props;
  const [svg, setSvg] = useState('');

  useEffect(() => {
    async function renderDiagram() {
      try {
        if (element.code) {
          const { svg } = await mermaid.render('mermaid-view-' + Date.now(), element.code);
          setSvg(svg);
        }
      } catch (error: any) {
        setSvg(`<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
          Error en el diagrama: ${error.message || 'Sintaxis incorrecta'}
        </div>`);
      }
    }
    renderDiagram();
  }, [element.code]);

  return (
    <div {...attributes} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden my-4">
      <div
        className="bg-white dark:bg-gray-800 p-4 flex justify-center overflow-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {children}
    </div>
  );
};

// Plugin de solo visualización para Mermaid
export const MermaidViewPlugin = new YooptaPlugin({
  type: 'MermaidView',
  elements: {
    'mermaid-view-diagram': {
      render: MermaidViewDiagram,
      asRoot: true,
      props: {
        code: '',
      },
    }
  },
  options: {
    display: {
      title: 'Diagrama Mermaid (solo vista)',
      description: 'Visualiza un diagrama Mermaid',
      icon: <ActivitySquareIcon size={24} />,
    },
  },
  parsers: {
    html: {
      deserialize: {
        nodeNames: ['MERMAID-VIEW-DIAGRAM'],
      },
    },
  },
});

interface DocumentViewerProps {
  content: any;
}

const DocumentViewer: FC<DocumentViewerProps> = ({ content }) => {
  // Definir los plugins
    const plugins = useMemo(() => [
    Paragraph,
    Heading.HeadingOne,
    Heading.HeadingTwo,
    Heading.HeadingThree,
    BlockQuote.extend({
      options: {
        HTMLAttributes: {
          className: 'my-custom-blockquote',
        },
      },
    }),
    Code,
    Link,
    Lists.BulletedList,
    Lists.NumberedList,
    Lists.TodoList,
    MermaidViewPlugin,
    ImagePlugin,
    Table,
    // SubPagePlugin
  ], []);
  
  // Crear el editor en modo solo lectura
    const editor = useMemo(() => createYooptaEditor(), [])
  
  if (!content) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">El documento está vacío</div>;
  }
  
  return (
    <div className="prose dark:prose-invert max-w-none">
      <YooptaEditor
        editor={editor}
        value={content}
        plugins={plugins}
        readOnly={true}
        className="focus:outline-none"
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      />
    </div>
  );
};

export default DocumentViewer;