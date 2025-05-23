import type { FC } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PageEditor from '../../components/pages/PageEditor';
import type { Page } from '../../types';

const PageNewPage: FC = () => {
  const { projectId, categoryId } = useParams<{ projectId: string; categoryId?: string }>();
  const [searchParams] = useSearchParams();
  const parentIdFromQuery = searchParams.get('parentId');
  const navigate = useNavigate();
  
  // Usar categoryId de URL params o parentId de query params
  const effectiveParentId = categoryId || parentIdFromQuery || undefined;
  
  const handleSave = (page?: Page) => {
    if (page) {
      navigate(`/projects/${projectId}/pages/${page.id}`);
    }
  };
  
  const handleCancel = () => {
    if (effectiveParentId) {
      navigate(`/projects/${projectId}/pages/${effectiveParentId}`);
    } else {
      navigate(`/projects/${projectId}`);
    }
  };
  
  if (!projectId) {
    return <div className="p-4 text-red-500">ID de proyecto no proporcionado</div>;
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft size={16} className="mr-1" />
          Volver
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Crear nueva página
      </h1>
      
      <PageEditor 
        projectId={projectId}
        parentPageId={effectiveParentId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default PageNewPage;