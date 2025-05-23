import { supabase } from '../lib/supabase';
import type { Project, ProjectMember, Category, ServiceResponse, Role } from '../types';


export const projectService = {
  async getProjects(): Promise<ServiceResponse<Project[]>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) { // Explicitly type error as any
      return { data: null, error: error.message }; // Return error message
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    userId: string, // This userId should come from a lookup or actual user registration
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
        .select(`
          *,
          user_profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            email
          )
        `) // Select to get the full member data with user profile
        .single();

      if (error) throw error;

      // Structure the returned data to match ProjectMember
      const newMember: ProjectMember = {
        ...data,
        user: {
          id: data.user_profiles.id,
          email: data.user_profiles.email,
          profile: {
            id: data.user_profiles.id,
            first_name: data.user_profiles.first_name,
            last_name: data.user_profiles.last_name,
            avatar_url: data.user_profiles.avatar_url,
          },
        },
      };
      return { data: newMember, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
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
        .update({ permission_level: permissionLevel }) // Corrected column name to 'permission_level'
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .select(`
          *,
          user_profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            email
          )
        `) // Select to get the updated member data with user profile
        .single();

      if (error) throw error;

      // Structure the returned data to match ProjectMember
      const updatedMember: ProjectMember = {
        ...data,
        user: {
          id: data.user_profiles.id,
          email: data.user_profiles.email,
          profile: {
            id: data.user_profiles.id,
            first_name: data.user_profiles.first_name,
            last_name: data.user_profiles.last_name,
            avatar_url: data.user_profiles.avatar_url,
            created_at: '', // Placeholder
            updated_at: ''  // Placeholder
          },
        },
      };
      return { data: updatedMember, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getRoles(): Promise<ServiceResponse<Role[]>> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true }); // Order alphabetically

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
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
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
};