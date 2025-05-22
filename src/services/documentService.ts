import { supabase } from '../lib/supabase';
import type { Document, DocumentVersion, ServiceResponse } from '../types';

export const documentService = {
  async getDocuments(projectId: string, categoryId?: string): Promise<ServiceResponse<Document[]>> {
    try {  
      let query = supabase
        .from('document_details')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
        
      // Filtrar por categoría si se proporciona
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async getDocumentById(id: string): Promise<ServiceResponse<Document>> {
    try {
      const { data, error } = await supabase
        .from('document_details')
        .select('*')
        .eq('id', id)
        .single();
        
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert(document)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async updateDocument(id: string, document: Partial<Document>): Promise<ServiceResponse<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(document)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async deleteDocument(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async getDocumentVersions(documentId: string): Promise<ServiceResponse<DocumentVersion[]>> {
    try {
      const { data, error } = await supabase
        .from('document_version_details')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async getDocumentVersion(versionId: string): Promise<ServiceResponse<DocumentVersion>> {
    try {
      const { data, error } = await supabase
        .from('document_version_details')
        .select('*')
        .eq('id', versionId)
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async createDocumentVersion(version: Omit<DocumentVersion, 'id' | 'created_at'>): Promise<ServiceResponse<DocumentVersion>> {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .insert(version)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async restoreVersion(documentId: string, versionId: string): Promise<{
    document: Document | null;
    version: DocumentVersion | null;
    error: any;
  }> {
    try {
      // 1. Obtener la versión a restaurar
      const { data: versionData, error: versionError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();
        
      if (versionError) throw versionError;
      
      // 2. Actualizar el documento con el contenido de la versión
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .update({ 
          content: versionData.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();
        
      if (docError) throw docError;
      
      // 3. Determinar nuevo número de versión
      const { data: latestVersions, error: latestError } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (latestError) throw latestError;
      
      let versionNumber = '1.0.0';
      
      if (latestVersions && latestVersions.length > 0) {
        const parts = latestVersions[0].version_number.split('.');
        const minor = parseInt(parts[1]) + 1;
        versionNumber = `${parts[0]}.${minor}.0`;
      }
      
      // 4. Crear una nueva versión con el contenido restaurado
      const { data: newVersionData, error: newVersionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          content: versionData.content,
          version_number: versionNumber,
          commit_message: `Restaurado desde versión ${versionData.version_number}`,
          parent_version_id: versionId,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          is_published: false
        })
        .select();
        
      if (newVersionError) throw newVersionError;
      
      return { 
        document: docData, 
        version: newVersionData[0], 
        error: null 
      };
    } catch (error) {
      return { document: null, version: null, error };
    }
  },

  async publishDocument(documentId: string, isPublished = true): Promise<ServiceResponse<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ 
          is_published: isPublished,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};
