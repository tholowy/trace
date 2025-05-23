import { supabase } from '../lib/supabase';
import type { 
  Page, 
  PageTreeNode, 
  ServiceResponse, 
  CreatePageOptions, 
  MovePageOptions, 
  DuplicatePageOptions,
  SearchPagesOptions,
  PageSearchResult,
  NavigationContext,
  BreadcrumbItem
} from '../types';

export const pageService = {
  // =============== OPERACIONES BÁSICAS CRUD ===============

  /**
   * Obtiene todas las páginas de un proyecto en estructura plana
   */
  async getPages(projectId: string, projectVersionId?: string): Promise<ServiceResponse<Page[]>> {
    try {
      let query = supabase
        .from('page_details')
        .select('*')
        .eq('project_id', projectId)
        .order('parent_page_id', { ascending: true, nullsFirst: true })
        .order('order_index', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene una página por ID con toda su información relacionada
   */
  async getPageById(id: string): Promise<ServiceResponse<Page>> {
    try {
      const { data, error } = await supabase
        .from('page_details')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene una página por su ruta completa (slug path)
   */
  async getPageByPath(projectId: string, path: string, versionId?: string): Promise<ServiceResponse<Page>> {
    try {
      // Dividir la ruta en segmentos
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length === 0) {
        throw new Error('Ruta inválida');
      }

      // Función recursiva para encontrar la página siguiendo la ruta
      let currentParentId: string | null = null;
      let currentPage: Page | null = null;

      for (const segment of segments) {
        const { data, error }:any = await supabase
          .from('pages')
          .select('*')
          .eq('project_id', projectId)
          .eq('slug', segment)
          .eq('parent_page_id', currentParentId)
          .single();

        if (error) throw error;
        
        currentPage = data;
        currentParentId = data.id;
      }

      if (!currentPage) {
        throw new Error('Página no encontrada');
      }

      return { data: currentPage, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Crea una nueva página
   */
  async createPage(options: CreatePageOptions & { project_id: string }): Promise<ServiceResponse<Page>> {
    try {
      // Generar slug si no se proporciona
      if (!options.slug) {
        options.slug = this.generateSlug(options.title);
      }

      // Verificar que el slug sea único en el contexto del padre
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('project_id', options.project_id)
        .eq('parent_page_id', options.parent_page_id || null)
        .eq('slug', options.slug)
        .single();

      if (existingPage) {
        // Generar slug único añadiendo sufijo
        let counter = 1;
        let uniqueSlug = `${options.slug}-${counter}`;
        
        while (true) {
          const { data: duplicate } = await supabase
            .from('pages')
            .select('id')
            .eq('project_id', options.project_id)
            .eq('parent_page_id', options.parent_page_id || null)
            .eq('slug', uniqueSlug)
            .single();

          if (!duplicate) {
            options.slug = uniqueSlug;
            break;
          }
          
          counter++;
          uniqueSlug = `${options.slug}-${counter}`;
        }
      }

      // Obtener el order_index si no se proporciona
      if (options.order_index === undefined) {
        const { data: lastPage } = await supabase
          .from('pages')
          .select('order_index')
          .eq('project_id', options.project_id)
          .eq('parent_page_id', options.parent_page_id || null)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        options.order_index = (lastPage?.order_index || 0) + 1;
      }

      const { data, error } = await supabase
        .from('pages')
        .insert({
          ...options,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Actualiza una página existente
   */
  async updatePage(id: string, updates: Partial<Page>): Promise<ServiceResponse<Page>> {
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({
          ...updates,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Elimina una página (y opcionalmente sus hijas)
   */
  async deletePage(id: string, deleteChildren = false): Promise<ServiceResponse<null>> {
    try {
      if (deleteChildren) {
        // Eliminar primero las páginas hijas recursivamente
        const { data: children } = await supabase
          .from('pages')
          .select('id')
          .eq('parent_page_id', id);

        if (children) {
          for (const child of children) {
            await this.deletePage(child.id, true);
          }
        }
      } else {
        // Mover las páginas hijas al nivel padre
        const { data: pageToDelete } = await supabase
          .from('pages')
          .select('parent_page_id')
          .eq('id', id)
          .single();

        if (pageToDelete) {
          await supabase
            .from('pages')
            .update({ parent_page_id: pageToDelete.parent_page_id })
            .eq('parent_page_id', id);
        }
      }

      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== OPERACIONES DE JERARQUÍA ===============

  /**
   * Obtiene el árbol completo de páginas de un proyecto
   */
  async getPageTree(projectId: string, versionId?: string): Promise<ServiceResponse<PageTreeNode[]>> {
    try {
      // Usar la función de PostgreSQL para obtener el árbol
      const { data, error } = await supabase.rpc('get_page_tree', {
        project_id_param: projectId,
        project_version_id_param: versionId
      });

      if (error) throw error;

      // Convertir la estructura plana en árbol
      const tree = this.buildPageTree(data || []);
      return { data: tree, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Mueve una página a una nueva posición en la jerarquía
   */
  async movePage(pageId: string, options: MovePageOptions): Promise<ServiceResponse<Page>> {
    try {
      const { data, error } = await supabase.rpc('move_page', {
        page_id_param: pageId,
        new_parent_id_param: options.new_parent_id,
        new_order_index_param: options.new_order_index
      });

      if (error) throw error;

      // Obtener la página actualizada
      return await this.getPageById(pageId);
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Duplica una página con opción de incluir hijas
   */
  async duplicatePage(pageId: string, options: DuplicatePageOptions = {}): Promise<ServiceResponse<Page>> {
    try {
      const { data, error } = await supabase.rpc('duplicate_page', {
        source_page_id: pageId,
        new_title: options.new_title,
        new_parent_id: options.new_parent_id
      });

      if (error) throw error;

      // Si se especifica incluir hijas, duplicarlas recursivamente
      if (options.include_children) {
        const { data: children } = await supabase
          .from('pages')
          .select('*')
          .eq('parent_page_id', pageId);

        if (children) {
          for (const child of children) {
            await this.duplicatePage(child.id, {
              new_parent_id: data,
              include_children: true
            });
          }
        }
      }

      return await this.getPageById(data);
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene la información de navegación completa para una página
   */
  async getNavigationContext(pageId: string): Promise<ServiceResponse<NavigationContext>> {
    try {
      // Obtener la página actual
      const { data: currentPage, error: pageError } = await this.getPageById(pageId);
      if (pageError || !currentPage) throw pageError;

      // Obtener el árbol completo del proyecto
      const { data: pageTree, error: treeError } = await this.getPageTree(currentPage.project_id);
      if (treeError) throw treeError;

      // Generar breadcrumbs
      const breadcrumbs = await this.generateBreadcrumbs(pageId);

      // Obtener páginas hermanas
      const { data: siblings } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', currentPage.project_id)
        .eq('parent_page_id', currentPage.parent_page_id || null)
        .order('order_index');

      // Encontrar página anterior y siguiente
      const currentIndex = siblings?.findIndex(p => p.id === pageId) || 0;
      const previousPage = siblings && currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
      const nextPage = siblings && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;

      // Obtener información del proyecto
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', currentPage.project_id)
        .single();

      const navigationContext: NavigationContext = {
        current_page: currentPage,
        breadcrumbs: breadcrumbs.data || [],
        page_tree: pageTree || [],
        siblings: siblings || [],
        previous_page: previousPage,
        next_page: nextPage,
        project: project!
      };

      return { data: navigationContext, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Genera breadcrumbs para una página
   */
  async generateBreadcrumbs(pageId: string): Promise<ServiceResponse<BreadcrumbItem[]>> {
    try {
      const breadcrumbs: BreadcrumbItem[] = [];
      let currentPageId: string | null = pageId;
      let level = 0;

      while (currentPageId) {
        const { data: page }: { data: Page | null } = await supabase
          .from('pages')
          .select('id, title, slug, parent_page_id')
          .eq('id', currentPageId)
          .single();

        if (!page) break;

        // Generar la ruta hasta esta página
        const path = await this.generatePagePath(page.id);

        breadcrumbs.unshift({
          id: page.id,
          title: page.title,
          slug: page.slug,
          path: path.data || '',
          level: level
        });

        currentPageId = page.parent_page_id ?? null;
        level++;
      }

      return { data: breadcrumbs, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== BÚSQUEDA Y FILTRADO ===============

  /**
   * Busca páginas con texto completo
   */
  async searchPages(options: SearchPagesOptions): Promise<ServiceResponse<PageSearchResult[]>> {
    try {
      const { data, error } = await supabase.rpc('search_pages', {
        search_term: options.query,
        project_id_param: options.project_id,
        project_version_id_param: options.project_version_id,
        limit_param: options.limit || 20,
        offset_param: options.offset || 0
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene páginas por tipo
   */
  async getPagesByType(projectId: string, pageType: string): Promise<ServiceResponse<Page[]>> {
    try {
      const { data, error } = await supabase
        .from('page_details')
        .select('*')
        .eq('project_id', projectId)
        .eq('page_type', pageType)
        .order('title');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene páginas publicadas de un proyecto
   */
  async getPublishedPages(projectId: string, versionId?: string): Promise<ServiceResponse<Page[]>> {
    try {
      const { data, error } = await supabase
        .from('page_details')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_published', true)
        .order('parent_page_id', { ascending: true, nullsFirst: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== FUNCIONES AUXILIARES ===============

  /**
   * Genera un slug único a partir de un título
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno solo
      .trim();
  },

  /**
   * Construye un árbol jerárquico a partir de una lista plana de páginas
   */
  buildPageTree(pages: any[]): PageTreeNode[] {
    const pageMap = new Map();
    const rootPages: PageTreeNode[] = [];

    // Crear mapa de páginas
    pages.forEach(page => {
      pageMap.set(page.id, {
        ...page,
        children: []
      });
    });

    // Construir jerarquía
    pages.forEach(page => {
      const pageNode = pageMap.get(page.id);
      if (page.parent_page_id) {
        const parent = pageMap.get(page.parent_page_id);
        if (parent) {
          parent.children.push(pageNode);
        }
      } else {
        rootPages.push(pageNode);
      }
    });

    return rootPages;
  },

  /**
   * Genera la ruta completa de una página
   */
  async generatePagePath(pageId: string): Promise<ServiceResponse<string>> {
    try {
      const pathSegments: string[] = [];
      let currentPageId: string | null = pageId;

      while (currentPageId) {
        const { data: page }: { data: Page | null } = await supabase
          .from('pages')
          .select('slug, parent_page_id')
          .eq('id', currentPageId)
          .single();

        if (!page) break;

        pathSegments.unshift(page.slug);
        currentPageId = page.parent_page_id ?? null;
      }

      const path = '/' + pathSegments.join('/');
      return { data: path, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Valida la estructura de contenido Yoopta
   */
  validatePageContent(content: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content) {
      return { isValid: true, errors: [] }; // Contenido vacío es válido
    }

    try {
      // Validar que sea un objeto JSON válido
      if (typeof content !== 'object') {
        errors.push('El contenido debe ser un objeto JSON válido');
      }

      // Validar estructura básica de Yoopta
      if (content && typeof content === 'object') {
        // Aquí puedes agregar validaciones específicas para Yoopta
        // Por ejemplo, verificar que tenga la estructura esperada
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return { isValid: false, errors: ['Error al validar el contenido'] };
    }
  },

  /**
   * Obtiene estadísticas de una página
   */
  async getPageStats(pageId: string): Promise<ServiceResponse<any>> {
    try {
      // Obtener conteos de elementos relacionados
      const [viewsResult, commentsResult, linksResult, childrenResult] = await Promise.all([
        supabase.from('page_views').select('id', { count: 'exact' }).eq('page_id', pageId),
        supabase.from('comments').select('id', { count: 'exact' }).eq('page_id', pageId),
        supabase.from('page_links').select('id', { count: 'exact' }).eq('source_page_id', pageId),
        supabase.from('pages').select('id', { count: 'exact' }).eq('parent_page_id', pageId)
      ]);

      const stats = {
        views_count: viewsResult.count || 0,
        comments_count: commentsResult.count || 0,
        outbound_links_count: linksResult.count || 0,
        children_count: childrenResult.count || 0
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Registra una vista de página
   */
  async recordPageView(pageId: string, metadata?: {
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
  }): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('page_views')
        .insert({
          page_id: pageId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ip_address: metadata?.ip_address,
          user_agent: metadata?.user_agent,
          referrer: metadata?.referrer
        });

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene páginas relacionadas basadas en enlaces y contenido
   */
  async getRelatedPages(pageId: string, limit = 5): Promise<ServiceResponse<Page[]>> {
    try {
      // Obtener páginas enlazadas desde esta página
      const { data: linkedPages } = await supabase
        .from('page_links')
        .select(`
          target_page_id,
          target_page:pages!target_page_id (*)
        `)
        .eq('source_page_id', pageId)
        .limit(limit);

      // Obtener páginas que enlazan a esta página
      const { data: backlinks } = await supabase
        .from('page_links')
        .select(`
          source_page_id,
          source_page:pages!source_page_id (*)
        `)
        .eq('target_page_id', pageId)
        .limit(limit);

      // Combinar y eliminar duplicados
      const relatedPages: Page[] = [];
      
      linkedPages?.forEach(link => {
        if (link.target_page) {
          relatedPages.push(link.target_page[0]);
        }
      });

      backlinks?.forEach(link => {
        if (link.source_page && !relatedPages.find(p => p.id === link.source_page_id)) {
          relatedPages.push(link.source_page[0]);
        }
      });

      return { data: relatedPages.slice(0, limit), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};