import { type FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import DocumentEditor from '../../components/editor/DocumentEditor';
import { documentService } from '../../services/documentService';

const DocumentEditPage: FC = () => {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  const handleSave = () => {
    if (documentId) {
      navigate(`/projects/${projectId}/documents/${documentId}`);
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
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/documents/${documentId}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft size={16} className="mr-1" />
          Volver al documento
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Editar documento: {document.title}
      </h1>
      
      <DocumentEditor
        documentId={documentId}
        projectId={projectId}
        categoryId={document.category_id}
        initialContent={document.content}
        onSave={handleSave}
      />
    </div>
  );
};

export default DocumentEditPage;
