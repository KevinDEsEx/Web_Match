import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import { toast } from "react-toastify";
import SearchFilterBar from "../components/SearchFilterBar";

const CACHE_KEY_PROFILES = "matches_profiles";
const CACHE_KEY_LIKES = "matches_likes_set";
const RENDER_LIMIT = 40;

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

  // Filtro proactivo para evitar "matches fantasma" incluso con caché lento
  const filteredProfiles = profiles.filter((p) => {
    const matchSearch = p.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchGender = genderFilter ? p.gender === genderFilter : true;
    
    // Si ya cargamos los likes (de caché o DB), filtramos estrictamente.
    // Si aún no hay nada de nada, mostramos para evitar parpadeo blanco total 
    // pero usualmente el caché de likes lo resuelve.
    const stillLiked = !likesLoaded || likes.has(p.id);

    return matchSearch && matchGender && stillLiked;
  });

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- INICIO ---------- */

  useEffect(() => {
    // 1. Intentar cargar TODO desde caché para evitar el parpadeo de 1 segundo
    const cachedProfiles = sessionStorage.getItem(CACHE_KEY_PROFILES);
    const cachedLikes = sessionStorage.getItem(CACHE_KEY_LIKES);

    if (cachedProfiles) {
      setProfiles(JSON.parse(cachedProfiles));
    }
    
    if (cachedLikes) {
      setLikes(new Set(JSON.parse(cachedLikes)));
      setLikesLoaded(true);
    }

    if (cachedProfiles) {
      setLoading(false);
    }

    // 2. Refrescar datos reales de la DB
    initData();
  }, []);

  async function initData() {
    // Cargamos en paralelo
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

  /* ---------- REALTIME ---------- */

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime-v4")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          const { new: newRow, old: oldRow } = payload;
          const uid = userIdRef.current;
          if (newRow?.user1 === uid || newRow?.user2 === uid ||
              oldRow?.user1 === uid || oldRow?.user2 === uid) {
            loadMatches();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        (payload) => {
          const { new: newRow, old: oldRow } = payload;
          const uid = userIdRef.current;
          if (newRow?.from_user === uid || oldRow?.from_user === uid) {
            loadLikes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------- ESCUCHAR LIKES UPDATED GLOBAL ---------- */

  useEffect(() => {
    function handleLikesUpdate() {
      loadLikes();
      loadMatches();
    }
    window.addEventListener("likesUpdated", handleLikesUpdate);
    return () => window.removeEventListener("likesUpdated", handleLikesUpdate);
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
      // Guardar en caché para el próximo inicio
      sessionStorage.setItem(CACHE_KEY_LIKES, JSON.stringify(likesArray));
    }
  }

  /* ---------- CARGAR MATCHES ---------- */

  async function loadMatches() {
    // Si no tenemos perfiles aún, mostramos carga. Si ya hay (por caché), carga silenciosa.
    if (profiles.length === 0) setLoading(true);

    const { data, error } = await supabase.rpc("get_user_matches", {
      p_user: user.id,
    });

    if (error) {
      console.error("Error cargando matches:", error);
      setLoading(false);
      return;
    }

    const matchUsers = data ?? [];
    const uniqueMap = new Map();
    matchUsers.forEach((u) => uniqueMap.set(u.id, u));
    const uniqueUsers = Array.from(uniqueMap.values());

    setProfiles(uniqueUsers);
    sessionStorage.setItem(CACHE_KEY_PROFILES, JSON.stringify(uniqueUsers));
    setLoading(false);
  }

  /* ---------- LIKE / UNLIKE ---------- */

  async function toggleLike(id) {
    const isLiked = likes.has(id);

    if (isLiked) {
      // Optimistic UI
      const newLikes = new Set(likes);
      newLikes.delete(id);
      setLikes(newLikes);
      sessionStorage.setItem(CACHE_KEY_LIKES, JSON.stringify(Array.from(newLikes)));
      
      await supabase
        .from("likes")
        .delete()
        .eq("from_user", user.id)
        .eq("to_user", id);
    } else {
      await supabase
        .from("likes")
        .upsert(
          { from_user: user.id, to_user: id },
          { onConflict: "from_user,to_user" }
        );
      await loadLikes();
    }

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
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <p className="text-lg font-semibold text-gray-600">Aún no tienes matches</p>
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

      {mode === 0 && (
        <div className="grid grid-cols-1 gap-6 p-3 max-w-md mx-auto">
          {filteredProfiles.map((p) => (
            <div key={p.id} className="flex flex-col items-center w-full">
              <div className="w-full">
                <UserCard
                  user={p}
                  liked={likes.has(p.id)}
                  onLike={toggleLike}
                  grid={false}
                  isMe={false}
                />
              </div>
              <button
                onClick={() => openWhatsapp(p)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-semibold shadow-lg hover:scale-105 active:scale-95 transition animate-pulse"
              >
                <span className="material-symbols-outlined">chat</span>
                Enviar WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 1 && (
        <div className="grid grid-cols-2 gap-4 p-3 max-w-md mx-auto">
          {filteredProfiles.map((p) => (
            <div key={p.id} className="flex flex-col items-center w-full">
              <div className="w-full">
                <UserCard
                  user={p}
                  liked={likes.has(p.id)}
                  onLike={toggleLike}
                  grid={true}
                  isMe={false}
                />
              </div>
              <button
                onClick={() => openWhatsapp(p)}
                className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-500 text-white text-sm shadow hover:scale-105 active:scale-95 transition"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
