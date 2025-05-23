import { useState, useEffect, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Palette, 
  Layout, 
  Globe, 
  Code, 
  Upload,
  Save,
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { supabase } from '../../lib/supabase';
import type { PublicSite, NavigationConfig } from '../../types';

const SiteSettingsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [publicSite, setPublicSite] = useState<PublicSite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Configuración de tema
  const [primaryColor, setPrimaryColor] = useState<string>('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState<string>('#6B7280');
  const [customCss, setCustomCss] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Configuración de navegación
  const [navigationStyle, setNavigationStyle] = useState<'sidebar' | 'top' | 'both'>('sidebar');
  const [showSearch, setShowSearch] = useState<boolean>(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(true);
  const [footerText, setFooterText] = useState<string>('');
  
  // Configuración de dominio
  const [customDomain, setCustomDomain] = useState<string>('');
  const [domainStatus, setDomainStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);
  
  // Cargar configuración actual
  useEffect(() => {
    async function loadSiteSettings() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await publicationService.getPublicSite(projectId);
        
        if (error) throw error;
        
        if (data) {
          setPublicSite(data);
          setPrimaryColor(data.primary_color || '#3B82F6');
          setSecondaryColor(data.secondary_color || '#6B7280');
          setCustomCss(data.custom_css || '');
          setLogoPreview(data.logo_url || null);
          setNavigationStyle(data.navigation_style);
          setShowSearch(data.show_search);
          setShowBreadcrumbs(data.show_breadcrumbs);
          setFooterText(data.footer_text || '');
          setCustomDomain(data.custom_domain || '');
        }
        
      } catch (err: any) {
        setError('Error al cargar configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadSiteSettings();
  }, [projectId]);
  
  // Subir logo
  const handleLogoUpload = async (): Promise<string | null> => {
    if (!logoFile) return logoPreview;
    
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `site-logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, logoFile);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (err) {
      throw new Error('Error al subir el logo: ' + err);
    }
  };
  
  // Guardar configuración de tema
  const handleSaveTheme = async () => {
    if (!projectId) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Subir logo si hay uno nuevo
      const logoUrl = await handleLogoUpload();
      
      const { error } = await publicationService.updateSiteTheme(projectId, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        custom_css: customCss
      });
      
      if (error) throw error;
      
      // Actualizar logo si cambió
      if (logoUrl !== logoPreview) {
        await publicationService.createOrUpdatePublicSite(projectId, {
          logo_url: logoUrl || undefined
        });
        setLogoPreview(logoUrl);
      }
      
      setSuccess('Configuración de tema guardada correctamente');
      
    } catch (err: any) {
      setError('Error al guardar tema: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Guardar configuración de navegación
  const handleSaveNavigation = async () => {
    if (!projectId) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const config: Partial<NavigationConfig> = {
        style: navigationStyle,
        show_search: showSearch,
        show_breadcrumbs: showBreadcrumbs
      };
      
      const { error } = await publicationService.updateNavigationConfig(projectId, config);
      
      if (error) throw error;
      
      // Actualizar footer text
      await publicationService.createOrUpdatePublicSite(projectId, {
        footer_text: footerText
      });
      
      setSuccess('Configuración de navegación guardada correctamente');
      
    } catch (err: any) {
      setError('Error al guardar navegación: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Configurar dominio personalizado
  const handleSetupCustomDomain = async () => {
    if (!projectId || !customDomain.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const { data, error } = await publicationService.setupCustomDomain(projectId, customDomain.trim());
      
      if (error) throw error;
      
      setDomainStatus(data!.status);
      setSuccess(`Dominio configurado. Añade este registro DNS: ${data!.verification_record}`);
      
    } catch (err: any) {
      setError('Error al configurar dominio: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Manejar cambio de archivo de logo
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  
  // Generar vista previa
  const handlePreview = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await publicationService.generateSitePreview(projectId);
      
      if (error) throw error;
      
      window.open(data!.preview_url, '_blank');
      
    } catch (err: any) {
      setError('Error al generar vista previa: ' + err.message);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando configuración del sitio...</div>;
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Configuración del sitio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza la apariencia y comportamiento de tu sitio público
          </p>
        </div>
        
        <button
          onClick={handlePreview}
          className="btn-secondary flex items-center"
        >
          <Eye size={16} className="mr-2" />
          Vista previa
        </button>
      </div>
      
      {/* Mensajes de estado */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg flex items-center">
          <CheckCircle size={20} className="mr-2" />
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración de tema */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <Palette size={20} className="mr-2" />
              Tema y colores
            </h2>
            
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo del sitio
                </label>
                <div className="flex items-start space-x-4">
                  <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Upload size={24} className="text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      Seleccionar imagen
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Formato recomendado: PNG o SVG. Tamaño máximo 2MB.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Colores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color primario
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-16 rounded-md border border-gray-300 dark:border-gray-600"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color secundario
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-16 rounded-md border border-gray-300 dark:border-gray-600"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              
              {/* CSS personalizado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CSS personalizado
                </label>
                <textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="/* Tu CSS personalizado aquí */"
                  rows={6}
                />
              </div>
              
              <button
                onClick={handleSaveTheme}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Guardando...' : 'Guardar tema'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Configuración de navegación */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <Layout size={20} className="mr-2" />
              Navegación y layout
            </h2>
            
            <div className="space-y-4">
              {/* Estilo de navegación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estilo de navegación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNavigationStyle('sidebar')}
                    className={`p-3 border rounded-lg text-sm text-center ${
                      navigationStyle === 'sidebar'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Barra lateral
                  </button>
                  <button
                    onClick={() => setNavigationStyle('top')}
                    className={`p-3 border rounded-lg text-sm text-center ${
                      navigationStyle === 'top'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Superior
                  </button>
                  <button
                    onClick={() => setNavigationStyle('both')}
                    className={`p-3 border rounded-lg text-sm text-center ${
                      navigationStyle === 'both'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>
              
              {/* Opciones de navegación */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="showSearch"
                    type="checkbox"
                    checked={showSearch}
                    onChange={(e) => setShowSearch(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="showSearch" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Mostrar buscador
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="showBreadcrumbs"
                    type="checkbox"
                    checked={showBreadcrumbs}
                    onChange={(e) => setShowBreadcrumbs(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="showBreadcrumbs" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Mostrar breadcrumbs
                  </label>
                </div>
              </div>
              
              {/* Texto del footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Texto del pie de página
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="© 2024 Mi empresa. Todos los derechos reservados."
                />
              </div>
              
              <button
                onClick={handleSaveNavigation}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Guardando...' : 'Guardar navegación'}
              </button>
            </div>
          </div>
          
          {/* Dominio personalizado */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <Globe size={20} className="mr-2" />
              Dominio personalizado
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dominio
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="docs.miempresa.com"
                  />
                  <button
                    onClick={handleSetupCustomDomain}
                    disabled={saving || !customDomain.trim()}
                    className="btn-primary"
                  >
                    Configurar
                  </button>
                </div>
              </div>
              
              {domainStatus && (
                <div className={`p-3 rounded-lg text-sm ${
                  domainStatus === 'verified'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : domainStatus === 'failed'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                }`}>
                  {domainStatus === 'verified' && 'Dominio verificado correctamente'}
                  {domainStatus === 'pending' && 'Dominio pendiente de verificación'}
                  {domainStatus === 'failed' && 'Error al verificar el dominio'}
                </div>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-2">Para usar un dominio personalizado:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Ingresa tu dominio y haz clic en "Configurar"</li>
                  <li>Añade el registro DNS que se muestre</li>
                  <li>Espera a que se verifique (puede tomar hasta 24 horas)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección de CSS personalizado extendido */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <Code size={20} className="mr-2" />
          Personalización avanzada
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">
              Variables CSS disponibles
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-4 text-sm font-mono">
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>--primary-color: {primaryColor}</div>
                <div>--secondary-color: {secondaryColor}</div>
                <div>--sidebar-width: 280px</div>
                <div>--content-max-width: 1200px</div>
                <div>--border-radius: 8px</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">
              Clases CSS disponibles
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-4 text-sm font-mono">
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>.site-header</div>
                <div>.site-navigation</div>
                <div>.site-content</div>
                <div>.page-title</div>
                <div>.page-content</div>
                <div>.site-footer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsPage;