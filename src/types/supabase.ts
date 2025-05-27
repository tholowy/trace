
// Tipos específicos para la integración con Supabase

import type { Attachment, Category, DocumentVersion, PageSearchResult, Project, ProjectMember, Role, UserProfile, UserRole } from ".";

export type Tables = {
  projects: Project;
  categories: Category;
  documents: Document;
  document_versions: DocumentVersion;
  user_profiles: UserProfile;
  roles: Role;
  user_roles: UserRole;
  project_members: ProjectMember;
  attachments: Attachment;
  comments: Comment;
  document_links: {
    id: string;
    source_document_id: string;
    target_document_id: string;
    link_text?: string;
    created_at: string;
    created_by: string;
  };
  document_tags: {
    id: string;
    document_id: string;
    tag_id: string;
    created_at: string;
    created_by: string;
  };
  tags: {
    id: string;
    project_id: string;
    name: string;
    color?: string;
    created_at: string;
  };
  access_tokens: {
    id: string;
    project_id?: string;
    document_id?: string;
    token: string;
    name: string;
    expires_at?: string;
    created_at: string;
    created_by: string;
    last_used_at?: string;
    is_active: boolean;
  };
  activity_logs: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    details?: any;
    created_at: string;
    user_id?: string;
  };
  document_views: {
    id: string;
    document_id: string;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
    created_at: string;
  };
  user_preferences: {
    id: string;
    user_id: string;
    theme?: string;
    editor_autosave?: boolean;
    notifications_enabled?: boolean;
    preferences?: any;
    created_at: string;
    updated_at: string;
  };
};

// Tipos para las respuestas de funciones RPC de Supabase
export type Database = {
  public: {
    Tables: Tables;
    Views: {
      [key: string]: any;
    };
    Functions: {
      search_pages: (args: {
        search_term: string;
        project_id_param?: string;
        category_id_param?: string;
        limit_param?: number;
        offset_param?: number;
      }) => PageSearchResult[];
    };
  };
};