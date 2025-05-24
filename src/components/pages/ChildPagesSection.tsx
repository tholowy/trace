import React, { useState, useEffect, useCallback } from 'react';
import { pageService } from '../../services/pageService'; // Asegúrate de que la ruta sea correcta
import { Link, useNavigate } from 'react-router-dom'; // Para navegar a las subpáginas
import { Plus, ChevronDown, ChevronUp, FileText, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Para obtener el user.id
import type { Page } from '../../types'; // Asume que Page es el tipo para tus páginas

interface ChildPagesSectionProps {
  projectId: string;
  parentPageId: string; // La página actual es el padre de las subpáginas
  onSubpageCreated?: () => void; // Callback opcional si la página padre necesita refrescarse
}

const ChildPagesSection: React.FC<ChildPagesSectionProps> = ({ projectId, parentPageId, onSubpageCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [childPages, setChildPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSubpageTitle, setNewSubpageTitle] = useState('');
  const [creatingSubpage, setCreatingSubpage] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Estado para controlar si la sección está expandida

  // Función para cargar las subpáginas hijas
  const fetchChildPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Usar pageService.getPages para obtener todas las páginas y luego filtrar por parent_page_id
      // O si tienes un servicio más específico para subpáginas, úsalo.
      const { data, error } = await pageService.getPagesByParentId(parentPageId);

      if (error) throw error;
      setChildPages(data || []);
    } catch (err: any) {
      console.error('Error fetching child pages:', err);
      setError('Error al cargar subpáginas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [parentPageId]);

  // Cargar subpáginas al montar o cuando parentPageId cambie
  useEffect(() => {
    if (parentPageId) {
      fetchChildPages();
    }
  }, [parentPageId, fetchChildPages]);

  // Función para crear una nueva subpágina
  const handleCreateSubpage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubpageTitle.trim() || !projectId || !parentPageId || !user) {
      setError('Por favor, ingresa un título y asegúrate de que el proyecto y la página padre existan.');
      return;
    }

    setCreatingSubpage(true);
    setError(null);

    try {
      const { data, error } = await pageService.createPage({
        project_id: projectId,
        parent_page_id: parentPageId, // La página actual es el padre de la nueva subpágina
        title: newSubpageTitle.trim(),
        is_published: false,
        content: null, 
      });

      if (error) throw error;

      if (data) {
        setChildPages((prev) => [...prev, data]);
        setNewSubpageTitle('');
        console.log('Subpágina creada:', data);
        if (onSubpageCreated) {
          onSubpageCreated(); // Notificar al padre si es necesario
        }
        // Navegar a la nueva subpágina (opcional, podrías solo listarla)
        navigate(`/projects/${projectId}/pages/${data.id}/edit`);
      }
    } catch (err: any) {
      console.error('Error creating subpage:', err);
      setError('Error al crear subpágina: ' + err.message);
    } finally {
      setCreatingSubpage(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm mt-6">
      <div
        className="flex items-center justify-between p-4 cursor-pointer border-b border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-foreground">
          Subpáginas
          <span className="ml-2 text-sm text-muted-foreground">({childPages.length})</span>
        </h3>
        <button className="p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md flex items-center">
              <XCircle size={18} className="mr-2" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={20} /> Cargando subpáginas...
            </div>
          ) : childPages.length === 0 ? (
            <p className="text-muted-foreground text-sm mb-4">No hay subpáginas para esta página.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {childPages.map((subpage) => (
                <li key={subpage.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                  <Link
                    to={`/projects/${projectId}/pages/${subpage.id}`} // Enlaza a la vista de la subpágina
                    className="flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium truncate"
                  >
                    <FileText size={16} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{subpage.title}</span>
                  </Link>
                  {/* Podrías añadir botones para editar/eliminar la subpágina aquí si lo deseas */}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCreateSubpage} className="flex items-center space-x-2 mt-4 pt-4 border-t border-border">
            <input
              type="text"
              value={newSubpageTitle}
              onChange={(e) => setNewSubpageTitle(e.target.value)}
              placeholder="Título de la nueva subpágina"
              className="flex-grow px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground text-sm"
              disabled={creatingSubpage}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={creatingSubpage || !newSubpageTitle.trim()}
            >
              {creatingSubpage ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus size={16} className="mr-2" />}
              Crear
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChildPagesSection;