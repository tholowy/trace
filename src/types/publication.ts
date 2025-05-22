export interface PublicationSettings {
  id: string;
  project_id: string;
  publication_type: 'project' | 'category' | 'document';
  target_id: string; // ID del proyecto, categoría o documento
  is_public: boolean;
  requires_auth: boolean;
  custom_domain?: string;
  custom_slug?: string;
  access_password?: string;
  allowed_domains?: string[]; // Dominios de email permitidos
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PublicSite {
  id: string;
  project_id: string;
  site_name: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_css?: string;
  navigation_style: 'sidebar' | 'top' | 'both';
  show_search: boolean;
  show_breadcrumbs: boolean;
  footer_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}