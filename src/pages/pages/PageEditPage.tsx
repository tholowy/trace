import { type FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PageEditor from '../../components/pages/PageEditor';
import { pageService } from '../../services/pageService';
import type { Page } from '../../types';

const PageEditPage: FC = () => {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const navigate = useNavigate();
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchPage() {
      if (!pageId) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await pageService.getPageById(pageId);
        
        if (error) throw error;
        
        setPage(data);
      } catch (err: any) {
        setError('Error al cargar la página: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPage();
  }, [pageId]);
  
  const handleSave = () => {
    if (pageId) {
      // navigate(`/projects/${projectId}/pages/${pageId}`);
    }
  };
  
  const handleCancel = () => {
    navigate(`/projects/${projectId}/pages/${pageId}`);
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando página...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!page) {
    return <div className="p-4">Página no encontrada</div>;
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft size={16} className="mr-1" />
          Volver a la página
        </button>
      </div>
      
      <PageEditor
        pageId={pageId}
        projectId={projectId!}
        parentPageId={page.parent_page_id}
        initialPage={page}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default PageEditPage;