import { useState, useEffect, type FC, useMemo } from 'react';
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Heading from '@yoopta/headings';
import BlockQuote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Table from '@yoopta/table';
import Image from '@yoopta/image';
import Link from '@yoopta/link';
import Lists from '@yoopta/lists';
import { MermaidPlugin } from './plugins/MermaidPlugin';
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool';
import ActionMenu, { DefaultActionMenuRender } from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from '@yoopta/marks';

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

const TOOLS = {
  Toolbar: {
    tool: Toolbar,
    render: DefaultToolbarRender,
  },
  ActionMenu: {
    tool: ActionMenu,
    render: DefaultActionMenuRender,
  },
  LinkTool: {
    tool: LinkTool,
    render: DefaultLinkToolRender,
  },
};

import mermaid from 'mermaid';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Document } from '../../types';
import { Save, Clock, Check } from 'lucide-react';
// import SubPagePlugin from './plugins/SubPagePlugin';

// Configuración de Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose'
});

interface DocumentEditorProps {
  documentId?: string;
  projectId?: string;
  categoryId?: string;
  initialContent?: any;
  onSave?: (document?: Document) => void;
  readOnly?: boolean;
}

const DocumentEditor: FC<DocumentEditorProps> = ({
  documentId,
  projectId,
  categoryId,
  initialContent,
  onSave,
  readOnly = false
}) => {
  const { user } = useAuth();
  // Inicializar contenido como un objeto vacío si es null o undefined
  const [content, setContent] = useState<any>(initialContent || {});
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versionMessage, setVersionMessage] = useState<string>('');
  const [showVersionDialog, setShowVersionDialog] = useState<boolean>(false);
  const [editorReady, setEditorReady] = useState<boolean>(false);

  // Definir los plugins a utilizar con useMemo para evitar re-renderizados
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
    Table,
    Image,
    // SubPagePlugin // Plugin simplificado sin callbacks adicionales
  ], []);

  // Crear el editor con los plugins
  const editor = useMemo(() => {
    try {
      const instance = createYooptaEditor();
      setEditorReady(true);
      return instance;
    } catch (err) {
      console.error("Error al crear el editor:", err);
      setError("Error al inicializar el editor. Por favor, recarga la página.");
      return null;
    }
  }, []);

  // Autoguardado
  useEffect(() => {
    if (readOnly || !documentId || !content || !editor || !editorReady) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, 5000); // Autoguardar cada 5 segundos

    return () => clearTimeout(timer);
  }, [content, documentId, readOnly, editor, editorReady]);

  // Función para autoguardar
  const handleAutoSave = async () => {
    try {
      if (!documentId || saving || !user) return;

      setSaving(true);

      // Actualizar documento
      const { error } = await supabase
        .from('documents')
        .update({
          content,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', documentId);

      if (error) throw error;

      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Error al autoguardar:', err);
      setError('Error al autoguardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Función para guardar versión
  const handleSaveVersion = async () => {
    try {
      if (!documentId || saving || !user) return;

      setSaving(true);
      setError(null);

      // 1. Obtener la última versión
      const { data: versionsData, error: versionsError } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (versionsError) throw versionsError;

      // 2. Determinar nuevo número de versión
      let versionNumber = '1.0.0';

      if (versionsData && versionsData.length > 0) {
        const latestVersion = versionsData[0].version_number;
        const parts = latestVersion.split('.');
        const minor = parseInt(parts[1]) + 1;
        versionNumber = `${parts[0]}.${minor}.0`;
      }

      // 3. Guardar nueva versión
      const { error: saveVersionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          content,
          version_number: versionNumber,
          commit_message: versionMessage || `Versión ${versionNumber}`,
          created_by: user.id,
          is_published: false
        });

      if (saveVersionError) throw saveVersionError;

      // 4. Actualizar documento con la última versión
      const { error: updateDocError } = await supabase
        .from('documents')
        .update({
          content,
          version: versionNumber,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', documentId);

      if (updateDocError) throw updateDocError;

      setLastSaved(new Date());
      setVersionMessage('');
      setShowVersionDialog(false);

      // Callback opcional para el padre
      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      console.error('Error al guardar versión:', err);
      setError('Error al guardar versión: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Función para guardar un nuevo documento
  const handleCreateDocument = async () => {
    try {
      if (!projectId || !categoryId || !user) return;
      setSaving(true);
      setError(null);

      // Generar slug a partir del título
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');

      // 1. Crear documento
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          category_id: categoryId,
          title,
          description,
          slug,
          content,
          version: '1.0.0',
          is_published: false,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (docError) throw docError;

      // 2. Crear versión inicial
      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: docData.id,
          content,
          version_number: '1.0.0',
          commit_message: 'Versión inicial',
          created_by: user.id,
          is_published: false
        });

      if (versionError) throw versionError;

      // Callback opcional para el padre
      if (onSave && docData) {
        onSave(docData);
      }
    } catch (err: any) {
      console.error('Error al crear documento:', err);
      setError('Error al crear documento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (newContent: any) => {
    setContent(newContent);
  };

  // Si el editor no se pudo crear, mostrar un mensaje de error
  if (!editor) {
    return (
      <div className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-md">
        Error al inicializar el editor. Por favor, recarga la página.
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {!documentId && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="mb-4">
            <label htmlFor="title" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Título del documento*
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del documento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Descripción
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {!readOnly && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {documentId && (
                <button
                  onClick={() => setShowVersionDialog(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors"
                  disabled={saving}
                >
                  <Save size={16} className="mr-1.5" />
                  {saving ? 'Guardando...' : 'Guardar versión'}
                </button>
              )}

              {!documentId && (
                <button
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving || !title}
                >
                  <Save size={16} className="mr-1.5" />
                  {saving ? 'Creando...' : 'Crear documento'}
                </button>
              )}
            </div>

            {lastSaved && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Clock size={14} className="mr-1" />
                Guardado {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        <div className="py-4 px-14 w-full">
          {editorReady && (
            <YooptaEditor
              editor={editor}
              plugins={plugins}
              value={content}
              readOnly={readOnly}
              onChange={handleEditorChange}
              tools={TOOLS}
              marks={MARKS}
              autoFocus={true}
              className="focus:outline-none"
              style={{ height: '100%', width: '100%', minHeight: '400px' }}
            />
          )}
        </div>
      </div>

      {/* Modal de versión */}
      {showVersionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Guardar nueva versión
            </h3>

            <div className="mb-4">
              <label htmlFor="versionMessage" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Mensaje de la versión
              </label>
              <textarea
                id="versionMessage"
                value={versionMessage}
                onChange={(e) => setVersionMessage(e.target.value)}
                placeholder="Describe los cambios realizados (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowVersionDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors"
                disabled={saving}
              >
                <Check size={16} className="mr-1.5" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;