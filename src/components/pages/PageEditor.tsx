import { useState, useEffect, type FC, useMemo, useRef } from 'react';
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Heading from '@yoopta/headings';
import BlockQuote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Table from '@yoopta/table';
import { ImagePlugin } from '../editor/plugins/ImagePlugin';
import Link from '@yoopta/link';
import Lists from '@yoopta/lists';
import { MermaidPlugin } from '../editor/plugins/MermaidPlugin';
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool';
import ActionMenu, { DefaultActionMenuRender } from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from '@yoopta/marks';

import { pageService } from '../../services/pageService';
import { useAuth } from '../../context/AuthContext';
import type { Page, CreatePageOptions } from '../../types';
import { Save, Clock, Check, PanelLeftOpen, PanelLeftClose, AlertCircle } from 'lucide-react';
// import { SubPagePlugin } from '../editor/plugins/SubPagePlugin';

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
  const [isPublished, setIsPublished] = useState<boolean>(initialPage?.is_published || false);
  const [content, setContent] = useState<any>(initialPage?.content || {});
  
  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  const plugins = useMemo(() => {
    try {
      return [
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
        ImagePlugin,
        // SubPagePlugin
      ];
    } catch (err) {
      console.error('Error al configurar plugins:', err);
      setError('Error al cargar los plugins del editor.');
      return [Paragraph]; // Fallback básico
    }
  }, []);
  
  const handleEditorChange = (newContent: any) => {
    console.log('📝 Editor cambió:', Object.keys(newContent).length, 'bloques');
    
    // Validar que el contenido sea válido
    if (typeof newContent === 'object' && newContent !== null) {
      setContent(newContent);
      
      // Limpiar mensajes de error si el contenido es válido
      if (error) {
        setError(null);
      }
    }
  };

  const editor = useMemo(() => {
    try {
      const instance = createYooptaEditor();
      
      (window as any).yooptaEditor = instance;
      (window as any).yooptaContext = {
        projectId,
        pageId,
        readOnly,
        onEditorChange: (newContent: any) => {
          console.log('🔄 Contexto: Editor cambió');
          handleEditorChange(newContent);
        },
        debugInfo: () => ({
          projectId,
          pageId,
          readOnly,
          blocksCount: Object.keys(content).length,
          lastSaved
        })
      };
      
      setEditorReady(true);
      return instance;
    } catch (err) {
      console.error("Error al crear el editor:", err);
      setError("Error al inicializar el editor. Por favor, recarga la página.");
      return null;
    }
  }, [projectId, pageId, readOnly, content, lastSaved]);
  
  // Auto-save mejorado
  useEffect(() => {
    if (readOnly || !pageId || !editor || !editorReady || saving) return;
    
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearTimeout(timer);
  }, [content, title, description, pageId, readOnly, editor, editorReady, saving]);
  
  // Generate slug automatically from title
  useEffect(() => {
    if (!isEditing && title) {
      const generatedSlug = pageService.generateSlug(title);
      setSlug(generatedSlug);
    }
  }, [title, isEditing]);
  
  const handleAutoSave = async () => {
    try {
      if (!pageId || saving || !user) return;
      
      setSaving(true);
      setError(null);
      
      const { error: saveError } = await pageService.updatePage(pageId, { 
        content,
        title,
        description,
        icon,
        is_published: isPublished
      });
      
      if (saveError) throw saveError;
      
      setLastSaved(new Date());
      
    } catch (err: any) {
      console.error('❌ Error al autoguardar:', err);
      setError('Error al autoguardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Validaciones
      if (!title.trim()) {
        throw new Error('El título es requerido');
      }
      
      if (isEditing && pageId) {
        // Update existing page
        const { data, error } = await pageService.updatePage(pageId, {
          title: title.trim(),
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
          icon: icon.trim() || undefined,
          content,
          is_published: isPublished
        });
        
        if (error) throw error;
        
        setSuccess('Página actualizada correctamente');
        setLastSaved(new Date());
        
        if (onSave) onSave(data || undefined);
      } else {
        // Create new page
        const options: CreatePageOptions = {
          title: title.trim(),
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
          icon: icon.trim() || undefined,
          content,
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
      console.error('❌ Error al guardar:', err);
      setError('Error al guardar la página: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando editor...</p>
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md max-w-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm underline hover:no-underline"
              >
                Recargar página
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex bg-background text-foreground min-h-screen">
      <aside 
        className={`flex-shrink-0 ${isSidebarOpen ? 'w-80' : 'w-14'} transition-all duration-300 ease-in-out 
                    bg-card border-r border-border p-4 overflow-hidden relative h-[calc(100vh-4rem)]`}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted transition-colors z-10"
          title={isSidebarOpen ? "Contraer barra lateral" : "Expandir barra lateral"}
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        {isSidebarOpen && (
          <div className="pt-12">
            <h2 className="text-xl font-semibold mb-6 text-card-foreground">Detalles de la Página</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block mb-2 text-sm font-medium text-muted-foreground">
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
                <label htmlFor="slug" className="block mb-2 text-sm font-medium text-muted-foreground">
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
                <label htmlFor="description" className="block mb-2 text-sm font-medium text-muted-foreground">
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
                <label htmlFor="icon" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Icono (emoji)
                </label>
                <input 
                  id="icon"
                  type="text" 
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="📝"
                  className="form-input"
                  maxLength={2}
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Emoji que representa esta página
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  id="isPublished"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                  disabled={readOnly}
                />
                <label htmlFor="isPublished" className="ml-2 text-sm font-medium text-muted-foreground">
                  Página publicada
                </label>
              </div>

              {!readOnly && (
                <div className="pt-6 border-t border-border">
                  <div className="flex flex-col gap-3">
                    {lastSaved && (
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Clock size={14} className="mr-2" />
                        Guardado {lastSaved.toLocaleTimeString()}
                      </div>
                    )}
                    
                    <button 
                      onClick={handleSave}
                      className="btn-primary w-full justify-center"
                      disabled={saving || !title.trim()}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="mr-2" />
                          {isEditing ? 'Guardar cambios' : 'Crear página'}
                        </>
                      )}
                    </button>
                    
                    {onCancel && (
                      <button 
                        onClick={onCancel}
                        className="btn-secondary w-full justify-center"
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col px-8 mx-auto max-w-4xl overflow-auto">
        {/* Status Messages mejorados */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-primary/10 text-primary border border-primary/20 rounded-md">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          </div>
        )}

        <div className="flex-1 w-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          {/* Page Header */}
          <div className="p-8 pb-4 border-b border-border">
            <div className="flex items-start space-x-4">
              {icon && (
                <div className="text-4xl flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-card-foreground mb-2 break-words">
                  {title || 'Título de la página'}
                </h1>
                {description && (
                  <p className="text-lg text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 min-h-[600px]">
            {editorReady ? (
              <YooptaEditor
                editor={editor}
                plugins={plugins}
                value={content}
                readOnly={readOnly}
                onChange={handleEditorChange}
                tools={TOOLS}
                marks={MARKS}
                autoFocus={!readOnly}
                className="focus:outline-none"
                style={{ width: '100%', minHeight: '500px' }}
                placeholder={readOnly ? undefined : "Comienza a escribir o usa '/' para agregar contenido..."}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Cargando editor...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PageEditor;