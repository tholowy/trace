import { useState, useEffect, type FC } from "react";
import { useParams } from "react-router-dom";
import { Plus, User, UserX, X, Search, AlertTriangle, Crown, Shield } from "lucide-react";
import { projectService, type Role } from "../../services/projectService";
import { useAuth } from "../../context/AuthContext";
import type { Project, ProjectMember } from "../../types";

const ProjectMembersPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newPermissionId, setNewPermissionId] = useState<number>(3);
  const [inviting, setInviting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [projectPermissions, setProjectPermissions] = useState<
    { id: number; name: string; description?: string }[]
  >([]);
  const [userPermission, setUserPermission] = useState<{
    permission_id: number;
    permission_name: string;
    is_owner: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!projectId) return;

      try {
        setLoading(true);

        const [
          { data: projectData, error: projectError },
          { data: membersData, error: membersError },
          { data: permissionsData, error: permissionsError },
          { data: userPermissionData, error: userPermissionError },
        ] = await Promise.all([
          projectService.getProjectById(projectId),
          projectService.getProjectMembers(projectId),
          projectService.getProjectPermissions(),
          projectService.getUserProjectPermission(projectId),
        ]);

        if (projectError) throw new Error(projectError);
        setProject(projectData);

        if (membersError) throw new Error(membersError);
        setMembers(membersData || []);

        if (permissionsError) throw new Error(permissionsError);
        setProjectPermissions(permissionsData || []);

        // Establecer el permiso por defecto (Lector por defecto)
        if (permissionsData && permissionsData.length > 0) {
          const readerPermission = permissionsData.find(p => p.name === 'Lector');
          setNewPermissionId(readerPermission?.id || permissionsData[permissionsData.length - 1].id);
        }

        // Establecer permisos del usuario actual
        if (!userPermissionError && userPermissionData) {
          setUserPermission(userPermissionData);
        }

      } catch (err: any) {
        setError("Error al cargar la información: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  // Verificar si el usuario puede gestionar miembros (Admin o Owner)
  const canManageMembers = userPermission?.permission_name === 'Admin' || userPermission?.is_owner;

  const handleAddMember = async () => {
    if (!projectId || !newMemberEmail.trim()) {
      setError("Por favor, ingresa un email válido para el nuevo miembro.");
      return;
    }

    if (!canManageMembers) {
      setError("No tienes permisos para agregar miembros a este proyecto.");
      return;
    }

    try {
      setInviting(true);
      setError(null);
      setSuccess(null);

      // Usar la función RPC específica para invitar/agregar miembros
      const { data: result, error: inviteError } = await projectService.inviteOrAddMember(
        projectId,
        newMemberEmail.trim(),
        newPermissionId
      );

      if (inviteError) throw new Error(inviteError);

      // Recargar la lista de miembros para obtener los datos actualizados
      const { data: updatedMembers, error: membersError } = await projectService.getProjectMembers(projectId);
      
      if (membersError) throw new Error(membersError);
      
      setMembers(updatedMembers || []);
      setShowAddMember(false);
      setNewMemberEmail("");
      setNewPermissionId(projectPermissions.find(p => p.name === 'Lector')?.id || projectPermissions[0]?.id || 3);
      setSuccess(result || "Miembro agregado/invitado exitosamente.");
      
      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError("Error al agregar miembro: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    userId: string,
    newPermissionId: number
  ) => {
    if (!projectId || !canManageMembers) {
      setError("No tienes permisos para actualizar roles.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Usar la función RPC específica para actualizar permisos
      const { data: result, error: updateError } = await projectService.updateProjectMember(
        projectId,
        userId,
        newPermissionId
      );

      if (updateError) throw new Error(updateError);

      // Recargar la lista de miembros para obtener los datos actualizados
      const { data: updatedMembers, error: membersError } = await projectService.getProjectMembers(projectId);
      
      if (membersError) throw new Error(membersError);
      
      setMembers(updatedMembers || []);
      setSuccess(result || "Rol actualizado exitosamente.");
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("Error al actualizar rol: " + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string, memberName: string) => {
    if (!projectId || !canManageMembers) {
      setError("No tienes permisos para eliminar miembros.");
      return;
    }

    if (userId === user?.id) {
      setError("No puedes eliminarte a ti mismo del proyecto.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar a ${memberName} del proyecto?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Usar la función RPC específica para eliminar miembros
      const { data: result, error: removeError } = await projectService.removeProjectMember(
        projectId,
        userId
      );

      if (removeError) throw new Error(removeError);

      // Actualizar la lista local eliminando el miembro
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
      setSuccess(result || "Miembro eliminado exitosamente.");
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("Error al eliminar miembro: " + err.message);
    }
  };

  const getPermissionIcon = (permissionName: string, isOwner: boolean) => {
    if (isOwner) return <Crown size={16} className="text-yellow-500" />;
    if (permissionName === 'Admin') return <Shield size={16} className="text-blue-500" />;
    return null;
  };

  const filteredMembers =
    searchQuery.trim() === ""
      ? members
      : members.filter(
          (member) =>
            member.user?.email
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            member.user?.profile?.first_name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            member.user?.profile?.last_name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase())
        );

  if (loading) {
    return (
      <div className="flex justify-center p-8 text-muted-foreground">
        Cargando miembros...
      </div>
    );
  }

  if (!project) {
    return <div className="p-4 text-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Miembros del proyecto
          </h1>
          
          {/* Mostrar permisos del usuario actual */}
          {userPermission && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {getPermissionIcon(userPermission.permission_name, userPermission.is_owner)}
              <span>
                Tu rol: <strong>{userPermission.permission_name}</strong>
                {userPermission.is_owner && " (Propietario)"}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center border border-green-200">
            <User size={20} className="mr-2" />
            {success}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-card-foreground">
                Miembros
              </h2>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                {members.length}
              </span>
            </div>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar miembros..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-8"
                />
                <Search
                  size={16}
                  className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
              </div>

              {canManageMembers && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn-primary w-full md:w-auto"
                >
                  <Plus size={16} className="mr-1.5" />
                  Invitar miembro
                </button>
              )}
            </div>
          </div>

          {/* Form to add member */}
          {showAddMember && canManageMembers && (
            <div className="mb-6 p-4 border border-border-light bg-secondary/20 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-foreground">
                  Invitar nuevo miembro
                </h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail("");
                    setNewPermissionId(projectPermissions.find(p => p.name === 'Lector')?.id || 3);
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-muted-foreground">
                    Email del usuario
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si el usuario no está registrado, se enviará una invitación por email.
                  </p>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-muted-foreground">
                    Rol
                  </label>
                  <select
                    value={newPermissionId}
                    onChange={(e) => setNewPermissionId(parseInt(e.target.value))}
                    className="form-input"
                  >
                    {projectPermissions.map((perm) => (
                      <option key={perm.id} value={perm.id}>
                        {perm.name}
                        {perm.description && ` - ${perm.description}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail("");
                    setNewPermissionId(projectPermissions.find(p => p.name === 'Lector')?.id || 3);
                    setError(null);
                  }}
                  className="btn-secondary mr-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMember}
                  className="btn-primary"
                  disabled={inviting || !newMemberEmail.trim()}
                >
                  {inviting ? "Invitando..." : "Invitar miembro"}
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Usuario
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Rol
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No se encontraron miembros
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const memberDisplayName = `${member.user?.profile?.first_name || ''} ${member.user?.profile?.last_name || ''}`.trim() || 
                                            member.user?.email || 
                                            'Usuario desconocido';
                    
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-border hover:bg-muted/30"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center mr-3 overflow-hidden">
                              {member.user?.profile?.avatar_url ? (
                                <img
                                  src={member.user.profile.avatar_url}
                                  alt={memberDisplayName}
                                  className="h-full w-full object-cover rounded-full"
                                />
                              ) : (
                                <span className="text-sm font-medium text-secondary-foreground">
                                  {member.user?.profile?.first_name?.charAt(0) ||
                                    member.user?.email?.charAt(0)?.toUpperCase() ||
                                    "?"}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-foreground">
                                  {memberDisplayName}
                                </span>
                                {getPermissionIcon(member.permission_name || '', member.is_owner || false)}
                              </div>
                              {member.user?.profile?.job_title && (
                                <div className="text-xs text-muted-foreground">
                                  {member.user.profile.job_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {member.user?.email}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={member.project_permission_id}
                            onChange={(e) =>
                              handleUpdateMemberRole(
                                member.id,
                                member.user_id,
                                parseInt(e.target.value)
                              )
                            }
                            className="form-input py-1 text-sm"
                            disabled={!canManageMembers || member.user_id === user?.id || member.is_owner}
                          >
                            {projectPermissions.map((perm) => (
                              <option key={perm.id} value={perm.id}>
                                {perm.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              handleRemoveMember(member.id, member.user_id, memberDisplayName)
                            }
                            className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10"
                            disabled={!canManageMembers || member.user_id === user?.id || member.is_owner}
                            title={
                              !canManageMembers 
                                ? "No tienes permisos para eliminar miembros"
                                : member.user_id === user?.id
                                ? "No puedes eliminarte a ti mismo"
                                : member.is_owner
                                ? "No se puede eliminar al propietario del proyecto"
                                : "Eliminar miembro"
                            }
                          >
                            <UserX size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!canManageMembers && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200">
              <div className="flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                Solo los administradores y propietarios pueden gestionar miembros del proyecto.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectMembersPage;