import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import { toast } from "react-toastify";
import SearchFilterBar from "../components/SearchFilterBar";

const CACHE_KEY = "matches_profiles";
const RENDER_LIMIT = 40;

export default function Matches({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [mode, setMode] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  // Usamos ref para que las funciones del canal realtime siempre
  // lean el user.id más reciente sin crear closures stale.
  const userIdRef = useRef(user?.id);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const filteredProfiles = profiles.filter((p) => {
    const matchSearch = p.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchGender = genderFilter ? p.gender === genderFilter : true;

    return matchSearch && matchGender;
  });

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- INICIO ---------- */

  useEffect(() => {
    // Cargar caché inmediatamente para mostrar algo mientras llegan los datos
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      setProfiles(JSON.parse(cached));
      setLoading(false);
    }

    // Carga en paralelo: likes y matches de forma independiente
    loadLikes();
    loadMatches();
  }, []);

  /* ---------- CAMBIO DE MODO ---------- */

  useEffect(() => {
    function handleMode(e) {
      if (e.detail === 2) {
        setMode(0);
      } else {
        setMode(e.detail);
      }
    }

    window.addEventListener("changeMode", handleMode);
    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  /* ---------- REALTIME (tabla matches) ---------- */

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const { new: newRow, old: oldRow } = payload;
          const uid = userIdRef.current;
          const affected =
            newRow?.user1 === uid ||
            newRow?.user2 === uid ||
            oldRow?.user1 === uid ||
            oldRow?.user2 === uid;

          if (affected) {
            loadLikes();
            loadMatches();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------- ESCUCHAR CAMBIO GLOBAL (likesUpdated) ---------- */

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
      setLikes(new Set(data.map((l) => l.to_user)));
    }
  }

  /* ---------- CARGAR MATCHES ---------- */

  async function loadMatches() {
    setLoading(true);

    const { data, error } = await supabase.rpc("get_user_matches", {
      p_user: user.id,
    });

    if (error) {
      console.error("Error cargando matches:", error);
      setLoading(false);
      return;
    }

    // El RPC ya devuelve solo los usuarios con los que hay match mutuo.
    // NO filtramos por `likes` aquí para evitar el race condition de estado stale.
    const matchUsers = data ?? [];

    // Eliminar duplicados por id (defensa extra)
    const uniqueMap = new Map();
    matchUsers.forEach((u) => uniqueMap.set(u.id, u));
    const uniqueUsers = Array.from(uniqueMap.values());

    setProfiles(uniqueUsers);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(uniqueUsers));

    setLoading(false);
  }

  /* ---------- LIKE / UNLIKE ---------- */

  async function toggleLike(id) {
    const liked = likes.has(id);

    if (liked) {
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
          { onConflict: "from_user,to_user" },
        );
    }

    await loadLikes();
    await loadMatches();

    window.dispatchEvent(new Event("likesUpdated"));
  }

  /* ---------- WHATSAPP ---------- */

  function openWhatsapp(profile) {
    if (!profile.phone) {
      toast.warning("Este usuario no tiene teléfono registrado.");
      return;
    }

    const message =
      `Hola ${profile.name} 👋\n` +
      `Hicimos match en TENEX ❤️\n\n` +
      `Quería saludarte 😊`;

    const url = `https://wa.me/${profile.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">

      {/* Estado de carga */}
      {loading && (
        <div className="flex justify-center mt-20">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Sin matches: fijo en pantalla, no hace scroll */}
      {!loading && profiles.length === 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <p className="text-lg font-semibold text-gray-600">
            Aún no tienes matches
          </p>
          <p className="text-sm mt-2 text-gray-400 text-center px-6">
            Cuando dos personas se interesen mutuamente aparecerán aquí ❤️
          </p>
        </div>
      )}

      {/* Barra de búsqueda */}
      {!loading && profiles.length > 0 && (
        <SearchFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
        />
      )}

      {/* Vista lista */}
      {!loading && mode === 0 && (
        <div className="grid grid-cols-1 gap-6 p-3 max-w-md mx-auto">
          {visibleProfiles.map((p) => (
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

      {/* Vista grid */}
      {!loading && mode === 1 && (
        <div className="grid grid-cols-2 gap-4 p-3 max-w-md mx-auto">
          {visibleProfiles.map((p) => (
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
