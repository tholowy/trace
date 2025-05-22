import { useState, useEffect, type FormEvent, type FC } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Edit, Save, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserProfile } from '../../types';

const ProfilePage: FC = () => {
  const { user, userProfile, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    job_title: '',
    company: ''
  });
  
  // Cargar datos del perfil
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        job_title: userProfile.job_title || '',
        company: userProfile.company || ''
      });
    }
  }, [userProfile]);
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { error } = await updateProfile(profileData);
      
      if (error) throw error;
      
      setSuccess('Perfil actualizado con éxito');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError('Error al actualizar el perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <div className="max-w-screen-md mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Perfil de usuario
          </h1>
          
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
            <User size={20} className="text-gray-600 dark:text-gray-300" />
          </div>
        </div>
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-md flex items-center">
            <CheckCircle size={18} className="mr-2" />
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md flex items-center">
            <AlertCircle size={18} className="mr-2" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Información básica */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center">
              <Edit size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
              Información personal
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={profileData.first_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div>
                <label htmlFor="last_name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apellido
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={profileData.last_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>
          
          {/* Información profesional */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center">
              <Edit size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
              Información profesional
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="job_title" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cargo
                </label>
                <input
                  id="job_title"
                  name="job_title"
                  type="text"
                  value={profileData.job_title}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Empresa
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={profileData.company}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>
          
          {/* Correo electrónico (no editable) */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center">
              <Edit size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
              Cuenta
            </h2>
            
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                className="form-input bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                disabled
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={loading}
            >
              <Save size={18} className="mr-2" />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;