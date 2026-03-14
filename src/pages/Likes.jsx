import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import SearchFilterBar from "../components/SearchFilterBar";

const CACHE_KEY = "likes_profiles";
const RENDER_LIMIT = 40;

export default function Likes({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  /* ---------- FILTROS OPTIMIZADOS ---------- */

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch = p.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchGender = genderFilter ? p.gender === genderFilter : true;

      return matchSearch && matchGender;
    });
  }, [profiles, searchQuery, genderFilter]);

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- CACHE + CARGA INICIAL ---------- */

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);

    if (cached) {
      setProfiles(JSON.parse(cached));
      setLoading(false);
    } else {
      loadLikes();
    }
  }, []);

  /* ---------- ESCUCHAR CAMBIOS DE LIKES ---------- */

  useEffect(() => {
    function reload() {
      loadLikes();
    }

    window.addEventListener("likesUpdated", reload);

    return () => window.removeEventListener("likesUpdated", reload);
  }, []);

  /* ---------- ESCUCHAR CAMBIO DE MODO ---------- */

  useEffect(() => {
    function handleMode(e) {
      setMode(e.detail);
    }

    window.addEventListener("changeMode", handleMode);

    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  /* ---------- CARGAR LIKES ---------- */

  async function loadLikes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("likes")
      .select(
        `
        to_user,
        users:to_user (*)
      `,
      )
      .eq("from_user", user.id);

    if (error || !data) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const users = data.map((l) => l.users).filter(Boolean);

    /* eliminar duplicados */

    const uniqueMap = new Map();
    users.forEach((u) => uniqueMap.set(u.id, u));

    const uniqueUsers = Array.from(uniqueMap.values());

    setProfiles(uniqueUsers);

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(uniqueUsers));

    setLoading(false);
  }

  /* ---------- QUITAR LIKE ---------- */

  async function toggleLike(id) {
    await supabase
      .from("likes")
      .delete()
      .eq("from_user", user.id)
      .eq("to_user", id);

    const updated = profiles.filter((u) => u.id !== id);

    setProfiles(updated);

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new Event("likesUpdated"));
  }

  /* ---------- LOADER ---------- */

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">
      {profiles.length === 0 && (
        <div className="text-center mt-20 text-gray-500">
          <p className="text-lg font-semibold">Aún no has marcado intereses</p>

          <p className="text-sm mt-2">
            Explora perfiles y toca dos veces para guardar tus favoritos ❤️
          </p>
        </div>
      )}

      {profiles.length > 0 && (
        <SearchFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
        />
      )}

      <div
        className={`p-3 gap-3 grid ${
          mode === 1 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {visibleProfiles.map((p) => (
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
