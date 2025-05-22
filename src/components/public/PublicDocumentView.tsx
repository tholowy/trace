import { useState, useEffect, type FC } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { documentService } from '../../services/documentService';
import type { Document } from '../../types';
import DocumentViewer from '../../components/documents/DocumentViewer';
import { ArrowLeft, Calendar, User, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

const PublicDocumentView: FC = () => {
  const { documentId, token } = useParams<{ documentId?: string; token?: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        
        let docId = documentId;
        
        // Si tenemos token, validarlo primero
        if (token) {
          const { data: tokenData, error: tokenError } = await supabase
            .from('access_tokens')
            .select('document_id, is_active, expires_at')
            .eq('token', token)
            .single();
            
          if (tokenError || !tokenData?.is_active) {
            throw new Error('Token de acceso inválido o expirado');
          }
          
          // Verificar expiración
          if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            throw new Error('El enlace ha expirado');
          }
          
          docId = tokenData.document_id;
        }
        
        if (!docId) {
          throw new Error('Documento no especificado');
        }
        
        // Cargar documento
        const { data: docData, error: docError } = await documentService.getDocumentById(docId);
        
        if (docError) throw docError;
        
        // Verificar si el documento está publicado (solo si no usamos token)
        if (!token && !docData?.is_published) {
          throw new Error('Este documento no está disponible públicamente');
        }
        
        setDocument(docData);
        
        // Registrar vista
        await supabase
          .from('document_views')
          .insert({
            document_id: docId,
            ip_address: 'public',
            user_agent: navigator.userAgent,
            referrer: window.document.referrer || null
          });
          
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadDocument();
  }, [documentId, token]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
              Error de acceso
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error}
            </p>
            <Link 
              to="/docs"
              className="inline-flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <ArrowLeft size={16} className="mr-1" />
              Volver a la documentación
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return <Navigate to="/docs" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navegación */}
      <div className="mb-6">
        <Link 
          to="/docs"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a la documentación
        </Link>
        
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-2">
          <Link to="/docs" className="hover:text-gray-700 dark:hover:text-gray-300">
            Documentación
          </Link>
          <span>›</span>
          <span className="flex items-center">
            <Folder size={14} className="mr-1" />
            {document.project?.name}
          </span>
          <span>›</span>
          <span>{document.category?.name}</span>
          <span>›</span>
          <span className="text-gray-700 dark:text-gray-300">{document.title}</span>
        </div>
      </div>

      {/* Información del documento */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
          {document.title}
        </h1>
        
        {document.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
            {document.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Calendar size={16} className="mr-1" />
            <span>
              Actualizado el {format(new Date(document.updated_at), 'dd MMMM yyyy', { locale: es })}
            </span>
          </div>
          
          <div className="flex items-center">
            <User size={16} className="mr-1" />
            <span>
              Versión {document.version}
            </span>
          </div>
          
          {document.updated_by_user?.user_profiles?.[0] && (
            <div className="flex items-center">
              <span>Por: {document.updated_by_user.user_profiles[0].first_name} {document.updated_by_user.user_profiles[0].last_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido del documento */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <DocumentViewer content={document.content} />
      </div>
    </div>
  );
};

export default PublicDocumentView;
