import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Archive,
  Eye,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  X
} from 'lucide-react'; // Agregamos 'X' para el botón de cerrar en el modal
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { versionService } from '../../services/versionService';
import type { ProjectVersion, CreateVersionOptions } from '../../types';

const VersionsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [actioningVersion, setActioningVersion] = useState<string | null>(null);

  // Cargar versiones
  useEffect(() => {
    async function loadVersions() {
      if (!projectId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await versionService.getProjectVersions(projectId, true);

        if (error) throw error;

        setVersions(data || []);
      } catch (err: any) {
        setError('Error al cargar versiones: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, [projectId]);

  // Crear nueva versión
  const handleCreateVersion = async (options: CreateVersionOptions) => {
    if (!projectId) return;

    try {
      setActioningVersion('creating');

      const { data, error } = await versionService.createVersion(projectId, options);

      if (error) throw error;

      // Recargar versiones
      const { data: updatedVersions } = await versionService.getProjectVersions(projectId, true);
      setVersions(updatedVersions || []);

      setShowCreateModal(false);
    } catch (err: any) {
      setError('Error al crear versión: ' + err.message);
    } finally {
      setActioningVersion(null);
    }
  };

  // Publicar versión
  const handlePublishVersion = async (versionId: string) => {
    try {
      setActioningVersion(versionId);

      const { error } = await versionService.publishVersion(versionId);

      if (error) throw error;

      // Actualizar versiones
      const { data: updatedVersions } = await versionService.getProjectVersions(projectId!, true);
      setVersions(updatedVersions || []);
    } catch (err: any) {
      setError('Error al publicar versión: ' + err.message);
    } finally {
      setActioningVersion(null);
    }
  };

  // Archivar versión
  const handleArchiveVersion = async (versionId: string) => {
    if (!window.confirm('¿Estás seguro de archivar esta versión?')) return;

    try {
      setActioningVersion(versionId);

      const { error } = await versionService.archiveVersion(versionId);

      if (error) throw error;

      // Actualizar versiones
      const { data: updatedVersions } = await versionService.getProjectVersions(projectId!, true);
      setVersions(updatedVersions || []);
    } catch (err: any) {
      setError('Error al archivar versión: ' + err.message);
    } finally {
      setActioningVersion(null);
    }
  };

  // Eliminar versión (solo drafts)
  const handleDeleteVersion = async (versionId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta versión? Esta acción no se puede deshacer.')) return;

    try {
      setActioningVersion(versionId);

      const { error } = await versionService.deleteVersion(versionId);

      if (error) throw error;

      // Actualizar versiones
      const { data: updatedVersions } = await versionService.getProjectVersions(projectId!, true);
      setVersions(updatedVersions || []);
    } catch (err: any) {
      setError('Error al eliminar versión: ' + err.message);
    } finally {
      setActioningVersion(null);
    }
  };

  // Obtener indicador de estado de versión
  const getVersionStatusBadge = (version: ProjectVersion) => {
    if (version.is_current) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success/10 text-success-foreground">
          <CheckCircle size={12} className="mr-1" />
          Actual
        </span>
      );
    }

    if (version.is_draft) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
          <Edit size={12} className="mr-1" />
          Borrador
        </span>
      );
    }

    if (version.is_archived) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
          <Archive size={12} className="mr-1" />
          Archivada
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent text-accent-foreground">
        <Clock size={12} className="mr-1" />
        Publicada
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando versiones...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Versiones del proyecto
        </h1>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
          disabled={actioningVersion === 'creating'}
        >
          <Plus size={16} className="mr-2" />
          {actioningVersion === 'creating' ? 'Creando...' : 'Nueva versión'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive-foreground border border-destructive/20 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-border">
        {versions.length === 0 ? (
          <div className="p-8 text-center">
            <GitBranch size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No hay versiones
            </h3>
            <p className="text-muted-foreground mb-4">
              Crea la primera versión para comenzar el control de versiones
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Crear primera versión
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Versión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Notas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-accent/30 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {version.version_number}
                        </div>
                        {version.version_name && (
                          <div className="text-sm text-muted-foreground">
                            {version.version_name}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVersionStatusBadge(version)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {format(new Date(version.created_at), 'dd MMMM yyyy', { locale: es })}
                      </div>
                      {version.published_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Publicada: {format(new Date(version.published_at), 'dd MMMM yyyy', { locale: es })}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs truncate">
                        {version.release_notes || 'Sin notas de versión'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/projects/${projectId}/versions/${version.id}`}
                          className="text-link hover:text-link-hover"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </Link>

                        {!version.is_current && version.is_draft && (
                          <button
                            onClick={() => handlePublishVersion(version.id)}
                            disabled={actioningVersion === version.id}
                            className="text-success hover:text-success-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Publicar versión"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        {!version.is_current && !version.is_archived && (
                          <button
                            onClick={() => handleArchiveVersion(version.id)}
                            disabled={actioningVersion === version.id}
                            className="text-warning hover:text-warning-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Archivar versión"
                          >
                            <Archive size={16} />
                          </button>
                        )}

                        {version.is_draft && !version.is_current && (
                          <button
                            onClick={() => handleDeleteVersion(version.id)}
                            disabled={actioningVersion === version.id}
                            className="text-destructive hover:text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar borrador"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <VersionActionsMenu
                          version={version}
                          projectId={projectId!}
                          onCompare={(v1, v2) => {
                            // Implementar navegación a comparación
                            console.log('Comparar versiones:', v1, v2);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de crear versión */}
      {showCreateModal && (
        <CreateVersionModal
          isOpen={showCreateModal}
          projectId={projectId!}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateVersion}
        />
      )}
    </div>
  );
};

// Menú de acciones para versiones
interface VersionActionsMenuProps {
  version: ProjectVersion;
  projectId: string;
  onCompare: (version1: ProjectVersion, version2: ProjectVersion) => void;
}

const VersionActionsMenu: FC<VersionActionsMenuProps> = ({ version, projectId, onCompare }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && event.target && !(event.target as HTMLElement).closest('.version-actions-menu')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative version-actions-menu"> {/* Agregamos una clase para identificar el menú */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn-ghost p-2"
        title="Más acciones"
      >
        <MoreHorizontal size={16} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
          <div className="py-1">
            <Link
              to={`/projects/${projectId}/versions/${version.id}`}
              className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Ver detalles
            </Link>

            <button
              onClick={() => {
                onCompare(version, version); // Placeholder para la comparación
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Comparar con otra
            </button>

            {!version.is_current && (
              <button
                onClick={() => {
                  // Implementar restaurar
                  console.log('Restaurar versión:', version);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Restaurar a esta versión
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Modal para crear nueva versión
interface CreateVersionModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onCreate: (options: CreateVersionOptions) => void;
}

const CreateVersionModal: FC<CreateVersionModalProps> = ({ isOpen, projectId, onClose, onCreate }) => {
  const [versionNumber, setVersionNumber] = useState('');
  const [versionName, setVersionName] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [suggestedVersion, setSuggestedVersion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission loading
  const [formError, setFormError] = useState<string | null>(null); // New state for form-specific errors

  // Cargar sugerencia de versión
  useEffect(() => {
    async function loadSuggestion() {
      // Reset form states when modal opens
      setVersionNumber('');
      setVersionName('');
      setReleaseNotes('');
      setSuggestedVersion('');
      setFormError(null);

      const { data } = await versionService.suggestNextVersion(projectId, 'minor');
      if (data) {
        setSuggestedVersion(data);
        setVersionNumber(data); // Pre-fill with suggestion
      }
    }

    if (isOpen) {
      loadSuggestion();
    }
  }, [isOpen, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous errors

    if (!versionNumber.trim()) {
      setFormError('El número de versión es obligatorio.');
      return;
    }

    setIsSubmitting(true); // Start loading state

    try {
      await onCreate({
        version_number: versionNumber.trim(),
        version_name: versionName.trim() || undefined,
        release_notes: releaseNotes.trim() || undefined
      });
      // No need to reset form here, useEffect handles it on re-open or successful close
      onClose(); // Close modal on success
    } catch (err: any) {
      setFormError('Error al crear la versión: ' + (err.message || 'Error desconocido.'));
    } finally {
      setIsSubmitting(false); // End loading state
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose} // Close modal when clicking outside
    >
      <div
        className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-border"> {/* Added border-b for separation */}
          <h3 className="text-xl font-bold text-foreground"> {/* Larger, bolder title */}
            Crear nueva versión
          </h3>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded-md transition-colors hover:bg-muted" // Added hover effect
            title="Cerrar"
          >
            <X size={20} className="text-muted-foreground" /> {/* Icon color */}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 py-4"> {/* Increased spacing */}
          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive-foreground border border-destructive/20 rounded-md text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" /> {/* Added error icon */}
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="version-number" className="block text-sm font-medium text-foreground mb-1">
              Número de versión <span className="text-destructive">*</span> {/* Added required indicator */}
            </label>
            <input
              type="text"
              id="version-number" // Added ID for accessibility
              value={versionNumber}
              onChange={(e) => setVersionNumber(e.target.value)}
              className="form-input"
              placeholder="Ej: 1.0.0, 2.1.3" // More descriptive placeholder
              required
            />
            {suggestedVersion && (
              <p className="text-xs text-muted-foreground mt-1">
                Sugerencia: <span className="font-semibold">{suggestedVersion}</span> (automático)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="version-name" className="block text-sm font-medium text-foreground mb-1">
              Nombre de la versión <span className="text-muted-foreground">(Opcional)</span> {/* Explicitly optional */}
            </label>
            <input
              type="text"
              id="version-name" // Added ID for accessibility
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="form-input"
              placeholder="Ej: Lanzamiento Inicial, Actualización de Seguridad"
            />
          </div>

          <div>
            <label htmlFor="release-notes" className="block text-sm font-medium text-foreground mb-1">
              Notas de la versión <span className="text-muted-foreground">(Opcional)</span>
            </label>
            <textarea
              id="release-notes" // Added ID for accessibility
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="form-input resize-y min-h-[80px]" // Min height for textarea
              placeholder="Describe los cambios y nuevas funcionalidades de esta versión..."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-border"> {/* Increased padding, added top border */}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting} // Disable during submission
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting} // Disable during submission
            >
              {isSubmitting ? 'Creando...' : 'Crear versión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VersionsPage;