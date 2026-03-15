import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import SwipeCard from "../components/SwipeCard";
import SearchFilterBar from "../components/SearchFilterBar";
import MatchModal from "../components/MatchModal";

const PAGE_SIZE = 12;
const CACHE_KEY = "explore_profiles";
const MAX_CACHE = 120;
const RENDER_LIMIT = 40;

export default function Explore({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(0);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null); // para el modal de match

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const loader = useRef(null);
  const loadingRef = useRef(false);

  /* perfiles filtrados y renderizados */
  const filteredProfiles = profiles.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGender = genderFilter ? p.gender === genderFilter : true;
    return matchSearch && matchGender;
  });

  const visibleProfiles = filteredProfiles.slice(0, RENDER_LIMIT);

  /* ---------- RESET SWIPE INDEX EN BÚSQUEDA ---------- */
  useEffect(() => {
    setSwipeIndex(0);
  }, [searchQuery, genderFilter]);

  /* ---------- CAMBIO DE MODO ---------- */
  useEffect(() => {
    function handleMode(e) {
      setMode(e.detail);
      setSwipeIndex(0);
    }
    window.addEventListener("changeMode", handleMode);
    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  /* ---------- CACHE ---------- */
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      setProfiles(parsed);
    }
  }, []);

  /* ---------- CARGAR LIKES ---------- */
  useEffect(() => {
    loadLikes();
  }, []);

  async function loadLikes() {
    const { data } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (data) {
      setLikes(new Set(data.map((l) => l.to_user)));
    }
  }

  /* ---------- REALTIME (likes propios para mantener el corazón actualizado) ---------- */
  useEffect(() => {
    const channel = supabase
      .channel("explore-likes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
        },
        (payload) => {
          const { new: newRow, old: oldRow } = payload;
          if (newRow?.from_user === user.id || oldRow?.from_user === user.id) {
            loadLikes();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------- SCROLL INFINITO ---------- */
  useEffect(() => {
    if (mode === 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadProfiles();
        }
      },
      { rootMargin: "1000px" },
    );

    const current = loader.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [mode, cursor]);

  /* ---------- PRECARGA DE IMÁGENES ---------- */
  function preloadImages(list) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => executePreload(list), { timeout: 2000 });
    } else {
      setTimeout(() => executePreload(list), 1000);
    }
  }

  function executePreload(list) {
    const preloadCount = mode === 1 ? 6 : 4;
    list.slice(0, preloadCount).forEach((p) => {
      if (!p.photo) return;
      const img = new Image();
      img.src = `${p.photo}?width=400&quality=60`;
    });
  }

  /* ---------- CARGAR PERFILES ---------- */
  async function loadProfiles() {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const { data, error } = await supabase.rpc("get_explore_profiles_v2", {
      p_user: user.id,
      last_created: cursor,
      limit_count: PAGE_SIZE,
    });

    if (!error && data && data.length > 0) {
      setProfiles((prev) => {
        const merged = [...prev, ...data];
        const uniqueMap = new Map();
        merged.forEach((p) => uniqueMap.set(p.id, p));
        const unique = Array.from(uniqueMap.values());
        const trimmed = unique.slice(-MAX_CACHE);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        preloadImages(unique);
        return trimmed;
      });
      setCursor(data[data.length - 1].created_at);
    }

    if (!data || data.length < PAGE_SIZE) {
      setCursor(null);
    }

    setLoading(false);
    loadingRef.current = false;
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

      const newLikes = new Set(likes);
      newLikes.delete(id);
      setLikes(newLikes);
    } else {
      await supabase
        .from("likes")
        .upsert(
          { from_user: user.id, to_user: id },
          { onConflict: "from_user,to_user" },
        );

      setLikes(new Set([...likes, id]));

      // Comprobar si hay match mutuo y mostrar modal
      const { data: mutualLike } = await supabase
        .from("likes")
        .select("from_user")
        .eq("from_user", id)
        .eq("to_user", user.id)
        .maybeSingle();

      if (mutualLike) {
        // Obtener perfil de la otra persona para el modal
        const { data: otherProfile } = await supabase
          .from("users")
          .select("name, photo")
          .eq("id", id)
          .maybeSingle();

        if (otherProfile) {
          setMatchedUser(otherProfile);
        }
      }
    }

    window.dispatchEvent(new Event("likesUpdated"));
  }

  /* ---------- SWIPE ---------- */
  function handleSwipeLike(id) {
    toggleLike(id);
    setSwipeIndex((i) => i + 1);
  }

  function handleSwipeSkip() {
    setSwipeIndex((i) => i + 1);
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen pb-28 bg-gray-50 border-t">

      {/* Modal de Match */}
      {matchedUser && (
        <MatchModal
          user={matchedUser}
          onClose={() => setMatchedUser(null)}
        />
      )}

      {mode !== 2 && (
        <SearchFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
        />
      )}

      {mode === 0 && (
        <div className="grid grid-cols-1 gap-4 p-3 mb-6">
          {visibleProfiles.map((p) => (
            <UserCard
              key={p.id}
              user={p}
              liked={likes.has(p.id)}
              onLike={toggleLike}
              grid={false}
              isMe={false}
            />
          ))}
        </div>
      )}

      {mode === 1 && (
        <div className="grid grid-cols-2 gap-3 p-3">
          {visibleProfiles.map((p) => (
            <UserCard
              key={p.id}
              user={p}
              liked={likes.has(p.id)}
              onLike={toggleLike}
              grid={true}
              isMe={false}
            />
          ))}
        </div>
      )}

      {mode === 2 && (
        <div className="relative flex flex-col items-center mt-6 px-4">
          <div className="text-sm text-gray-500 mb-4 text-center">
            Desliza → para marcar interés ❤️
            <br />
            Desliza ← para pasar
          </div>

          {filteredProfiles.slice(swipeIndex, swipeIndex + 1).map((p) => (
            <SwipeCard
              key={p.id}
              user={p}
              onLike={handleSwipeLike}
              onSkip={handleSwipeSkip}
            />
          ))}
        </div>
      )}

      {mode !== 2 && (
        <div ref={loader} className="flex justify-center py-6">
          {loading && (
            <div className="grid grid-cols-2 gap-3 w-full px-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-gray-200 aspect-[3/4]"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
