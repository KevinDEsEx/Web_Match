import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function AuthGate({ user }) {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles") // ← CAMBIO AQUÍ
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error al verificar perfil:", error);
          navigate("/complete-profile", { replace: true });
          return;
        }

        if (data) {
          navigate("/explore", { replace: true });
        } else {
          navigate("/complete-profile", { replace: true });
        }
      } catch (err) {
        console.error("Excepción en checkProfile:", err);
        navigate("/complete-profile", { replace: true });
      }
    }

    if (user?.id) {
      checkProfile();
    } else {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white gap-6">
      <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>

      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700">
          Preparando tu experiencia
        </p>
        <p className="text-sm text-gray-500">Esto solo tomará un momento...</p>
      </div>
    </div>
  );
}
