import { useState, useEffect, type FC } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  GitBranch,
  Clock,
  CheckCircle,
  Archive,
  Eye,
  Edit,
  RotateCcw,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { versionService } from '../../services/versionService';
import PageTree from '../../components/projects/PageTree'; // Asegúrate de que este componente también use la nueva paleta
import type { ProjectVersion, PageVersion, VersionStats } from '../../types';

const VersionDetailsPage: FC = () => {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>();
  const navigate = useNavigate();

  const [version, setVersion] = useState<ProjectVersion | null>(null);
  const [versionPages, setVersionPages] = useState<PageVersion[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<boolean>(false);

  // Cargar datos de la versión
  useEffect(() => {
    async function loadVersionDetails() {
      if (!versionId) return;

      try {
        setLoading(true);
        setError(null);

        // Cargar información de la versión
        const { data: versionData, error: versionError } = await versionService.getVersionById(versionId);
        if (versionError) throw versionError;
        setVersion(versionData);

        // Cargar páginas de la versión
        const { data: pagesData, error: pagesError } = await versionService.getVersionPages(versionId);
        if (pagesError) throw pagesError;
        setVersionPages(pagesData || []);

        // Cargar estadísticas
        const { data: statsData, error: statsError } = await versionService.getVersionStats(versionId);
        if (statsError) throw statsError;
        setStats(statsData);

      } catch (err: any) {
        setError('Error al cargar detalles de la versión: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVersionDetails();
  }, [versionId]);

  // Restaurar proyecto a esta versión
  const handleRestoreToVersion = async () => {
    if (!versionId || !version) return;

    const confirmMessage = `¿Estás seguro de restaurar el proyecto a la versión ${version.version_number}? Esto sobrescribirá el contenido actual de todas las páginas.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setRestoring(true);

      const { data, error } = await versionService.restoreToVersion(versionId);

      if (error) throw error;

      alert(`Se restauraron ${data?.restored_pages_count || 0} páginas correctamente.`);

      // Navegar de vuelta a la vista del proyecto
      navigate(`/projects/${projectId}`);

    } catch (err: any) {
      setError('Error al restaurar la versión: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  // Obtener badge de estado
  const getStatusBadge = (version: ProjectVersion) => {
    if (version.is_current) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-success/10 text-success-foreground">
          <CheckCircle size={14} className="mr-1" />
          Versión actual
        </span>
      );
    }

    if (version.is_draft) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-info/10 text-info-foreground">
          <Edit size={14} className="mr-1" />
          Borrador
        </span>
      );
    }

    if (version.is_archived) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
          <Archive size={14} className="mr-1" />
          Archivada
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-warning/10 text-warning-foreground">
        <Clock size={14} className="mr-1" />
        Publicada
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando detalles de la versión...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-lg">
        {error}
      </div>
    );
  }

  if (!version) {
    return <div className="p-4 text-muted-foreground">Versión no encontrada</div>;
  }

  return (
    <div className="p-6 bg-background text-foreground">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/versions`)}
          className="flex items-center text-link hover:text-link-hover mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a versiones
        </button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold">
                Versión {version.version_number}
              </h1>
              {getStatusBadge(version)}
            </div>

            {version.version_name && (
              <h2 className="text-lg text-muted-foreground mb-2">
                {version.version_name}
              </h2>
            )}

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar size={16} className="mr-1" />
                <span>Creada el {format(new Date(version.created_at), 'dd MMMM💒', { locale: es })}</span>
              </div>

              {version.published_at && (
                <div className="flex items-center">
                  <CheckCircle size={16} className="mr-1" />
                  <span>Publicada el {format(new Date(version.published_at), 'dd MMMM💒', { locale: es })}</span>
                </div>
              )}

              {version.created_by_user?.user_profiles?.[0] && (
                <div className="flex items-center">
                  <User size={16} className="mr-1" />
                  <span>
                    Por {version.created_by_user.user_profiles[0].first_name} {version.created_by_user.user_profiles[0].last_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Botón de comparar */}
            <Link
              to={`/projects/${projectId}/versions/${versionId}/compare`}
              className="btn-secondary flex items-center"
            >
              <GitBranch size={16} className="mr-2" />
              Comparar
            </Link>

            {/* Botón de vista previa */}
            <button
              onClick={() => {
                // Implementar vista previa de la versión
                console.log('Vista previa de versión');
              }}
              className="btn-secondary flex items-center"
            >
              <Eye size={16} className="mr-2" />
              Vista previa
            </button>

            {/* Botón de restaurar */}
            {!version.is_current && (
              <button
                onClick={handleRestoreToVersion}
                disabled={restoring}
                className="btn-primary flex items-center"
              >
                <RotateCcw size={16} className="mr-2" />
                {restoring ? 'Restaurando...' : 'Restaurar a esta versión'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notas de la versión */}
      {version.release_notes && (
        <div className="mb-6 bg-card rounded-lg shadow-sm p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Notas de la versión
          </h3>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap">
              {version.release_notes}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estadísticas */}
        {stats && (
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <BarChart3 size={20} className="mr-2 text-primary" />
                Estadísticas
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de páginas</span>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.pages_count}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Páginas publicadas</span>
                  <span className="text-2xl font-bold text-success">
                    {stats.published_pages_count}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de vistas</span>
                  <span className="text-2xl font-bold text-info">
                    {stats.total_views}
                  </span>
                </div>

                {stats.publish_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fecha de publicación</span>
                    <span className="text-sm text-foreground">
                      {format(new Date(stats.publish_date), 'dd MMM💒', { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de páginas de la versión */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <FileText size={20} className="mr-2 text-primary" />
              Contenido de la versión ({versionPages.length} páginas)
            </h3>

            {versionPages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Esta versión no contiene páginas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versionPages.map((pageVersion) => (
                  <div
                    key={pageVersion.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText size={16} className="text-muted-foreground" />
                      <div>
                        <h4 className="font-medium text-foreground">
                          {pageVersion.title_snapshot}
                        </h4>
                        {pageVersion.description_snapshot && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {pageVersion.description_snapshot}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Implementar vista previa de página en versión
                          console.log('Ver página en versión:', pageVersion);
                        }}
                        className="text-link hover:text-link-hover"
                        title="Ver página en esta versión"
                      >
                        <Eye size={16} />
                      </button>

                      <Link
                        to={`/projects/${projectId}/pages/${pageVersion.page_id}`}
                        className="text-muted-foreground hover:text-foreground"
                        title="Ver página actual"
                      >
                        <Edit size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de comparación rápida */}
      <div className="mt-6 bg-card rounded-lg shadow-sm p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Comparación rápida
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to={`/projects/${projectId}/versions/${versionId}/compare`}
            className="p-4 border border-border rounded-lg hover:bg-accent/50 hover:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <GitBranch size={20} className="text-primary" />
              <div>
                <h4 className="font-medium text-foreground">
                  Comparar con otra versión
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ver diferencias entre versiones
                </p>
              </div>
            </div>
          </Link>

          <button
            onClick={() => {
              // Implementar diff con versión actual
              console.log('Comparar con versión actual');
            }}
            className="p-4 border border-border rounded-lg hover:bg-accent/50 hover:border-primary transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle size={20} className="text-success" />
              <div>
                <h4 className="font-medium text-foreground">
                  Comparar con versión actual
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ver qué ha cambiado desde esta versión
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionDetailsPage;