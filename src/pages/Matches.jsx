import { useEffect, useState } from "react";
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

  const filteredProfiles = profiles.filter((p) => {
    const matchSearch = p.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchGender = genderFilter ? p.gender === genderFilter : true;

    return matchSearch && matchGender;
  });

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- CACHE ---------- */

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);

    if (cached) {
      setProfiles(JSON.parse(cached));
      setLoading(false);
    }

    loadMatches();
    loadLikes();
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

  /* ---------- REALTIME ---------- */

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
        },
        (payload) => {
          // Solo recargar si el cambio nos afecta
          const { new: newRow, old: oldRow } = payload;
          const affected =
            newRow?.from_user === user.id ||
            newRow?.to_user === user.id ||
            oldRow?.from_user === user.id ||
            oldRow?.to_user === user.id;

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

  /* ---------- ESCUCHAR CAMBIO GLOBAL ---------- */

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
      console.error(error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setProfiles([]);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify([]));
      setLoading(false);
      return;
    }

    /* FILTRAR SOLO MATCHES REALES */

    const validMatches = data.filter((p) => likes.has(p.id));

    const uniqueMap = new Map();

    validMatches.forEach((u) => {
      uniqueMap.set(u.id, u);
    });

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
      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center mt-20 text-gray-500">
          <p className="text-lg font-semibold">Aún no tienes matches</p>
          <p className="text-sm mt-2">
            Cuando dos personas se interesen mutuamente aparecerán aquí ❤️
          </p>
        </div>
      ) : null}

      {!loading && profiles.length > 0 && (
        <SearchFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
        />
      )}

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
