import { supabase } from '../lib/supabase';
import type { 
  ProjectVersion, 
  PageVersion, 
  ServiceResponse, 
  CreateVersionOptions,
  VersionStats,
  Page
} from '../types';

export const versionService = {
  // =============== OPERACIONES BÁSICAS CRUD ===============

  /**
   * Obtiene todas las versiones de un proyecto
   */
  async getProjectVersions(projectId: string, includeArchived = false): Promise<ServiceResponse<ProjectVersion[]>> {
    try {
      let query = supabase
        .from('project_version_details')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene una versión específica por ID
   */
  async getVersionById(versionId: string): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase
        .from('project_version_details')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene la versión actual de un proyecto
   */
  async getCurrentVersion(projectId: string): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase
        .from('project_version_details')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_current', true)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene una versión por número de versión
   */
  async getVersionByNumber(projectId: string, versionNumber: string): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase
        .from('project_version_details')
        .select('*')
        .eq('project_id', projectId)
        .eq('version_number', versionNumber)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== CREACIÓN Y GESTIÓN DE VERSIONES ===============

  /**
   * Crea una nueva versión del proyecto
   */
  async createVersion(projectId: string, options: CreateVersionOptions): Promise<ServiceResponse<ProjectVersion>> {
    try {
      // Usar la función de PostgreSQL para crear la versión
      const { data, error } = await supabase.rpc('create_project_version', {
        project_id_param: projectId,
        version_number_param: options.version_number,
        version_name_param: options.version_name,
        release_notes_param: options.release_notes
      });

      if (error) throw error;

      // Obtener la versión creada
      return await this.getVersionById(data);
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Actualiza una versión existente
   */
  async updateVersion(versionId: string, updates: Partial<ProjectVersion>): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .update(updates)
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Publica una versión (la convierte en la versión actual)
   */
  async publishVersion(versionId: string): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase.rpc('publish_project_version', {
        version_id_param: versionId
      });

      if (error) throw error;

      // Obtener la versión actualizada
      return await this.getVersionById(versionId);
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Archiva una versión
   */
  async archiveVersion(versionId: string): Promise<ServiceResponse<ProjectVersion>> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .update({ 
          is_archived: true,
          is_current: false 
        })
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Elimina una versión (solo drafts)
   */
  async deleteVersion(versionId: string): Promise<ServiceResponse<null>> {
    try {
      // Verificar que sea un draft
      const { data: version } = await supabase
        .from('project_versions')
        .select('is_draft, is_current')
        .eq('id', versionId)
        .single();

      if (!version?.is_draft) {
        throw new Error('Solo se pueden eliminar versiones en borrador');
      }

      if (version.is_current) {
        throw new Error('No se puede eliminar la versión actual');
      }

      const { error } = await supabase
        .from('project_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== GESTIÓN DE SNAPSHOTS DE PÁGINAS ===============

  /**
   * Obtiene todas las páginas de una versión específica
   */
  async getVersionPages(versionId: string): Promise<ServiceResponse<PageVersion[]>> {
    try {
      const { data, error } = await supabase
        .from('page_versions')
        .select(`
          *,
          page:pages (
            id,
            title,
            slug,
            parent_page_id,
            page_type,
            order_index
          )
        `)
        .eq('project_version_id', versionId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene el contenido de una página en una versión específica
   */
  async getPageInVersion(versionId: string, pageId: string): Promise<ServiceResponse<PageVersion>> {
    try {
      const { data, error } = await supabase
        .from('page_versions')
        .select(`
          *,
          page:pages (
            id,
            title,
            slug,
            parent_page_id,
            page_type,
            order_index,
            project_id
          )
        `)
        .eq('project_version_id', versionId)
        .eq('page_id', pageId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Actualiza el snapshot de una página en una versión
   */
  async updatePageSnapshot(versionId: string, pageId: string, snapshot: {
    content?: any;
    title?: string;
    description?: string;
  }): Promise<ServiceResponse<PageVersion>> {
    try {
      const { data, error } = await supabase
        .from('page_versions')
        .update({
          content_snapshot: snapshot.content,
          title_snapshot: snapshot.title,
          description_snapshot: snapshot.description
        })
        .eq('project_version_id', versionId)
        .eq('page_id', pageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== COMPARACIÓN ENTRE VERSIONES ===============

  /**
   * Compara dos versiones de un proyecto
   */
  async compareVersions(version1Id: string, version2Id: string): Promise<ServiceResponse<{
    added_pages: PageVersion[];
    removed_pages: PageVersion[];
    modified_pages: Array<{
      page_id: string;
      page_title: string;
      version1: PageVersion;
      version2: PageVersion;
      changes: {
        title_changed: boolean;
        content_changed: boolean;
        description_changed: boolean;
      };
    }>;
  }>> {
    try {
      // Obtener páginas de ambas versiones
      const [version1Pages, version2Pages] = await Promise.all([
        this.getVersionPages(version1Id),
        this.getVersionPages(version2Id)
      ]);

      if (version1Pages.error) throw version1Pages.error;
      if (version2Pages.error) throw version2Pages.error;

      const v1Pages = version1Pages.data || [];
      const v2Pages = version2Pages.data || [];

      // Crear mapas para facilitar comparación
      const v1Map = new Map(v1Pages.map(p => [p.page_id, p]));
      const v2Map = new Map(v2Pages.map(p => [p.page_id, p]));

      // Páginas añadidas (están en v2 pero no en v1)
      const addedPages = v2Pages.filter(p => !v1Map.has(p.page_id));

      // Páginas eliminadas (están en v1 pero no en v2)
      const removedPages = v1Pages.filter(p => !v2Map.has(p.page_id));

      // Páginas modificadas
      const modifiedPages: any[] = [];
      
      for (const v2Page of v2Pages) {
        const v1Page = v1Map.get(v2Page.page_id);
        if (v1Page) {
          const changes = {
            title_changed: v1Page.title_snapshot !== v2Page.title_snapshot,
            content_changed: JSON.stringify(v1Page.content_snapshot) !== JSON.stringify(v2Page.content_snapshot),
            description_changed: v1Page.description_snapshot !== v2Page.description_snapshot
          };

          if (changes.title_changed || changes.content_changed || changes.description_changed) {
            modifiedPages.push({
              page_id: v2Page.page_id,
              page_title: v2Page.title_snapshot,
              version1: v1Page,
              version2: v2Page,
              changes
            });
          }
        }
      }

      return {
        data: {
          added_pages: addedPages,
          removed_pages: removedPages,
          modified_pages: modifiedPages
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene el diff de contenido entre dos versiones de una página
   */
  async getPageDiff(version1Id: string, version2Id: string, pageId: string): Promise<ServiceResponse<{
    title_diff?: { old: string; new: string };
    description_diff?: { old: string; new: string };
    content_diff?: { old: any; new: any };
  }>> {
    try {
      const [page1, page2] = await Promise.all([
        this.getPageInVersion(version1Id, pageId),
        this.getPageInVersion(version2Id, pageId)
      ]);

      if (page1.error && page2.error) {
        throw new Error('Página no encontrada en ninguna versión');
      }

      const diff: any = {};

      // Comparar títulos
      if (page1.data?.title_snapshot !== page2.data?.title_snapshot) {
        diff.title_diff = {
          old: page1.data?.title_snapshot || '',
          new: page2.data?.title_snapshot || ''
        };
      }

      // Comparar descripciones
      if (page1.data?.description_snapshot !== page2.data?.description_snapshot) {
        diff.description_diff = {
          old: page1.data?.description_snapshot || '',
          new: page2.data?.description_snapshot || ''
        };
      }

      // Comparar contenido
      if (JSON.stringify(page1.data?.content_snapshot) !== JSON.stringify(page2.data?.content_snapshot)) {
        diff.content_diff = {
          old: page1.data?.content_snapshot || null,
          new: page2.data?.content_snapshot || null
        };
      }

      return { data: diff, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== RESTAURACIÓN Y ROLLBACK ===============

  /**
   * Restaura el proyecto a una versión específica
   */
  async restoreToVersion(versionId: string): Promise<ServiceResponse<{ 
    restored_pages_count: number;
    updated_pages: string[];
  }>> {
    try {
      // Obtener la versión objetivo
      const { data: targetVersion, error: versionError } = await this.getVersionById(versionId);
      if (versionError || !targetVersion) throw versionError;

      // Obtener páginas de la versión objetivo
      const { data: versionPages, error: pagesError } = await this.getVersionPages(versionId);
      if (pagesError) throw pagesError;

      const updatedPages: string[] = [];
      let restoredCount = 0;

      // Restaurar cada página
      for (const pageVersion of versionPages || []) {
        try {
          // Actualizar la página actual con el contenido de la versión
          const { error: updateError } = await supabase
            .from('pages')
            .update({
              title: pageVersion.title_snapshot,
              content: pageVersion.content_snapshot,
              description: pageVersion.description_snapshot,
              updated_at: new Date().toISOString(),
              updated_by: (await supabase.auth.getUser()).data.user?.id
            })
            .eq('id', pageVersion.page_id);

          if (!updateError) {
            updatedPages.push(pageVersion.page_id);
            restoredCount++;
          }
        } catch (error) {
          console.error(`Error restaurando página ${pageVersion.page_id}:`, error);
        }
      }

      return {
        data: {
          restored_pages_count: restoredCount,
          updated_pages: updatedPages
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== ESTADÍSTICAS Y MÉTRICAS ===============

  /**
   * Obtiene estadísticas de una versión
   */
  async getVersionStats(versionId: string): Promise<ServiceResponse<VersionStats>> {
    try {
      // Obtener conteos básicos
      const [pagesResult, publishedResult, viewsResult, versionData] = await Promise.all([
        supabase.from('page_versions').select('id', { count: 'exact' }).eq('project_version_id', versionId),
        supabase.from('page_versions').select('page_id').eq('project_version_id', versionId).then(async ({ data }) => {
          if (!data) return { count: 0 };
          const pageIds = data.map(p => p.page_id);
          return supabase.from('pages').select('id', { count: 'exact' }).in('id', pageIds).eq('is_published', true);
        }),
        supabase.from('page_views').select('id', { count: 'exact' }).eq('project_version_id', versionId),
        this.getVersionById(versionId)
      ]);

      if (versionData.error) throw versionData.error;

      const stats: VersionStats = {
        version_id: versionId,
        pages_count: pagesResult.count || 0,
        published_pages_count: (await publishedResult).count || 0,
        total_views: viewsResult.count || 0,
        creation_date: versionData.data!.created_at,
        publish_date: versionData.data!.published_at
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene el historial de cambios entre versiones consecutivas
   */
  async getVersionHistory(projectId: string): Promise<ServiceResponse<Array<{
    version: ProjectVersion;
    changes_summary: {
      pages_added: number;
      pages_modified: number;
      pages_removed: number;
    };
  }>>> {
    try {
      // Obtener todas las versiones ordenadas por fecha
      const { data: versions, error } = await this.getProjectVersions(projectId, true);
      if (error) throw error;

      const history: any[] = [];

      // Comparar cada versión con la anterior
      for (let i = 0; i < (versions?.length || 0) - 1; i++) {
        const currentVersion = versions![i];
        const previousVersion = versions![i + 1];

        // Comparar versiones
        const { data: comparison } = await this.compareVersions(previousVersion.id, currentVersion.id);

        const changesSummary = {
          pages_added: comparison?.added_pages.length || 0,
          pages_modified: comparison?.modified_pages.length || 0,
          pages_removed: comparison?.removed_pages.length || 0
        };

        history.push({
          version: currentVersion,
          changes_summary: changesSummary
        });
      }

      return { data: history, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== UTILIDADES ===============

  /**
   * Valida un número de versión
   */
  validateVersionNumber(versionNumber: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar formato semántico (major.minor.patch)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(versionNumber)) {
      errors.push('El número de versión debe seguir el formato semántico (ejemplo: 1.0.0)');
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Sugiere el siguiente número de versión
   */
  async suggestNextVersion(projectId: string, type: 'major' | 'minor' | 'patch' = 'minor'): Promise<ServiceResponse<string>> {
    try {
      // Obtener la última versión
      const { data: versions } = await this.getProjectVersions(projectId);
      
      if (!versions || versions.length === 0) {
        return { data: '1.0.0', error: null };
      }

      const latestVersion = versions[0].version_number;
      const parts = latestVersion.split('.').map(Number);

      switch (type) {
        case 'major':
          return { data: `${parts[0] + 1}.0.0`, error: null };
        case 'minor':
          return { data: `${parts[0]}.${parts[1] + 1}.0`, error: null };
        case 'patch':
          return { data: `${parts[0]}.${parts[1]}.${parts[2] + 1}`, error: null };
        default:
          return { data: `${parts[0]}.${parts[1] + 1}.0`, error: null };
      }
    } catch (error) {
      return { data: null, error };
    }
  }
};