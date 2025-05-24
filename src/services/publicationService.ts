import { supabase } from '../lib/supabase';
import type { 
  ServiceResponse, 
  PublicSite, 
  AccessToken, 
  ProjectVersion, 
  Page,
  SiteSettings,
  NavigationConfig
} from '../types';

export const publicationService = {
  // =============== GESTIÓN DE SITIOS PÚBLICOS ===============

  /**
   * Obtiene la configuración del sitio público de un proyecto
   */
  async getPublicSite(projectId: string): Promise<ServiceResponse<PublicSite>> {
    try {
      const { data, error } = await supabase
        .from('public_sites')
        .select(`
          *,
          project:projects (
            id,
            name,
            slug,
            description,
            logo_url,
            is_public
          )
        `)
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Crea o actualiza la configuración del sitio público
   */
  async createOrUpdatePublicSite(projectId: string, config: Partial<PublicSite>): Promise<ServiceResponse<PublicSite>> {
    try {
      const { data, error } = await supabase
        .from('public_sites')
        .upsert({
          project_id: projectId,
          ...config,
          updated_at: new Date().toISOString()
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
   * Publica un proyecto completo (con versión específica)
   */
  async publishProject(projectId: string, options: {
    version_id?: string; // Si no se especifica, usa la versión actual
    site_config?: Partial<PublicSite>;
    make_project_public?: boolean;
  } = {}): Promise<ServiceResponse<{
    public_site: PublicSite;
    published_version: ProjectVersion;
    public_url: string;
  }>> {
    try {
      // Si se especifica hacer el proyecto público, actualizarlo
      if (options.make_project_public) {
        await supabase
          .from('projects')
          .update({ is_public: true })
          .eq('id', projectId);
      }

      // Obtener o crear configuración del sitio público
      let publicSite: PublicSite;
      const { data: existingSite } = await this.getPublicSite(projectId);
      
      if (existingSite) {
        const { data: updatedSite } = await this.createOrUpdatePublicSite(projectId, {
          ...options.site_config,
          is_active: true
        });
        publicSite = updatedSite!;
      } else {
        // Crear configuración por defecto si no existe
        const { data: project } = await supabase
          .from('projects')
          .select('name, description, logo_url')
          .eq('id', projectId)
          .single();

        const defaultConfig: Partial<PublicSite> = {
          site_name: project?.name || 'Documentación',
          description: project?.description,
          logo_url: project?.logo_url,
          navigation_style: 'sidebar',
          show_search: true,
          show_breadcrumbs: true,
          is_active: true,
          ...options.site_config
        };

        const { data: newSite } = await this.createOrUpdatePublicSite(projectId, defaultConfig);
        publicSite = newSite!;
      }

      // Obtener versión a publicar
      let versionToPublish: ProjectVersion;
      if (options.version_id) {
        const { data: version, error } = await supabase
          .from('project_versions')
          .select('*')
          .eq('id', options.version_id)
          .single();
        
        if (error) throw error;
        versionToPublish = version;
      } else {
        // Usar versión actual
        const { data: currentVersion, error } = await supabase
          .from('project_versions')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_current', true)
          .single();

        if (error) throw error;
        versionToPublish = currentVersion;
      }

      // Generar URL pública
      const { data: projectData } = await supabase
        .from('projects')
        .select('slug')
        .eq('id', projectId)
        .single();

      const baseUrl = window.location.origin;
      const publicUrl = publicSite.custom_domain 
        ? `https://${publicSite.custom_domain}`
        : `${baseUrl}/docs/${projectData?.slug}`;

      return {
        data: {
          public_site: publicSite,
          published_version: versionToPublish,
          public_url: publicUrl
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Despublica un proyecto (lo hace privado)
   */
  async unpublishProject(projectId: string): Promise<ServiceResponse<null>> {
    try {
      // Hacer el proyecto privado
      await supabase
        .from('projects')
        .update({ is_public: false })
        .eq('id', projectId);

      // Desactivar el sitio público
      await supabase
        .from('public_sites')
        .update({ is_active: false })
        .eq('project_id', projectId);

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== GESTIÓN DE TOKENS DE ACCESO ===============

  /**
   * Genera un token de acceso para compartir contenido
   */
  async generateAccessToken(options: {
    project_id?: string;
    project_version_id?: string;
    page_id?: string;
    name: string;
    expires_in_days?: number;
  }): Promise<ServiceResponse<AccessToken & { url: string }>> {
    try {
      const token = crypto.randomUUID();
      const expiresAt = options.expires_in_days 
        ? new Date(Date.now() + options.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('access_tokens')
        .insert({
          project_id: options.project_id,
          project_version_id: options.project_version_id,
          page_id: options.page_id,
          token,
          name: options.name,
          expires_at: expiresAt,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Generar URL según el tipo de token
      const baseUrl = window.location.origin;
      let url = '';

      if (options.project_id) {
        url = `${baseUrl}/public/project/${token}`;
      } else if (options.project_version_id) {
        url = `${baseUrl}/public/version/${token}`;
      } else if (options.page_id) {
        url = `${baseUrl}/public/page/${token}`;
      }

      return { data: { ...data, url }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene todos los tokens de acceso de un proyecto
   */
  async getAccessTokens(projectId: string): Promise<ServiceResponse<AccessToken[]>> {
    try {
      const { data, error } = await supabase
        .from('access_tokens')
        .select(`
          *,
          project:projects (id, name, slug),
          project_version:project_versions (id, version_number, version_name),
          page:pages (id, title, slug)
        `)
        .or(`project_id.eq.${projectId},project_version_id.in.(select id from project_versions where project_id='${projectId}'),page_id.in.(select id from pages where project_id='${projectId}')`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Valida y obtiene información de un token de acceso
   */
  async validateAccessToken(token: string): Promise<ServiceResponse<{
    token_data: AccessToken;
    content_type: 'project' | 'version' | 'page';
    content: any;
    is_valid: boolean;
  }>> {
    try {
      const { data: tokenData, error } = await supabase
        .from('access_tokens')
        .select(`
          *,
          project:projects (*),
          project_version:project_versions (*),
          page:pages (*)
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Verificar expiración
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return {
          data: {
            token_data: tokenData,
            content_type: 'project',
            content: null,
            is_valid: false
          },
          error: null
        };
      }

      // Actualizar último uso
      await supabase
        .from('access_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      // Determinar tipo de contenido y obtener datos
      let contentType: 'project' | 'version' | 'page';
      let content: any;

      if (tokenData.project_id) {
        contentType = 'project';
        content = tokenData.project;
      } else if (tokenData.project_version_id) {
        contentType = 'version';
        content = tokenData.project_version;
      } else if (tokenData.page_id) {
        contentType = 'page';
        content = tokenData.page;
      } else {
        throw new Error('Token inválido');
      }

      return {
        data: {
          token_data: tokenData,
          content_type: contentType,
          content,
          is_valid: true
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Revoca un token de acceso
   */
  async revokeAccessToken(tokenId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('access_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== CONFIGURACIÓN DE SITIO PÚBLICO ===============

  /**
   * Actualiza el tema visual del sitio público
   */
  async updateSiteTheme(projectId: string, theme: {
    primary_color?: string;
    secondary_color?: string;
    custom_css?: string;
  }): Promise<ServiceResponse<PublicSite>> {
    try {
      const { data, error } = await supabase
        .from('public_sites')
        .update(theme)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Actualiza la configuración de navegación
   */
  async updateNavigationConfig(projectId: string, config: Partial<NavigationConfig>): Promise<ServiceResponse<PublicSite>> {
    try {
      const { data, error } = await supabase
        .from('public_sites')
        .update({
          navigation_style: config.style,
          show_search: config.show_search,
          show_breadcrumbs: config.show_breadcrumbs
        })
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Configura dominio personalizado
   */
  async setupCustomDomain(projectId: string, domain: string): Promise<ServiceResponse<{
    domain: string;
    verification_record: string;
    status: 'pending' | 'verified' | 'failed';
  }>> {
    try {
      // Validar formato del dominio
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain)) {
        throw new Error('Formato de dominio inválido');
      }

      // Generar registro de verificación
      const verificationRecord = `trace-verify=${crypto.randomUUID()}`;

      // Actualizar configuración
      await supabase
        .from('public_sites')
        .update({ 
          custom_domain: domain,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId);

      return {
        data: {
          domain,
          verification_record: verificationRecord,
          status: 'pending'
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== OBTENCIÓN DE CONTENIDO PÚBLICO ===============

  /**
   * Obtiene el sitio público por slug del proyecto
   */
  async getPublicSiteBySlug(projectSlug: string): Promise<ServiceResponse<{
    site: PublicSite;
    project: any;
    current_version: ProjectVersion;
  }>> {
    try {
      // Obtener proyecto por slug
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', projectSlug)
        .eq('is_public', true)
        .single();

      if (projectError) throw projectError;

      // Obtener configuración del sitio
      const { data: site, error: siteError } = await this.getPublicSite(project.id);
      if (siteError) throw siteError;

      // Obtener versión actual
      const { data: currentVersion, error: versionError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_current', true)
        .single();

      if (versionError) throw versionError;

      return {
        data: {
          site: site!,
          project,
          current_version: currentVersion
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Obtiene contenido público de una página específica
   */
  async getPublicPageContent(
    projectSlug: string, 
    pagePath: string, 
    versionNumber?: string
  ): Promise<ServiceResponse<{
    page: Page;
    site: PublicSite;
    project: any;
    version: ProjectVersion;
    navigation_tree: any[];
  }>> {
    try {
      // Obtener información del sitio público
      const { data: siteData, error: siteError } = await this.getPublicSiteBySlug(projectSlug);
      if (siteError) throw siteError;

      let targetVersion = siteData!.current_version;

      // Si se especifica una versión diferente, obtenerla
      if (versionNumber && versionNumber !== targetVersion.version_number) {
        const { data: specificVersion, error: versionError } = await supabase
          .from('project_versions')
          .select('*')
          .eq('project_id', siteData!.project.id)
          .eq('version_number', versionNumber)
          .single();

        if (versionError) throw versionError;
        targetVersion = specificVersion;
      }

      // Obtener la página por su ruta
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', siteData!.project.id)
        .eq('is_published', true);

      if (pageError) throw pageError;

      // Encontrar la página correcta siguiendo la ruta
      // Esto es una implementación simplificada, en producción usarías la función getPageByPath
      const targetPage = page?.find(p => {
        // Lógica para encontrar página por ruta
        return p.slug === pagePath.split('/').pop();
      });

      if (!targetPage) {
        throw new Error('Página no encontrada');
      }

      // Obtener árbol de navegación
      const { data: navigationTree } = await supabase.rpc('get_page_tree', {
        project_id_param: siteData!.project.id,
        project_version_id_param: targetVersion.id
      });

      return {
        data: {
          page: targetPage,
          site: siteData!.site,
          project: siteData!.project,
          version: targetVersion,
          navigation_tree: navigationTree || []
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== ESTADÍSTICAS DE SITIO PÚBLICO ===============

  /**
   * Obtiene estadísticas de acceso al sitio público
   */
  async getPublicSiteStats(projectId: string, options: {
    from_date?: string;
    to_date?: string;
    group_by?: 'day' | 'week' | 'month';
  } = {}): Promise<ServiceResponse<{
    total_views: number;
    unique_visitors: number;
    popular_pages: Array<{
      page_id: string;
      page_title: string;
      views: number;
    }>;
    traffic_over_time: Array<{
      date: string;
      views: number;
      unique_visitors: number;
    }>;
  }>> {
    try {
      // Construir filtros de fecha
      const fromDate = options.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = options.to_date || new Date().toISOString();

      // Obtener estadísticas básicas
      const [totalViewsResult, uniqueVisitorsResult] = await Promise.all([
        supabase
          .from('page_views')
          .select('id', { count: 'exact' })
          .eq('page_id', 'any') // Esto necesita ajustarse para filtrar por proyecto
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
        
        supabase
          .from('page_views')
          .select('ip_address', { count: 'exact' })
          .eq('page_id', 'any') // Esto necesita ajustarse
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
      ]);

      // Páginas más populares
      const { data: popularPages } = await supabase
        .from('page_views')
        .select(`
          page_id,
          page:pages (title),
          count:id
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      // Agrupar y contar vistas por página
      const pageStats = new Map();
      popularPages?.forEach(view => {
        const current = pageStats.get(view.page_id) || { page_title: view.page[0].title, views: 0 };
        current.views++;
        pageStats.set(view.page_id, current);
      });

      const topPages = Array.from(pageStats.entries())
        .map(([page_id, stats]: [string, any]) => ({
          page_id,
          page_title: stats.page_title,
          views: stats.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return {
        data: {
          total_views: totalViewsResult.count || 0,
          unique_visitors: uniqueVisitorsResult.count || 0,
          popular_pages: topPages,
          traffic_over_time: [] // Implementar agrupación por tiempo
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== EXPORTACIÓN Y BACKUP ===============

  /**
   * Exporta el sitio público para backup o migración
   */
  async exportPublicSite(projectId: string, versionId?: string): Promise<ServiceResponse<{
    export_url: string;
    format: 'json' | 'zip';
    includes: string[];
  }>> {
    try {
      // Esta sería una operación compleja que requeriría un proceso en background
      // Por ahora, retornamos una estructura básica
      
      return {
        data: {
          export_url: '/api/exports/temp-export-id',
          format: 'json',
          includes: ['pages', 'site_config', 'assets', 'navigation']
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // =============== UTILIDADES ===============

  /**
   * Genera un preview del sitio público
   */
  async generateSitePreview(projectId: string, versionId?: string): Promise<ServiceResponse<{
    preview_url: string;
    expires_at: string;
  }>> {
    try {
      // Generar token temporal para preview
      const { data: previewToken } = await this.generateAccessToken({
        project_id: projectId,
        name: 'Preview temporal',
        expires_in_days: 1
      });

      if (!previewToken) throw new Error('Error generando preview');

      return {
        data: {
          preview_url: previewToken.url,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Valida la configuración del sitio público
   */
  validateSiteConfig(config: Partial<PublicSite>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.site_name && config.site_name.length < 3) {
      errors.push('El nombre del sitio debe tener al menos 3 caracteres');
    }

    if (config.custom_domain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(config.custom_domain)) {
        errors.push('El dominio personalizado tiene un formato inválido');
      }
    }

    if (config.primary_color && !/^#[0-9A-F]{6}$/i.test(config.primary_color)) {
      errors.push('El color primario debe ser un código hexadecimal válido');
    }

    return { isValid: errors.length === 0, errors };
  },

  getProjectCurrentVersion: async (projectId: string): Promise<ServiceResponse<ProjectVersion>> => {
    try {
      const { data, error } = await supabase
        .from('project_version_details')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};