import { supabase } from "../lib/supabase";
import type {
  Project,
  ProjectMember,
  Category,
  ServiceResponse,
} from "../types";

export type Role = {
  id: number;
  name: string;
};

export const projectService = {
  async getProjects(): Promise<ServiceResponse<Project[]>> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getProjectPermissions(): Promise<
    ServiceResponse<{ id: number; name: string; description?: string }[]>
  > {
    try {
      const { data, error } = await supabase
        .from("project_permissions")
        .select("id, name, description")
        .order("id", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // NUEVA FUNCIÓN: Usar la función RPC específica para invitar/agregar miembros
  async inviteOrAddMember(
    projectId: string, 
    email: string, 
    permissionId: number
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.rpc("invite_or_add_project_member", {
        project_id_param: projectId,
        email_param: email,
        project_permission_id_param: permissionId,
      });

      if (error) throw error;
      
      return { data: data || "Miembro procesado exitosamente", error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // FUNCIÓN OBSOLETA - mantener por compatibilidad pero recomendar usar inviteOrAddMember
  async agregarMiembro(projectId: string, email: string, permissionId: number) {
    console.warn("agregarMiembro está obsoleto, usa inviteOrAddMember");
    return this.inviteOrAddMember(projectId, email, permissionId);
  },

  async getProjectById(id: string): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async createProject(
    project: Omit<Project, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async updateProject(
    id: string,
    project: Partial<Project>
  ): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update(project)
        .eq("id", id)
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
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // FUNCIÓN ACTUALIZADA: Usar la vista project_members_detailed
  async getProjectMembers(
    projectId: string
  ): Promise<ServiceResponse<ProjectMember[]>> {
    try {
      const { data: members, error } = await supabase
        .from("project_members_detailed")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transformar los datos para que coincidan con el tipo ProjectMember esperado
      const transformedMembers: ProjectMember[] = (members || []).map((member) => ({
        id: member.id,
        project_id: member.project_id,
        user_id: member.user_id,
        project_permission_id: member.project_permission_id,
        created_at: member.created_at,
        permission_name: member.permission_name,
        permission_description: member.permission_description,
        is_owner: member.is_owner,
        user: {
          id: member.user_id,
          email: member.email,
          profile: {
            id: member.user_id,
            first_name: member.first_name,
            last_name: member.last_name,
            avatar_url: member.avatar_url,
            job_title: member.job_title,
            company: member.company,
            created_at: "", // La vista no incluye estas fechas
            updated_at: "",
          },
        },
      }));

      return { data: transformedMembers, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // FUNCIÓN OBSOLETA - mantener por compatibilidad pero usar inviteOrAddMember
  async addProjectMember(
    projectId: string,
    userId: string,
    projectPermissionId: number
  ): Promise<ServiceResponse<ProjectMember>> {
    console.warn("addProjectMember está obsoleto, usa inviteOrAddMember con email");
    try {
      const { data: member, error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: userId,
          project_permission_id: projectPermissionId,
        })
        .select("*")
        .single();

      if (memberError) throw memberError;

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        // Si no hay perfil, crear uno básico
        console.warn("Perfil no encontrado para usuario:", userId);
      }

      const newMember: ProjectMember = {
        ...member,
        user: {
          id: userId,
          profile: profile || {
            id: userId,
            first_name: "",
            last_name: "",
            avatar_url: "",
            job_title: "",
            company: "",
            created_at: "",
            updated_at: "",
          },
        },
      };

      return { data: newMember, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // FUNCIÓN ACTUALIZADA: Usar la función RPC específica
  async updateProjectMember(
    projectId: string,
    userId: string,
    newPermissionId: number
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.rpc("update_member_permission", {
        project_id_param: projectId,
        user_id_param: userId,
        new_permission_id_param: newPermissionId,
      });

      if (error) throw error;
      
      return { data: data || "Permiso actualizado exitosamente", error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // FUNCIÓN ACTUALIZADA: Usar la función RPC específica
  async removeProjectMember(
    projectId: string,
    userId: string
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.rpc("remove_project_member", {
        project_id_param: projectId,
        user_id_param: userId,
      });

      if (error) throw error;
      
      return { data: data || "Miembro eliminado exitosamente", error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // NUEVA FUNCIÓN: Obtener permisos del usuario actual en un proyecto
  async getUserProjectPermission(
    projectId: string
  ): Promise<ServiceResponse<{
    permission_id: number;
    permission_name: string;
    is_owner: boolean;
  }>> {
    try {
      const { data, error } = await supabase.rpc("get_user_project_permission", {
        project_id_param: projectId,
      });

      if (error) throw error;
      
      return { data: data?.[0] || null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // NUEVA FUNCIÓN: Diagnosticar problemas de usuario
  async diagnoseUserIssues(
    userId: string
  ): Promise<ServiceResponse<Array<{
    check_name: string;
    status: string;
    details: string;
  }>>> {
    try {
      const { data, error } = await supabase.rpc("diagnose_user_issues", {
        user_id_param: userId,
      });

      if (error) throw error;
      
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // NUEVA FUNCIÓN: Limpiar invitaciones expiradas
  async cleanupExpiredInvitations(): Promise<ServiceResponse<{
    deleted_count: number;
    oldest_expired: string;
    details: string;
  }>> {
    try {
      const { data, error } = await supabase.rpc("cleanup_expired_invitations");

      if (error) throw error;
      
      return { data: data?.[0] || null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getRoles(): Promise<ServiceResponse<Role[]>> {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // NOTA: Las funciones de categorías siguen igual pero deberían actualizarse para usar "pages"
  // según el nuevo esquema de base de datos
  async getCategories(projectId: string): Promise<ServiceResponse<Category[]>> {
    console.warn("getCategories debería migrar a usar 'pages' según el nuevo esquema");
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async createCategory(
    category: Omit<Category, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResponse<Category>> {
    console.warn("createCategory debería migrar a usar 'pages' según el nuevo esquema");
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async updateCategory(
    id: string,
    category: Partial<Category>
  ): Promise<ServiceResponse<Category>> {
    console.warn("updateCategory debería migrar a usar 'pages' según el nuevo esquema");
    try {
      const { data, error } = await supabase
        .from("categories")
        .update(category)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async deleteCategory(id: string): Promise<ServiceResponse<null>> {
    console.warn("deleteCategory debería migrar a usar 'pages' según el nuevo esquema");
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};