import { supabase } from '../lib/supabase';
import type { ServiceResponse } from '../types';
import type { PublicationSettings,  PublicSite } from '../types/publication';

export const publicationService = {
  // Publicar un documento específico
  async publishDocument(documentId: string, settings: {
    isPublic?: boolean;
    requiresAuth?: boolean;
    accessPassword?: string;
    allowedDomains?: string[];
    expiresAt?: string;
  }): Promise<ServiceResponse<PublicationSettings>> {
    try {
      const { data, error } = await supabase
        .from('publication_settings')
        .upsert({
          project_id: '', // Se obtendría del documento
          publication_type: 'document',
          target_id: documentId,
          is_public: settings.isPublic || false,
          requires_auth: settings.requiresAuth || false,
          access_password: settings.accessPassword,
          allowed_domains: settings.allowedDomains,
          expires_at: settings.expiresAt,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Publicar proyecto completo
  async publishProject(projectId: string, settings: {
    siteName: string;
    description?: string;
    customDomain?: string;
    navigationStyle?: 'sidebar' | 'top' | 'both';
    primaryColor?: string;
    showSearch?: boolean;
  }): Promise<ServiceResponse<PublicSite>> {
    try {
      const { data, error } = await supabase
        .from('public_sites')
        .upsert({
          project_id: projectId,
          site_name: settings.siteName,
          description: settings.description,
          primary_color: settings.primaryColor || '#3B82F6',
          navigation_style: settings.navigationStyle || 'sidebar',
          show_search: settings.showSearch !== false,
          show_breadcrumbs: true,
          is_active: true
        })
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Obtener configuración de publicación
  async getPublicationSettings(targetId: string, type: 'project' | 'category' | 'document'): Promise<ServiceResponse<PublicationSettings>> {
    try {
      const { data, error } = await supabase
        .from('publication_settings')
        .select('*')
        .eq('target_id', targetId)
        .eq('publication_type', type)
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Generar token de acceso público
  async generateAccessToken(targetId: string, type: 'project' | 'document', options: {
    expiresInDays?: number;
    name?: string;
  }): Promise<ServiceResponse<{ token: string; url: string }>> {
    try {
      const expiresAt = options.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
        
      const token = crypto.randomUUID();
      
      const { error } = await supabase
        .from('access_tokens')
        .insert({
          [type === 'project' ? 'project_id' : 'document_id']: targetId,
          token,
          name: options.name || 'Token de acceso público',
          expires_at: expiresAt,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          is_active: true
        });
        
      if (error) throw error;
      
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/public/${type}/${token}`;
      
      return { data: { token, url }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};