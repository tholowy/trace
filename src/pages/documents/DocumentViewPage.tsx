import { useState, useEffect, type  FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentService } from '../../services/documentService';
import { Pencil, Clock, Calendar, ChevronRight, Eye, EyeOff, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewer from '../../components/documents/DocumentViewer';
import type { Document } from '../../types';

const DocumentViewPage: FC = () => {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<boolean>(false);
  
  // Cargar documento
  useEffect(() => {
    async function fetchDocument() {
      if (!documentId) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await documentService.getDocumentById(documentId);
        
        if (error) throw error;
        
        setDocument(data);
      } catch (err: any) {
        setError('Error al cargar el documento: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDocument();
  }, [documentId]);
  
  // Función para cambiar estado de publicación
  const togglePublished = async () => {
    if (!document || !documentId) return;
    
    try {
      setPublishing(true);
      
      const newPublishedState = !document.is_published;
      const { data, error } = await documentService.publishDocument(documentId, newPublishedState);
      
      if (error) throw error;
      
      setDocument(data);
    } catch (err: any) {
      setError(`Error al ${document.is_published ? 'despublicar' : 'publicar'} el documento: ` + err.message);
    } finally {
      setPublishing(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando documento...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!document) {
    return <div className="p-4">Documento no encontrado</div>;
  }
  
  // Formatear fecha de actualización
  const formattedDate = document.updated_at 
    ? format(new Date(document.updated_at), 'dd MMMM yyyy', { locale: es })
    : '';
    
  // Determinar nombre del editor
  const editorName = document.updated_by_user?.user_profiles?.[0]
    ? `${document.updated_by_user.user_profiles[0].first_name} ${document.updated_by_user.user_profiles[0].last_name}`
    : document.updated_by_user?.email || 'Usuario desconocido';
  
  return (
    <div className="max-w-screen-xl mx-auto p-6">
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
            <div className="flex items-center">
              <Calendar size={16} className="mr-1" />
              <span>Actualizado el {formattedDate}</span>
            </div>
            <div className="flex items-center">
              <Clock size={16} className="mr-1" />
              <span>Version {document.version}</span>
            </div>
            <div className="flex items-center">
              <Pencil size={16} className="mr-1" />
              <span>Por {editorName}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to={`/projects/${projectId}/documents/${documentId}/versions`}
              className="btn-secondary flex items-center"
            >
              <History size={16} className="mr-1.5" />
              Historial
            </Link>
            
            <button
              onClick={togglePublished}
              className={`${
                document.is_published 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
              } px-3 py-1.5 rounded-md text-sm font-medium flex items-center`}
              disabled={publishing}
            >
              {document.is_published ? (
                <>
                  <EyeOff size={16} className="mr-1.5" />
                  {publishing ? 'Despublicando...' : 'Despublicar'}
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-1.5" />
                  {publishing ? 'Publicando...' : 'Publicar'}
                </>
              )}
            </button>
            
            <Link
              to={`/projects/${projectId}/documents/${documentId}/edit`}
              className="btn-primary flex items-center"
            >
              <Pencil size={16} className="mr-1.5" />
              Editar
            </Link>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          {document.title}
        </h1>
        
        {document.description && (
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {document.description}
          </p>
        )}
        
        <div className="flex items-center text-sm">
          <Link
            to={`/projects/${projectId}`}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {document.project?.name || 'Proyecto'}
          </Link>
          <ChevronRight size={16} className="mx-1 text-gray-400" />
          <Link
            to={`/projects/${projectId}?category=${document.category?.id}`}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {document.category?.name || 'Categoría'}
          </Link>
          <ChevronRight size={16} className="mx-1 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">{document.title}</span>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <DocumentViewer content={document.content} />
      </div>
    </div>
  );
};

export default DocumentViewPage;