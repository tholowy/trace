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
  BreadcrumbItem,
} from '../types';

export const pageService = {
  // =============== OPERACIONES BÁSICAS CRUD ===============

  /**
   * Obtiene todas las páginas de un proyecto en estructura plana
   */
  async getPages(projectId: string, includeChildren: boolean = true): Promise<ServiceResponse<Page[]>> {
    try {
      const supabaseQuery = supabase
        .from('pages')
        .select('*')
        .eq('project_id', projectId);

      if (includeChildren) supabaseQuery.order('parent_page_id', { ascending: true, nullsFirst: true })
      else supabaseQuery.is('parent_page_id', null);
      supabaseQuery.order('order_index', { ascending: true });
      const { data, error } = await supabaseQuery;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting pages:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene una página por ID con toda su información relacionada
   */
  async getPageById(id: string): Promise<ServiceResponse<Page>> {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting page by ID:', error);
      return { data: null, error };
    }
  },

  /**
 * Obtiene una página por su ruta completa (slug path)
 */
  async getPageByPath(projectId: string, path: string): Promise<ServiceResponse<Page>> {
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
        let query = supabase
          .from('pages')
          .select('*')
          .eq('project_id', projectId)
          .eq('slug', segment);

        // Usar eq con null o is con null según el caso
        if (currentParentId === null) {
          query = query.is('parent_page_id', null);
        } else {
          query = query.eq('parent_page_id', currentParentId);
        }

        const { data, error } = await query.single();

        if (error) throw error;

        currentPage = data;
        currentParentId = data.id;
      }

      if (!currentPage) {
        throw new Error('Página no encontrada');
      }

      return { data: currentPage, error: null };
    } catch (error) {
      console.error('Error getting page by path:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene todas las páginas hijas de una página padre
   */
  async getPagesByParentId(parentId: string): Promise<ServiceResponse<Page[]>> {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('parent_page_id', parentId)
        .order('order_index', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
      console.error('Error getting pages by parent ID:', error);
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
      let query = supabase
        .from('pages')
        .select('id')
        .eq('project_id', options.project_id)
        .eq('slug', options.slug);

      // Manejar parent_page_id null correctamente
      if (options.parent_page_id === null || options.parent_page_id === undefined) {
        query = query.is('parent_page_id', null);
      } else {
        query = query.eq('parent_page_id', options.parent_page_id);
      }

      const { data: existingPages } = await query;

      if (existingPages && existingPages.length > 0) {
        // Generar slug único añadiendo sufijo
        let counter = 1;
        const baseName = options.slug.split('-')[0];
        let uniqueSlug = `${baseName}-${counter}`;

        while (true) {
          let duplicateQuery = supabase
            .from('pages')
            .select('id')
            .eq('project_id', options.project_id)
            .eq('slug', uniqueSlug);

          if (options.parent_page_id === null || options.parent_page_id === undefined) {
            duplicateQuery = duplicateQuery.is('parent_page_id', null);
          } else {
            duplicateQuery = duplicateQuery.eq('parent_page_id', options.parent_page_id);
          }

          const { data: duplicate } = await duplicateQuery;

          if (!duplicate || duplicate.length === 0) {
            options.slug = uniqueSlug;
            break;
          }

          counter++;
          uniqueSlug = `${baseName}-${counter}`;
        }
      }

      // Obtener el order_index si no se proporciona
      if (options.order_index === undefined) {
        let orderQuery = supabase
          .from('pages')
          .select('order_index')
          .eq('project_id', options.project_id)
          .order('order_index', { ascending: false })
          .limit(1);

        if (options.parent_page_id === null || options.parent_page_id === undefined) {
          orderQuery = orderQuery.is('parent_page_id', null);
        } else {
          orderQuery = orderQuery.eq('parent_page_id', options.parent_page_id);
        }

        const { data: lastPages } = await orderQuery;
        options.order_index = (lastPages && lastPages[0]?.order_index || 0) + 1;
      }

      // Obtener usuario actual
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('pages')
        .insert({
          project_id: options.project_id,
          parent_page_id: options.parent_page_id || null, // Asegurar que sea null, no undefined
          title: options.title,
          slug: options.slug,
          content: options.content || null,
          description: options.description || null,
          icon: options.icon || null,
          is_published: options.is_published || false,
          order_index: options.order_index,
          created_by: user.user?.id,
          updated_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating page:', error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza una página existente
   */
  async updatePage(id: string, updates: Partial<Page>): Promise<ServiceResponse<Page>> {
    try {
      const { data: user } = await supabase.auth.getUser();

      // Filtrar campos que pueden ser actualizados
      const allowedUpdates = {
        title: updates.title,
        content: updates.content,
        description: updates.description,
        icon: updates.icon,
        is_published: updates.is_published,
        updated_by: user.user?.id,
        updated_at: new Date().toISOString(),
      };

      // Remover campos undefined
      Object.keys(allowedUpdates).forEach(key =>
        allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );

      const { data, error } = await supabase
        .from('pages')
        .update(allowedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating page:', error);
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
      console.error('Error deleting page:', error);
      return { data: null, error };
    }
  },

  // =============== OPERACIONES DE JERARQUÍA ===============

  /**
   * Obtiene el árbol completo de páginas de un proyecto
   */
  async getPageTree(projectId: string): Promise<ServiceResponse<PageTreeNode[]>> {
    try {
      // Obtener todas las páginas del proyecto
      const { data: pages, error } = await this.getPages(projectId);
      if (error) throw error;

      // Construir árbol jerárquico
      const tree = this.buildPageTree(pages || []);
      return { data: tree, error: null };
    } catch (error) {
      console.error('Error getting page tree:', error);
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
      let supabaseQuery = supabase
        .from('pages')
        .select('*')
        .eq('project_id', currentPage.project_id)

      if (currentPage.parent_page_id) supabaseQuery = supabaseQuery.eq('parent_page_id', currentPage.parent_page_id);
      else supabaseQuery.is('parent_page_id', null);

      const { data: siblings } = await supabaseQuery
        .order('order_index', { ascending: true });



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

      // Extraer referencias de subpáginas del contenido
      const contentChildren = this.extractSubPageReferences(currentPage.content);

      const navigationContext: NavigationContext = {
        current_page: currentPage,
        breadcrumbs: breadcrumbs.data || [],
        tree_children: [], // Se calculará del árbol si es necesario
        content_children: contentChildren,
        siblings: siblings || [],
        previous_page: previousPage,
        next_page: nextPage,
        project: project!
      };

      return { data: navigationContext, error: null };
    } catch (error) {
      console.error('Error getting navigation context:', error);
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
        const { data: page } = await supabase
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

        currentPageId = page.parent_page_id;
        level++;
      }

      return { data: breadcrumbs, error: null };
    } catch (error) {
      console.error('Error generating breadcrumbs:', error);
      return { data: null, error };
    }
  },

  /**
   * Mueve una página a una nueva posición en la jerarquía
   */
  async movePage(pageId: string, options: MovePageOptions): Promise<ServiceResponse<Page>> {
    try {
      // Verificar que no se cree referencia circular
      if (options.new_parent_id) {
        const isCircular = await this.checkCircularReference(pageId, options.new_parent_id);
        if (isCircular) {
          throw new Error('No se puede mover: crearía una referencia circular');
        }
      }

      const { data, error } = await supabase
        .from('pages')
        .update({
          parent_page_id: options.new_parent_id || null,
          order_index: options.new_order_index || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error moving page:', error);
      return { data: null, error };
    }
  },

  /**
   * Duplica una página con opción de incluir hijas
   */
  async duplicatePage(pageId: string, options: DuplicatePageOptions = {}): Promise<ServiceResponse<Page>> {
    try {
      // Obtener página original
      const { data: originalPage, error: pageError } = await this.getPageById(pageId);
      if (pageError || !originalPage) throw pageError;

      // Crear página duplicada
      const { data: duplicatedPage, error: createError } = await this.createPage({
        project_id: originalPage.project_id,
        parent_page_id: options.new_parent_id || originalPage.parent_page_id,
        title: options.new_title || `${originalPage.title} (Copia)`,
        content: originalPage.content,
        description: originalPage.description,
        icon: originalPage.icon,
        is_published: false // Las copias empiezan como draft
      });

      if (createError || !duplicatedPage) throw createError;

      // Si se especifica incluir hijas, duplicarlas recursivamente
      if (options.include_children) {
        const { data: children } = await supabase
          .from('pages')
          .select('*')
          .eq('parent_page_id', pageId);

        if (children) {
          for (const child of children) {
            await this.duplicatePage(child.id, {
              new_parent_id: duplicatedPage.id,
              include_children: true
            });
          }
        }
      }

      return { data: duplicatedPage, error: null };
    } catch (error) {
      console.error('Error duplicating page:', error);
      return { data: null, error };
    }
  },

  // =============== BÚSQUEDA Y FILTRADO ===============

  /**
   * Busca páginas con texto completo
   */
  async searchPages(options: SearchPagesOptions): Promise<ServiceResponse<PageSearchResult[]>> {
    try {
      let query = supabase
        .from('pages')
        .select('id, title, description, project_id, updated_at')
        .ilike('title', `%${options.query}%`);

      if (options.project_id) {
        query = query.eq('project_id', options.project_id);
      }

      if (options.only_published) {
        query = query.eq('is_published', true);
      }

      query = query
        .order('updated_at', { ascending: false })
        .limit(options.limit || 20);

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Convertir a PageSearchResult
      const searchResults: PageSearchResult[] = (data || []).map(page => ({
        id: page.id,
        title: page.title,
        description: page.description,
        project_id: page.project_id,
        project_name: '', // Se podría obtener con JOIN si es necesario
        updated_at: page.updated_at,
        rank: 1, // Implementar ranking si es necesario
        path: '', // Se podría calcular si es necesario
        has_content: !!page.content
      }));

      return { data: searchResults, error: null };
    } catch (error) {
      console.error('Error searching pages:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene páginas publicadas de un proyecto
   */
  async getPublishedPages(projectId: string): Promise<ServiceResponse<Page[]>> {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_published', true)
        .order('parent_page_id', { ascending: true, nullsFirst: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting published pages:', error);
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
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
      .trim();
  },

  /**
   * Construye un árbol jerárquico a partir de una lista plana de páginas
   */
  buildPageTree(pages: Page[]): PageTreeNode[] {
    const pageMap = new Map<string, PageTreeNode>();
    const rootPages: PageTreeNode[] = [];

    // Crear mapa de páginas
    pages.forEach(page => {
      pageMap.set(page.id, {
        id: page.id,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        is_published: page.is_published,
        order_index: page.order_index,
        level: 0, // Se calculará después
        path: '', // Se calculará después
        parent_id: page.parent_page_id,
        has_subpage_blocks: this.hasSubPageBlocks(page.content),
        children: [],
        content_children: this.extractSubPageReferences(page.content)
      });
    });

    // Construir jerarquía y calcular niveles
    pages.forEach(page => {
      const pageNode = pageMap.get(page.id);
      if (!pageNode) return;

      if (page.parent_page_id) {
        const parent = pageMap.get(page.parent_page_id);
        if (parent) {
          pageNode.level = parent.level + 1;
          parent.children.push(pageNode);
        }
      } else {
        rootPages.push(pageNode);
      }
    });

    // Calcular rutas
    this.calculatePaths(rootPages, '');

    return rootPages;
  },

  /**
   * Calcula las rutas completas para cada nodo del árbol
   */
  calculatePaths(nodes: PageTreeNode[], basePath: string): void {
    nodes.forEach(node => {
      node.path = basePath ? `${basePath}/${node.slug}` : `/${node.slug}`;
      if (node.children.length > 0) {
        this.calculatePaths(node.children, node.path);
      }
    });
  },

  /**
   * Verifica si una página tiene bloques de subpáginas en su contenido
   */
  hasSubPageBlocks(content: YooptaContent | null): boolean {
    if (!content?.blocks) return false;

    return Object.values(content.blocks).some(block => block.type === 'sub-page');
  },

  /**
   * Extrae referencias a subpáginas del contenido
   */
  extractSubPageReferences(content: YooptaContent | null): ExtractedSubPageReference[] {
    if (!content?.blocks) return [];

    return Object.entries(content.blocks)
      .filter(([_, block]) => block.type === 'sub-page')
      .map(([blockId, block]) => ({
        block_id: blockId,
        page_id: block.data.page_id,
        title: block.data.title,
        display_mode: block.data.display_mode,
        order: block.data.order || 0
      }))
      .sort((a, b) => a.order - b.order);
  },

  /**
   * Verifica si mover una página crearía una referencia circular
   */
  async checkCircularReference(pageId: string, newParentId: string): Promise<boolean> {
    try {
      let currentId: string | null = newParentId;

      while (currentId) {
        if (currentId === pageId) {
          return true; // Referencia circular detectada
        }

        const { data: parent } = await supabase
          .from('pages')
          .select('parent_page_id')
          .eq('id', currentId)
          .single();

        currentId = parent?.parent_page_id || null;
      }

      return false;
    } catch (error) {
      console.error('Error checking circular reference:', error);
      return true; // En caso de error, prevenir el movimiento
    }
  },

  /**
   * Genera la ruta completa de una página
   */
  async generatePagePath(pageId: string): Promise<ServiceResponse<string>> {
    try {
      const pathSegments: string[] = [];
      let currentPageId: string | null = pageId;

      while (currentPageId) {
        const { data: page } = await supabase
          .from('pages')
          .select('slug, parent_page_id')
          .eq('id', currentPageId)
          .single();

        if (!page) break;

        pathSegments.unshift(page.slug);
        currentPageId = page.parent_page_id;
      }

      const path = '/' + pathSegments.join('/');
      return { data: path, error: null };
    } catch (error) {
      console.error('Error generating page path:', error);
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
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('page_views')
        .insert({
          page_id: pageId,
          user_id: user.user?.id || null,
          ip_address: metadata?.ip_address || null,
          user_agent: metadata?.user_agent || null,
          referrer: metadata?.referrer || null
        });

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error recording page view:', error);
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
          relatedPages.push(link.target_page);
        }
      });

      backlinks?.forEach(link => {
        if (link.source_page && !relatedPages.find(p => p.id === link.source_page.id)) {
          relatedPages.push(link.source_page);
        }
      });

      return { data: relatedPages.slice(0, limit), error: null };
    } catch (error) {
      console.error('Error getting related pages:', error);
      return { data: null, error };
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
      console.error('Error getting page stats:', error);
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
        // Verificar que tenga la estructura básica de bloques
        if (!content.blocks || typeof content.blocks !== 'object') {
          errors.push('El contenido debe tener una estructura de bloques válida');
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return { isValid: false, errors: ['Error al validar el contenido'] };
    }
  }
};