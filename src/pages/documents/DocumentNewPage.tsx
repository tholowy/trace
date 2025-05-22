import type { FC } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DocumentEditor from '../../components/editor/DocumentEditor';
import { ChevronLeft } from 'lucide-react';
import type { Document } from '../../types';

const DocumentNewPage: FC = () => {
  const { projectId, categoryId } = useParams<{ projectId: string; categoryId?: string }>();
  const [searchParams] = useSearchParams();
  const categoryIdFromQuery = searchParams.get('categoryId');
  const navigate = useNavigate();
  
  // Usar categoryId de URL params o de query params
  const effectiveCategoryId = categoryId || categoryIdFromQuery || undefined;
  
  const handleSave = (document?: Document) => {
    if (document) {
      navigate(`/projects/${projectId}/documents/${document.id}`);
    }
  };
  
  if (!projectId) {
    return <div className="p-4 text-red-500">ID de proyecto no proporcionado</div>;
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft size={16} className="mr-1" />
          Volver al proyecto
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Crear nuevo documento
      </h1>
      
      <DocumentEditor 
        projectId={projectId}
        categoryId={effectiveCategoryId}
        onSave={handleSave}
      />
    </div>
  );
};

export default DocumentNewPage;