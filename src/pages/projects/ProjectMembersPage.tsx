import { useState, useEffect, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, User, UserX, X, Search, AlertTriangle } from 'lucide-react';
import { projectService, type Role } from '../../services/projectService'; // Import Role type
import { useAuth } from '../../context/AuthContext';
import type { Project, ProjectMember } from '../../types';

const ProjectMembersPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('viewer'); // Change type to string
  const [inviting, setInviting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]); // New state for roles

  useEffect(() => {
    async function fetchData() {
      if (!projectId) return;

      try {
        setLoading(true);

        // Fetch project, members, and roles concurrently
        const [{ data: projectData, error: projectError }, { data: membersData, error: membersError }, { data: rolesData, error: rolesError }] = await Promise.all([
          projectService.getProjectById(projectId),
          projectService.getProjectMembers(projectId),
          projectService.getRoles() // Fetch roles
        ]);

        if (projectError) throw projectError;
        setProject(projectData);

        if (membersError) throw membersError;
        setMembers(membersData || []);

        if (rolesError) throw rolesError;
        setAvailableRoles(rolesData || []); // Set available roles

        // Set default new member role if roles are fetched
        if (rolesData && rolesData.length > 0) {
          setNewMemberRole(rolesData[0].name); // Set to the first role by default
        }

      } catch (err: any) {
        setError('Error al cargar la información: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  const handleAddMember = async () => {
    if (!projectId || !newMemberEmail.trim()) {
      setError('Por favor, ingresa un email para el nuevo miembro.');
      return;
    }

    // TODO: Before adding a member, you'd typically need to find the user's actual `user_id` from their email.
    // This often involves:
    // 1. A Supabase Edge Function to securely query `auth.users` by email (not directly from client-side for security).
    // 2. An invitation system where an email is sent, and the user registers/accepts, linking them.
    // For this example, we'll continue with the simulated `tempUserId` for demonstration,
    // but in a real app, this part is crucial.

    // Simulate looking up a user ID by email for demonstration purposes
    // In a real app, you'd call an API to find the user or create an invitation
    let targetUserId = `simulated-user-id-${Date.now()}`; // Placeholder
    // In a real scenario, you'd likely fetch the user's ID by their email
    // const { data: userFromEmail, error: userLookupError } = await someUserService.getUserByEmail(newMemberEmail);
    // if (userLookupError || !userFromEmail) {
    //   setError('Usuario no encontrado o no registrado.');
    //   return;
    // }
    // targetUserId = userFromEmail.id;


    try {
      setInviting(true);
      setError(null);
      setSuccess(null);

      const { data: newMemberData, error: addMemberError } = await projectService.addProjectMember(
        projectId,
        targetUserId, // Use the actual user ID or a simulated one
        newMemberRole as ProjectMember['permission_level'] // Cast to correct type
      );

      if (addMemberError) throw addMemberError;
      if (!newMemberData) throw new Error('No se pudo añadir el miembro.');

      setMembers((prev) => [...prev, newMemberData]); // Add the fully enriched member data
      setShowAddMember(false);
      setNewMemberEmail('');
      setNewMemberRole(availableRoles[0]?.name || 'viewer'); // Reset to default/first role
      setSuccess('Miembro añadido exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Error al añadir miembro: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, userId: string, newRoleName: string) => {
    if (!projectId) return;

    try {
      setError(null);
      setSuccess(null);

      const { data: updatedMemberData, error: updateError } = await projectService.updateProjectMember(
        projectId,
        userId,
        newRoleName as ProjectMember['permission_level'] // Cast to correct type
      );

      if (updateError) throw updateError;
      if (!updatedMemberData) throw new Error('No se pudo actualizar el rol.');

      setMembers(members.map(member =>
        member.id === updatedMemberData.id
          ? updatedMemberData // Use the full updated member data from the service
          : member
      ));
      setSuccess('Rol actualizado exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Error al actualizar rol: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!projectId) return;

    if (!window.confirm('¿Estás seguro de eliminar este miembro del proyecto?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const { error: removeError } = await projectService.removeProjectMember(
        projectId,
        userId
      );

      if (removeError) throw removeError;

      setMembers(members.filter((member) => member.id !== memberId));
      setSuccess('Miembro eliminado exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Error al eliminar miembro: ' + err.message);
    }
  };

  const filteredMembers =
    searchQuery.trim() === ''
      ? members
      : members.filter(
          (member) =>
            member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.user?.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.user?.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

  if (loading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Cargando miembros...</div>;
  }

  if (!project) {
    return <div className="p-4 text-foreground">Proyecto no encontrado</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Miembros del proyecto</h1>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-success/10 text-success rounded-md flex items-center">
            <User size={20} className="mr-2" />
            {success}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-card-foreground">Miembros</h2>
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
                <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>

              <button
                onClick={() => setShowAddMember(true)}
                className="btn-primary w-full md:w-auto"
              >
                <Plus size={16} className="mr-1.5" />
                Añadir miembro
              </button>
            </div>
          </div>

          {/* Form to add member */}
          {showAddMember && (
            <div className="mb-6 p-4 border border-border-light bg-secondary/20 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-foreground">Añadir nuevo miembro</h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                    setNewMemberRole(availableRoles[0]?.name || 'viewer'); // Reset to default/first role
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
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-muted-foreground">
                    Rol
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="form-input"
                  >
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.name}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('_', ' ')} {/* Capitalize and replace underscore */}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                    setNewMemberRole(availableRoles[0]?.name || 'viewer');
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
                  {inviting ? 'Añadiendo...' : 'Añadir miembro'}
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Usuario</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Email</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Rol</th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No se encontraron miembros
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
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
                                alt={`${member.user.profile.first_name || ''} ${member.user.profile.last_name || ''}`}
                                className="h-full w-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium text-secondary-foreground">
                                {member.user?.profile?.first_name?.charAt(0) || member.user?.email?.charAt(0)?.toUpperCase() || '?'}{/* Fallback to '?' */}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {member.user?.profile?.first_name} {member.user?.profile?.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {member.user?.email}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={member.permission_level}
                          onChange={(e) =>
                            handleUpdateMemberRole(member.id, member.user_id, e.target.value)
                          }
                          className="form-input py-1 text-sm"
                          disabled={member.user_id === user?.id}
                        >
                          {availableRoles.map(role => (
                            <option key={role.id} value={role.name}>
                               {role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10"
                          disabled={member.user_id === user?.id}
                        >
                          <UserX size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMembersPage;