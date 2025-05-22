import { supabase } from '../lib/supabase';
import type { Category, Document, ServiceResponse } from '../types';

export const categoryService = {
  async getCategories(projectId: string): Promise<ServiceResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id (
            id,
            name
          ),
          document_count:documents!category_id(count)
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async getCategoryById(id: string): Promise<ServiceResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id (
            id,
            name
          ),
          project:project_id (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Category>> {
    try {
      // Obtener el último order_index para ordenar correctamente
      let query = supabase
        .from('categories')
        .select('order_index')
        .eq('project_id', category.project_id);
      
      // Manejar correctamente el caso de parent_id null
      if (category.parent_id) {
        // Si hay parent_id, filtrar por ese valor
        query = query.eq('parent_id', category.parent_id);
      } else {
        // Si no hay parent_id (es null), usar .is() en lugar de .eq()
        query = query.is('parent_id', null);
      }
      
      // Completar la consulta con orden y límite
      const { data: lastCategory, error: indexError } = await query
        .order('order_index', { ascending: false })
        .limit(1);
      
      if (indexError) throw indexError;
      
      // Asignar el siguiente order_index
      const nextIndex = lastCategory && lastCategory.length > 0 
        ? lastCategory[0].order_index + 1 
        : 0;
      
      const categoryData = {
        ...category,
        order_index: nextIndex
      };
      
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async updateCategory(id: string, category: Partial<Category>): Promise<ServiceResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async deleteCategory(id: string): Promise<ServiceResponse<null>> {
    try {
      // Primero verificar si hay documentos en esta categoría
      const { count, error: countError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
        
      if (countError) throw countError;
      
      if (count && count > 0) {
        throw new Error(`No se puede eliminar la categoría porque contiene ${count} documentos.`);
      }
      
      // Verificar si hay subcategorías
      const { count: subCount, error: subCountError } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', id);
        
      if (subCountError) throw subCountError;
      
      if (subCount && subCount > 0) {
        throw new Error(`No se puede eliminar la categoría porque contiene ${subCount} subcategorías.`);
      }
      
      // Si no hay documentos ni subcategorías, eliminar
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async getDocumentsByCategory(categoryId: string): Promise<ServiceResponse<Document[]>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          created_by_user:created_by (
            email,
            user_profiles (
              first_name,
              last_name
            )
          ),
          updated_by_user:updated_by (
            email,
            user_profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('category_id', categoryId)
        .order('title', { ascending: true });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

