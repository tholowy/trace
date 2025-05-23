import { useState, useEffect, type FC, useMemo, useRef } from 'react';
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Heading from '@yoopta/headings';
import BlockQuote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Table from '@yoopta/table';
import Image from '@yoopta/image';
import Link from '@yoopta/link';
import Lists from '@yoopta/lists';
import { MermaidPlugin } from '../editor/plugins/MermaidPlugin';
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool';
import ActionMenu, { DefaultActionMenuRender } from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from '@yoopta/marks';

import { pageService } from '../../services/pageService';
import { useAuth } from '../../context/AuthContext';
import type { Page, PageType, CreatePageOptions } from '../../types';
import { Save, Clock, Check, FileText, Folder, Database, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

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

interface PageEditorProps {
  pageId?: string;
  projectId: string;
  parentPageId?: string;
  initialPage?: Page;
  onSave?: (page?: Page) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const PageEditor: FC<PageEditorProps> = ({ 
  pageId, 
  projectId, 
  parentPageId,
  initialPage,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(pageId);
  
  // Form state
  const [title, setTitle] = useState<string>(initialPage?.title || '');
  const [description, setDescription] = useState<string>(initialPage?.description || '');
  const [slug, setSlug] = useState<string>(initialPage?.slug || '');
  const [icon, setIcon] = useState<string>(initialPage?.icon || '');
  const [pageType, setPageType] = useState<PageType>(initialPage?.page_type || 'content');
  const [isPublished, setIsPublished] = useState<boolean>(initialPage?.is_published || false);
  const [content, setContent] = useState<any>(initialPage?.content || {});
  
  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State for sidebar
  
  // Editor plugins
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
  ], []);
  
  // Create editor instance
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
  
  // Auto-save for existing pages
  useEffect(() => {
    if (readOnly || !pageId || !editor || !editorReady) return;
    
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearTimeout(timer);
  }, [content, title, description, pageId, readOnly, editor, editorReady]);
  
  // Generate slug automatically from title
  useEffect(() => {
    if (!isEditing && title) {
      const generatedSlug = pageService.generateSlug(title);
      setSlug(generatedSlug);
    }
  }, [title, isEditing]);
  
  // Auto-save function
  const handleAutoSave = async () => {
    try {
      if (!pageId || saving || !user) return;
      
      setSaving(true);
      
      const { error } = await pageService.updatePage(pageId, { 
        content,
        title,
        description,
        icon,
        page_type: pageType,
        is_published: isPublished
      });
      
      if (error) throw error;
      
      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Error al autoguardar:', err);
      setError('Error al autoguardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Save page function
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (isEditing && pageId) {
        // Update existing page
        const { data, error } = await pageService.updatePage(pageId, {
          title,
          description,
          slug,
          icon,
          content,
          page_type: pageType,
          is_published: isPublished
        });
        
        if (error) throw error;
        
        setSuccess('Página actualizada correctamente');
        setLastSaved(new Date());
        
        if (onSave) onSave(data || undefined);
      } else {
        // Create new page
        const options: CreatePageOptions = {
          title,
          description: description || undefined,
          slug: slug || undefined,
          icon: icon || undefined,
          content,
          page_type: pageType,
          is_published: isPublished,
          parent_page_id: parentPageId
        };
        
        const { data, error } = await pageService.createPage({
          ...options,
          project_id: projectId
        });
        
        if (error) throw error;
        
        setSuccess('Página creada correctamente');
        
        if (onSave) onSave(data || undefined);
      }
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError('Error al guardar la página: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleEditorChange = (newContent: any) => {
    setContent(newContent);
  };
  
  // Get icon based on page type
  const getPageTypeIcon = (type: PageType) => {
    switch (type) {
      case 'content':
        return <FileText size={16} />;
      case 'container':
        return <Folder size={16} />;
      case 'mixed':
        return <Database size={16} />;
      default:
        return <FileText size={16} />;
    }
  };
  
  if (!editor) {
    return (
      <div className="bg-destructive-100 text-destructive-700 dark:bg-destructive-900/20 dark:text-destructive-400 p-4 rounded-md">
        Error al inicializar el editor. Por favor, recarga la página.
      </div>
    );
  }
  
  return (
    <div className="flex bg-background text-foreground dark:bg-background dark:text-foreground">
      {/* Collapsible Sidebar for Metadata */}
      <aside 
        className={`flex-shrink-0 ${isSidebarOpen ? 'w-80 bg-card border-r border-border' : 'w-14'} transition-all duration-300 ease-in-out 
                    p-4 overflow-hidden relative h-[calc(100vh-14rem)]`}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          title={isSidebarOpen ? "Contraer barra lateral" : "Expandir barra lateral"}
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        {isSidebarOpen && (
          <div className="pt-10"> {/* Add padding to avoid overlap with toggle button */}
            <h2 className="text-xl font-semibold mb-6 text-primary">Detalles de la Página</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Título de la página *
                </label>
                <input 
                  id="title"
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la página"
                  className="form-input"
                  required
                  disabled={readOnly}
                />
              </div>
              
              <div>
                <label htmlFor="slug" className="block mb-1 text-sm font-medium text-muted-foreground">
                  URL slug
                </label>
                <input 
                  id="slug"
                  type="text" 
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-de-la-pagina"
                  className="form-input"
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se genera automáticamente si se deja vacío
                </p>
              </div>
              
              <div>
                <label htmlFor="description" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Descripción
                </label>
                <textarea 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción de la página (opcional)"
                  className="form-input resize-y min-h-[100px]"
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              
              <div>
                <label htmlFor="pageType" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Tipo de página
                </label>
                <select
                  id="pageType"
                  value={pageType}
                  onChange={(e) => setPageType(e.target.value as PageType)}
                  className="form-input"
                  disabled={readOnly}
                >
                  <option value="content">📝 Contenido - Solo texto y contenido</option>
                  <option value="container">📁 Contenedor - Solo para agrupar páginas</option>
                  <option value="mixed">📊 Mixta - Contenido y subpáginas</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="icon" className="block mb-1 text-sm font-medium text-muted-foreground">
                  Icono (emoji)
                </label>
                <input 
                  id="icon"
                  type="text" 
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="✨"
                  className="form-input"
                  maxLength={2}
                  disabled={readOnly}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="isPublished"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  disabled={readOnly}
                />
                <label htmlFor="isPublished" className="ml-2 text-sm font-medium text-muted-foreground">
                  Página publicada
                </label>
              </div>
              

              {/* Editor Header */}
              {!readOnly && (
                <div className="flex justify-end items-center mb-6">
                  <div className="flex items-center space-x-4">
                    {lastSaved && (
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Clock size={14} className="mr-1" />
                        Guardado {lastSaved.toLocaleTimeString()}
                      </div>
                    )}
                    <button 
                      onClick={handleSave}
                      className="btn-primary"
                      disabled={saving || !title.trim()}
                    >
                      {saving ? (
                        <Clock size={16} className="mr-1.5 animate-spin" />
                      ) : (
                        <Save size={16} className="mr-1.5" />
                      )}
                      {saving ? 'Guardando...' : (isEditing ? 'Guardar' : 'Crear página')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col px-8 mx-14 overflow-auto h-[calc(100vh-14rem)]">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive-foreground rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-primary/10 text-primary-foreground rounded-md">
            {success}
          </div>
        )}
        {/* Yoopta Editor */}
        {(pageType === 'content' || pageType === 'mixed') ? (
          <div className="flex-1 w-full bg-card rounded-lg shadow-sm p-8 pb-16 relative">
            <div className="absolute top-8 left-8 text-2xl">
              {icon}
            </div>
            <h1 className="text-4xl font-extrabold mb-4 pl-12">
              {title || 'Título de la página'}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 pl-12">
              {description || 'Añade una descripción (opcional)'}
            </p>
            <YooptaEditor
              editor={editor}
              plugins={plugins}
              value={content}
              readOnly={readOnly}
              onChange={handleEditorChange}
              tools={TOOLS}
              marks={MARKS}
              autoFocus={true}
              className="focus:outline-none px-12"
              style={{width: '100% ', height: 'calc(100vh-8rem)'}}
            />
          </div>
        ) : (
          <div className="flex-1 max-w-3xl mx-auto w-full bg-card rounded-lg shadow-sm p-8 pb-16 flex flex-col items-center justify-center text-center text-muted-foreground">
            {getPageTypeIcon(pageType)}
            <p className="mt-4 text-lg">
              Esta página es de tipo "{pageType}". {pageType === 'container' ? 'No se puede añadir contenido directamente aquí, solo subpáginas.' : 'Puedes agregar contenido y subpáginas.'}
            </p>
          </div>
        )}
        
        {/* Action Buttons at the bottom */}
        {/* {!readOnly && (
          <div className="mt-8 flex justify-end space-x-3 max-w-3xl mx-auto w-full">
            {onCancel && (
              <button
                onClick={onCancel}
                className="btn-secondary"
                disabled={saving}
              >
                Cancelar
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving || !title.trim()}
            >
              <Check size={16} className="mr-1.5" />
              {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear página')}
            </button>
          </div>
        )} */}
      </main>
    </div>
  );
};

export default PageEditor;