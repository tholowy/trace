import { supabase } from '../lib/supabase';
import type { Project, ProjectMember, Category, ServiceResponse } from '../types';

export const projectService = {
  async getProjects(): Promise<ServiceResponse<Project[]>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getProjectById(id: string): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateProject(id: string, project: Partial<Project>): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(project)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteProject(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getProjectMembers(projectId: string): Promise<ServiceResponse<ProjectMember[]>> {
    try {
      // 1. Obtener los miembros del proyecto
      const { data: members, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      if (!members || members.length === 0) {
        return { data: [], error: null };
      }

      // 2. Obtener información de los usuarios
      const userIds = members.map(member => member.user_id);

      // Obtener perfiles de usuario
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 3. Combinar la información
      const enrichedMembers = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);

        return {
          ...member,
          user: {
            id: member.user_id,
            profile: profile || null
          }
        };
      });

      return { data: enrichedMembers, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addProjectMember(
    projectId: string,
    userId: string,
    permissionLevel: ProjectMember['permission_level'] = 'viewer'
  ): Promise<ServiceResponse<ProjectMember>> {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          permission_level: permissionLevel
        })
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateProjectMember(
    projectId: string,
    userId: string,
    permissionLevel: ProjectMember['permission_level']
  ): Promise<ServiceResponse<ProjectMember>> {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .update({ permissionLevel })
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async removeProjectMember(projectId: string, userId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCategories(projectId: string): Promise<ServiceResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
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
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};