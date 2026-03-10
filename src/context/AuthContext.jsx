import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

const PHONE_DOMAIN = "@app.interes.local";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    };

    loadSessionAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }

        // Evento de recuperación detectado (redirigimos desde la pantalla que lo necesite)
        if (event === "PASSWORD_RECOVERY") {
          console.log("PASSWORD_RECOVERY detectado");
        }

        setLoading(false);
      },
    );

    return () => listener?.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    } else if (error) {
      console.error("Error cargando perfil:", error.message);
    }
  };

  const normalizePhone = (phone) => {
    let cleaned = phone.replace(/[\s()-]/g, "");
    if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
    return cleaned;
  };

  const signIn = async (phone, password) => {
    const email = normalizePhone(phone) + PHONE_DOMAIN;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error: error.message };
    await loadProfile(data.user.id);
    return { success: true, user: data.user };
  };

  const signUp = async ({
    phone,
    password,
    name,
    gender,
    age,
    email: realEmail,
  }) => {
    const internalEmail = normalizePhone(phone) + PHONE_DOMAIN;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: internalEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/reset-password",
        },
      },
    );

    if (signUpError) return { success: false, error: signUpError.message };

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signUpData.user.id,
      phone: normalizePhone(phone),
      name,
      gender,
      age: Number(age),
      email: realEmail || null,
    });

    if (profileError) {
      console.error("Error creando perfil:", profileError.message);
      // Intento de rollback (opcional)
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return { success: false, error: "Error al crear el perfil" };
    }

    await loadProfile(signUpData.user.id);
    return { success: true, user: signUpData.user };
  };

  const resetPasswordRequest = async (phone) => {
    const normalized = normalizePhone(phone);
    const { data: prof, error: fetchErr } = await supabase
      .from("profiles")
      .select("email")
      .eq("phone", normalized)
      .single();

    if (fetchErr || !prof?.email) {
      return {
        success: false,
        error: "No encontramos correo asociado a ese número",
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(prof.email, {
      redirectTo: window.location.origin + "/reset-password",
    });

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      message:
        "Enlace enviado. Revisa tu correo (incluida la carpeta de spam).",
    };
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    resetPasswordRequest,
    updatePassword,
    signOut,
    normalizePhone,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
