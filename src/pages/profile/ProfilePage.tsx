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

  // Load profile data when userProfile changes
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

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await updateProfile(profileData);

      if (updateError) throw updateError;

      setSuccess('Perfil actualizado con éxito');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError('Error al actualizar el perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-background text-foreground flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-screen-md bg-card rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4">
          <h1 className="text-3xl font-extrabold text-primary-foreground mb-4 sm:mb-0">
            Perfil de usuario
          </h1>
          <div className="p-3 rounded-full bg-primary/10 text-primary-foreground">
            <User size={24} />
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg flex items-center shadow-md">
            <CheckCircle size={20} className="mr-3" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex items-center shadow-md">
            <AlertCircle size={20} className="mr-3" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div>
            <h2 className="text-xl font-semibold text-primary-foreground mb-5 flex items-center">
              <Edit size={20} className="mr-3 text-primary" />
              Información personal
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Nombre
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={profileData.first_name}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background-light text-foreground-light placeholder:text-muted"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Apellido
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={profileData.last_name}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background-light text-foreground-light placeholder:text-muted"
                  placeholder="Tu apellido"
                />
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div>
            <h2 className="text-xl font-semibold text-primary-foreground mb-5 flex items-center">
              <Edit size={20} className="mr-3 text-primary" />
              Información profesional
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="job_title" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Cargo
                </label>
                <input
                  id="job_title"
                  name="job_title"
                  type="text"
                  value={profileData.job_title}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background-light text-foreground-light placeholder:text-muted"
                  placeholder="Tu cargo"
                />
              </div>

              <div>
                <label htmlFor="company" className="block mb-2 text-sm font-medium text-muted-foreground">
                  Empresa
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={profileData.company}
                  onChange={handleChange}
                  className="form-input w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background-light text-foreground-light placeholder:text-muted"
                  placeholder="Tu empresa"
                />
              </div>
            </div>
          </div>

          {/* Email (Non-editable) Section */}
          <div>
            <h2 className="text-xl font-semibold text-primary-foreground mb-5 flex items-center">
              <Edit size={20} className="mr-3 text-primary" />
              Cuenta
            </h2>

            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-muted-foreground">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                className="form-input w-full px-4 py-2 border border-input rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-muted-foreground"
                disabled
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="btn-primary flex items-center px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <Save size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
