import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";

export default function Likes({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [mode, setMode] = useState(0);

  // cargar likes inicial
  useEffect(() => {
    loadLikes();
  }, []);

  // escuchar cambios globales de likes
  useEffect(() => {
    function reload() {
      loadLikes();
    }

    window.addEventListener("likesUpdated", reload);

    return () => window.removeEventListener("likesUpdated", reload);
  }, []);

  // escuchar cambio de modo desde el header
  useEffect(() => {
    function handleMode(e) {
      setMode(e.detail);
    }

    window.addEventListener("changeMode", handleMode);

    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  // cargar usuarios que has marcado
  async function loadLikes() {
    const { data } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (!data || data.length === 0) {
      setProfiles([]);
      return;
    }

    const ids = data.map((l) => l.to_user);

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .in("id", ids);

    setProfiles(users || []);
  }

  // desmarcar interés
  async function toggleLike(id) {
    await supabase
      .from("likes")
      .delete()
      .eq("from_user", user.id)
      .eq("to_user", id);

    // eliminar de la lista actual
    setProfiles((prev) => prev.filter((u) => u.id !== id));

    // avisar al resto de pantallas
    window.dispatchEvent(new Event("likesUpdated"));
  }

  return (
    <div className="min-h-screen pb-28">
      {profiles.length === 0 && (
        <div className="text-center mt-20 text-gray-500">
          <p className="text-lg font-semibold">Aún no has marcado intereses</p>

          <p className="text-sm mt-2">
            Explora perfiles y toca dos veces para guardar tus favoritos ❤️
          </p>
        </div>
      )}

      <div
        className={`p-3 gap-3 grid ${
          mode === 1 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {profiles.map((p) => (
          <UserCard
            key={p.id}
            user={p}
            liked={true}
            onLike={toggleLike}
            grid={mode === 1}
            isMe={false}
          />
        ))}
      </div>
    </div>
  );
}
