import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import { toast } from "react-toastify";
import SearchFilterBar from "../components/SearchFilterBar";

const CACHE_KEY_PROFILES = "matches_profiles_v2";
const CACHE_KEY_LIKES = "matches_likes_set_v2";
const RENDER_LIMIT = 20;

export default function Matches({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [mode, setMode] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likesLoaded, setLikesLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const userIdRef = useRef(user?.id);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  /* 
     FILTRO PROACTIVO (Strict Consistency):
     Solo mostramos a alguien si:
     1. Está en la lista de perfiles que el servidor dice que son match.
     2. Nosotros (el cliente) aún tenemos el like activo hacia ellos. 
     Esto evita ver "fantasmas" mientras el trigger del servidor termina de borrar la fila.
  */
  const filteredProfiles = profiles.filter((p) => {
    // Si ya cargamos likes (de caché o DB), validamos que persista el like.
    // Si no han cargado aún, mostramos por defecto para evitar parpadeo.
    const hasMyLike = !likesLoaded || likes.has(p.id);
    if (!hasMyLike) return false;

    const matchSearch = p.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchGender = genderFilter ? p.gender === genderFilter : true;

    return matchSearch && matchGender;
  });

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- INICIALIZACIÓN ---------- */

  useEffect(() => {
    // 1. Cargar desde Caché (Cero parpadeo)
    const cachedProfiles = localStorage.getItem(CACHE_KEY_PROFILES);
    const cachedLikes = localStorage.getItem(CACHE_KEY_LIKES);

    if (cachedLikes) {
      const parsedLikes = JSON.parse(cachedLikes);
      setLikes(new Set(parsedLikes));
      setLikesLoaded(true);
    }

    if (cachedProfiles) {
      setProfiles(JSON.parse(cachedProfiles));
      setLoading(false);
    }

    // 2. Sincronizar con la DB
    refreshAll();
  }, []);

  async function refreshAll() {
    // Ejecutamos en paralelo para máxima velocidad
    await Promise.all([loadLikes(), loadMatches()]);
  }

  /* ---------- CAMBIO DE MODO ---------- */

  useEffect(() => {
    function handleMode(e) {
      if (e.detail === 2) setMode(0);
      else setMode(e.detail);
    }
    window.addEventListener("changeMode", handleMode);
    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  /* ---------- REALTIME (Supabase) ---------- */

  useEffect(() => {
    const channel = supabase
      .channel("matches-sync-v5")
      // Escuchar cambios en la tabla de MATCHES
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          const { new: n, old: o } = payload;
          const uid = userIdRef.current;
          if (
            n?.user1 === uid ||
            n?.user2 === uid ||
            o?.user1 === uid ||
            o?.user2 === uid
          ) {
            loadMatches();
          }
        },
      )
      // Escuchar cambios en la tabla de LIKES (muy importante para unlikes externos o triggers)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        (payload) => {
          const { new: n, old: o } = payload;
          const uid = userIdRef.current;
          if (n?.from_user === uid || o?.from_user === uid) {
            loadLikes();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------- ESCUCHAR EVENTO GLOBAL ---------- */

  useEffect(() => {
    function handleUpdate() {
      refreshAll();
    }
    window.addEventListener("likesUpdated", handleUpdate);
    return () => window.removeEventListener("likesUpdated", handleUpdate);
  }, []);

  /* ---------- CARGAR LIKES ---------- */

  async function loadLikes() {
    const { data } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (data) {
      const likesArray = data.map((l) => l.to_user);
      setLikes(new Set(likesArray));
      setLikesLoaded(true);
      localStorage.setItem(CACHE_KEY_LIKES, JSON.stringify(likesArray));
    }
  }

  /* ---------- CARGAR MATCHES ---------- */

  async function loadMatches() {
    // Si no hay nada en pantalla (ni caché), mostramos spinner
    if (profiles.length === 0) setLoading(true);

    const { data, error } = await supabase.rpc("get_user_matches", {
      p_user: user.id,
    });

    if (error) {
      console.error("Error RPC Matches:", error);
      setLoading(false);
      return;
    }

    const uniqueUsers = Array.from(
      new Map((data || []).map((u) => [u.id, u])).values(),
    );

    setProfiles(uniqueUsers);
    localStorage.setItem(CACHE_KEY_PROFILES, JSON.stringify(uniqueUsers));
    setLoading(false);
  }

  /* ---------- LIKE / UNLIKE ---------- */

  async function toggleLike(id) {
    const isCurrentlyLiked = likes.has(id);

    if (isCurrentlyLiked) {
      // 1. Optimistic UI: El usuario desaparece INMEDIATAMENTE de la lista
      const newLikes = new Set(likes);
      newLikes.delete(id);
      setLikes(newLikes);
      localStorage.setItem(
        CACHE_KEY_LIKES,
        JSON.stringify(Array.from(newLikes)),
      );

      // 2. DB: Borramos el like. El trigger de la DB (post-SQL fix) borrará el match.
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("from_user", user.id)
        .eq("to_user", id);

      if (error) toast.error("Error al quitar like");
    } else {
      // Dando like de nuevo
      const { error } = await supabase
        .from("likes")
        .upsert(
          { from_user: user.id, to_user: id },
          { onConflict: "from_user,to_user" },
        );

      if (error) toast.error("Error al dar like");
      else await loadLikes(); // Recargar para detectar el match
    }

    // Refrescar matches de la DB
    await loadMatches();
    window.dispatchEvent(new Event("likesUpdated"));
  }

  /* ---------- WHATSAPP ---------- */

  function openWhatsapp(profile) {
    if (!profile.phone) {
      toast.warning("Este usuario no tiene teléfono registrado.");
      return;
    }
    const message = `Hola ${profile.name} 👋\nHicimos match en TENEX ❤️\n\nQuería saludarte 😊`;
    const url = `https://wa.me/${profile.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">
      {loading && profiles.length === 0 && (
        <div className="flex justify-center mt-20">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filteredProfiles.length === 0 && (
        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-semibold text-gray-600">
            Aún no tienes matches
          </p>
          <p className="text-sm mt-2 text-gray-400 text-center px-6">
            Cuando dos personas se interesen mutuamente aparecerán aquí ❤️
          </p>
        </div>
      )}

      {(profiles.length > 0 || searchQuery || genderFilter) && (
        <SearchFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
        />
      )}

      {/* RENDER LIST O GRID USANDO filteredProfiles */}
      <div
        className={`p-3 max-w-md mx-auto grid gap-6 ${mode === 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {visibleProfiles.map((p) => (
          <div key={p.id} className="flex flex-col items-center w-full">
            <div className="w-full">
              <UserCard
                user={p}
                liked={likes.has(p.id)}
                onLike={toggleLike}
                grid={mode === 1}
                isMe={false}
              />
            </div>
            <button
              onClick={() => openWhatsapp(p)}
              className={`${mode === 1 ? "mt-2 py-2 px-3 text-sm rounded-lg" : "mt-3 py-3 px-6 rounded-xl animate-pulse"} 
                w-full flex items-center justify-center gap-2 bg-green-500 text-white font-semibold shadow-lg hover:scale-105 active:scale-95 transition`}
            >
              <span className="material-symbols-outlined text-base">chat</span>
              {mode === 1 ? "WhatsApp" : "Enviar WhatsApp"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
