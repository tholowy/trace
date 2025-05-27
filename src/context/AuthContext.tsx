import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { AuthContextType, User, UserProfile } from "../types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial - UNA SOLA VEZ
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        // Fetch profile solo si hay usuario
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        
        // Solo cargar perfil en sign_in o token_refreshed
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // NO usar await aquí - ejecutar en paralelo
          fetchUserProfile(session.user.id);
        }
      } else {
        // SIGNED_OUT o no hay sesión
        setUser(null);
        setUserProfile(null);
      }
      
      // CRÍTICO: setLoading(false) SIEMPRE debe ejecutarse
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función optimizada para obtener perfil
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error al obtener perfil:", error);
        return;
      }

      if (profile) {
        setUserProfile(profile);
      } else {
        // Crear perfil solo si no existe
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert({ id: userId })
          .select()
          .single();

        if (!createError && newProfile) {
          setUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error("Error al obtener/crear perfil:", error);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signup = async (
    email: string,
    password: string,
    userData: {
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      company?: string;
    } = {}
  ) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { data: null, error: authError };

    // Perfil se creará automáticamente en onAuthStateChange
    // Solo agregamos datos extra si el registro fue exitoso
    if (authData?.user?.id && Object.keys(userData).length > 0) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          first_name: userData.firstName || null,
          last_name: userData.lastName || null,
          job_title: userData.jobTitle || null,
          company: userData.company || null,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error actualizando perfil:", profileError);
      }
    }

    return { data: authData, error: null };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    // No necesitamos limpiar estado manualmente - onAuthStateChange lo hará
    return { error };
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) {
      return { data: null, error: new Error("Usuario no autenticado") };
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(profileData)
      .eq("id", user.id)
      .select()
      .single();

    if (!error && data) {
      setUserProfile(data);
    }

    return { data, error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const getUserRoles = async () => {
    if (!user) {
      return { data: null, error: new Error("Usuario no autenticado") };
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        role_id,
        roles (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (error) return { data: null, error };

    const roleData = data
      .map((item) => (Array.isArray(item.roles) ? item.roles[0] : item.roles))
      .filter(Boolean)
      .map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        created_at: role.created_at,
      }));

    return { data: roleData, error: null };
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}