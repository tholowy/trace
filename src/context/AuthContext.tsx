import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthContextType, User, UserProfile, Role } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // Verificar si hay datos de sesión en localStorage para evitar el parpadeo
    useEffect(() => {
        // Función para verificar si hay una sesión en localStorage sin usar getSession
        const checkLocalStorageAuth = () => {
            try {
                // Usar localStorage directamente para comprobar si hay una sesión
                //@ts-ignore
                const hasSession = localStorage.getItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
                
                // Si no hay una sesión almacenada, podemos establecer loading = false de inmediato
                if (!hasSession) {
                    console.log('No hay sesión en localStorage, estableciendo loading = false');
                    setLoading(false);
                }
                
                // Marcar como inicializado para que se pueda ejecutar el segundo efecto
                setIsInitialized(true);
            } catch (error) {
                console.error('Error al comprobar localStorage:', error);
                setIsInitialized(true);
                setLoading(false);
            }
        };
        
        checkLocalStorageAuth();
    }, []);

    // Este efecto se ejecutará después de la comprobación inicial de localStorage
    useEffect(() => {
        if (!isInitialized) return;
        
        let isSubscribed = true;
        
        // Verificar si hay sesión activa a través de eventos en lugar de getSession
        console.log('Configurando listener de autenticación...');
        
        // Establecer listener para cambios en la autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Evento de autenticación:', event, session?.user?.email);
                
                if (!isSubscribed) return;
                
                if (session?.user) {
                    console.log('Usuario autenticado mediante evento:', session.user.email);
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                    });
                    
                    try {
                        await fetchUserProfile(session.user.id);
                    } catch (error) {
                        console.error('Error al obtener perfil en evento de autenticación:', error);
                    } finally {
                        setLoading(false);
                    }
                } else {
                    console.log('No hay usuario (evento)');
                    setUser(null);
                    setUserProfile(null);
                    setLoading(false);
                }
            }
        );

        // Configurar un timeout de seguridad para asegurar que loading no se quede en true
        const timeoutId = setTimeout(() => {
            if (isSubscribed && loading) {
                console.log('Timeout de seguridad alcanzado, forzando loading = false');
                setLoading(false);
                
                // Opcional: intentar recuperar la sesión de forma manual si lo necesitas
                // Esto es solo un respaldo por si acaso
                try {
                    //@ts-ignore
                    const storedSession = localStorage.getItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
                    if (storedSession) {
                        try {
                            const sessionData = JSON.parse(storedSession);
                            if (sessionData?.user) {
                                console.log('Recuperando sesión manualmente de localStorage');
                                setUser({
                                    id: sessionData.user.id,
                                    email: sessionData.user.email || '',
                                });
                                fetchUserProfile(sessionData.user.id).catch(console.error);
                            }
                        } catch (e) {
                            console.error('Error al parsear sesión de localStorage:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error al acceder a localStorage:', e);
                }
            }
        }, 3000); // 3 segundos debería ser suficiente

        return () => {
            isSubscribed = false;
            clearTimeout(timeoutId);
            subscription?.unsubscribe();
        };
    }, [isInitialized, loading]);

    // Función para recuperar perfil de usuario
    const fetchUserProfile = async (userId: string) => {
        try {
            console.log('Obteniendo perfil de usuario:', userId);
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error al obtener perfil:', error);
                setUserProfile(null);
                return;
            }

            if (profile) {
                console.log('Perfil encontrado:', profile);
                setUserProfile(profile);
            } else {
                console.log('Creando nuevo perfil para usuario:', userId);
                try {
                    const { data: newProfile, error: createError } = await supabase
                        .from('user_profiles')
                        .insert({ id: userId })
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error al crear perfil:', createError);
                        setUserProfile(null);
                        return;
                    }
                    
                    if (newProfile) {
                        console.log('Nuevo perfil creado:', newProfile);
                        setUserProfile(newProfile);
                    }
                } catch (createError) {
                    console.error('Excepción al crear perfil:', createError);
                    setUserProfile(null);
                }
            }
        } catch (error) {
            console.error('Excepción al obtener perfil:', error);
            setUserProfile(null);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signup = async (email: string, password: string, userData: {
        firstName?: string;
        lastName?: string;
        jobTitle?: string;
        company?: string;
    } = {}) => {
        try {
            // Registrar usuario
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // Si el registro fue exitoso y tenemos un ID de usuario,
            // actualizamos el perfil con los datos adicionales
            if (authData?.user?.id) {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: authData.user.id,
                        first_name: userData.firstName || null,
                        last_name: userData.lastName || null,
                        job_title: userData.jobTitle || null,
                        company: userData.company || null,
                    });

                if (profileError) throw profileError;
            }

            return { data: authData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Limpiar el estado inmediatamente después de cerrar sesión
            setUser(null);
            setUserProfile(null);
            
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const updateProfile = async (profileData: Partial<UserProfile>) => {
        if (!user) {
            return { data: null, error: new Error('Usuario no autenticado') };
        }

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update(profileData)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            setUserProfile(data);
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const updatePassword = async (password: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const getUserRoles = async () => {
        if (!user) {
            return { data: null, error: new Error('Usuario no autenticado') };
        }

        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select(`
          role_id,
          roles (
            id,
            name,
            description,
            created_at
          )
        `)
                .eq('user_id', user.id);

            if (error) throw error;

            const roleData: Role[] = data.map(item => (
                Array.isArray(item.roles) ? item.roles[0] : item.roles
            )).map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                created_at: item.created_at,
            }));

            return { data: roleData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    // Función para forzar una recarga de la sesión - útil como respaldo
    const refreshSession = async () => {
        try {
            // Primero intentamos cerrar y luego volver a iniciar sesión
            await supabase.auth.refreshSession();
            
            // Intentamos obtener la sesión actual usando getSession, pero con un timeout
            const sessionPromise = supabase.auth.getSession();
            
            // Establecemos un timeout para evitar que se quede bloqueado
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout al refrescar sesión')), 3000)
            );
            
            // Usamos Promise.race para tomar lo que responda primero
            const { data } = await Promise.race([
                sessionPromise,
                timeoutPromise
            ]) as any;
            
            if (data?.session?.user) {
                setUser({
                    id: data.session.user.id,
                    email: data.session.user.email || '',
                });
                await fetchUserProfile(data.session.user.id);
            }
            
            return { success: true, error: null };
        } catch (error) {
            console.error('Error al refrescar sesión:', error);
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        userProfile,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        resetPassword,
        updatePassword,
        getUserRoles,
        refreshSession
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}