import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Heading from '@yoopta/headings';
import BlockQuote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Link from '@yoopta/link';
import Lists from '@yoopta/lists';
import Table from '@yoopta/table';
import { useMemo, type FC } from 'react';
import mermaid from 'mermaid';
import { ImagePlugin } from '../editor/plugins/ImagePlugin';
import { MermaidPlugin } from '../editor/plugins/MermaidPlugin';
// import SubPagePlugin from '../editor/plugins/SubPagePlugin';

// Configuración de Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose'
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
    MermaidPlugin,
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