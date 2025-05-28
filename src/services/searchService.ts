import { supabase } from '../lib/supabase';
import type { PageSearchResult, ServiceResponse } from '../types';

export const searchService = {
  async searchPages(
    searchTerm: string,
    options?: {
      projectId?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResponse<PageSearchResult[]>> {
    try {
      const { projectId, categoryId, limit = 20, offset = 0 } = options || {};
      
      const { data, error } = await supabase.rpc('search_pages', {
        search_term: searchTerm,
        project_id_param: projectId || null,
        project_version_id_param: categoryId || null,
        limit_param: limit,
        offset_param: offset
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};