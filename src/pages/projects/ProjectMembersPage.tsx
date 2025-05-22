import { useState, useEffect, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, User, UserX, X, Search } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import type { Project, ProjectMember } from '../../types';

const ProjectMembersPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviting, setInviting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    async function fetchData() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        
        // Cargar proyecto
        const { data: projectData, error: projectError } = await projectService.getProjectById(projectId);
        
        if (projectError) throw projectError;
        setProject(projectData);
        
        // Cargar miembros
        const { data: membersData, error: membersError } = await projectService.getProjectMembers(projectId);
        
        if (membersError) throw membersError;
        setMembers(membersData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [projectId]);
  
  const handleAddMember = async () => {
    if (!projectId || !newMemberEmail.trim()) return;
    
    try {
      setInviting(true);
      setError(null);
      
      // TODO: En una implementación completa, aquí debería verificarse si el usuario existe
      // y enviar una invitación si no existe. Para simplificar, asumimos que existe.
      
      // Simulamos un ID de usuario temporal
      const tempUserId = `temp-${Date.now()}`;
      
      const { error } = await projectService.addProjectMember(
        projectId,
        tempUserId,
        newMemberRole
      );
      
      if (error) throw error;
      
      // Simulamos la respuesta
      setMembers([
        ...members,
        {
          id: `temp-member-${Date.now()}`,
          project_id: projectId,
          user_id: tempUserId,
          permission_level: newMemberRole,
          created_at: new Date().toISOString(),
          user: {
            id: tempUserId,
            email: newMemberEmail,
            profile: {
              id: `temp-profile-${Date.now()}`,
              first_name: 'Nuevo',
              last_name: 'Usuario',
              avatar_url: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        }
      ]);
      
      setShowAddMember(false);
      setNewMemberEmail('');
      setNewMemberRole('viewer');
    } catch (err: any) {
      setError('Error al añadir miembro: ' + err.message);
    } finally {
      setInviting(false);
    }
  };
  
  const handleUpdateMemberRole = async (memberId: string, userId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    if (!projectId) return;
    
    try {
      const { error } = await projectService.updateProjectMember(
        projectId,
        userId,
        newRole
      );
      
      if (error) throw error;
      
      // Actualizar estado local
      setMembers(members.map(member => 
        member.id === memberId 
          ? { ...member, permission_level: newRole }
          : member
      ));
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
      const { error } = await projectService.removeProjectMember(
        projectId,
        userId
      );
      
      if (error) throw error;
      
      // Actualizar estado local
      setMembers(members.filter(member => member.id !== memberId));
    } catch (err: any) {
      setError('Error al eliminar miembro: ' + err.message);
    }
  };
  
  // Filtrar miembros por búsqueda
  const filteredMembers = searchQuery.trim() === '' 
    ? members 
    : members.filter(member => 
        member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando miembros...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!project) {
    return <div className="p-4">Proyecto no encontrado</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Miembros del proyecto
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white">
              Miembros
            </h2>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {members.length}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar miembros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 w-64 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
              />
              <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              onClick={() => setShowAddMember(true)}
              className="btn-primary"
            >
              <Plus size={16} className="mr-1.5" />
              Añadir miembro
            </button>
          </div>
        </div>
        
        {/* Formulario para añadir miembro */}
        {showAddMember && (
          <div className="mb-6 p-4 border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-blue-800 dark:text-blue-300">
                Añadir nuevo miembro
              </h3>
              <button 
                onClick={() => setShowAddMember(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="form-select"
                >
                  <option value="viewer">Lector</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAddMember(false)}
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
        
        {/* Lista de miembros */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-400">Usuario</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600 dark:text-gray-400">Rol</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron miembros
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                          {member.user?.profile?.avatar_url ? (
                            <img 
                              src={member.user.profile.avatar_url} 
                              alt={`${member.user.profile.first_name} ${member.user.profile.last_name}`}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <User size={16} className="text-gray-500" />
                          )}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {member.user?.profile?.first_name} {member.user?.profile?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {member.user?.email}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={member.permission_level}
                        onChange={(e) => handleUpdateMemberRole(member.id, member.user_id, e.target.value as any)}
                        className="form-select py-1 text-sm"
                        disabled={member.user_id === user?.id} // No permitir cambiar el propio rol
                      >
                        <option value="viewer">Lector</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        disabled={member.user_id === user?.id} // No permitir eliminar al propio usuario
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
  );
};

export default ProjectMembersPage;