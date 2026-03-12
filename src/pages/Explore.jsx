import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import SwipeCard from "../components/SwipeCard";

const PAGE_SIZE = 12;
const CACHE_KEY = "explore_profiles";
const MAX_CACHE = 120;

export default function Explore({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(0);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [cursor, setCursor] = useState(null);

  const loader = useRef(null);
  const loadingRef = useRef(false);

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
    const preloadCount = mode === 1 ? 10 : 6;

    list.slice(0, preloadCount).forEach((p) => {
      if (!p.photo) return;

      const img = new Image();
      img.src = `${p.photo}?width=500&quality=70`;
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

        const trimmed = merged.slice(-MAX_CACHE);

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));

        preloadImages(data);

        return trimmed;
      });

      setCursor(data[data.length - 1].created_at);
    }

    /* Si se terminan los perfiles → reiniciar */

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

      const { data: match } = await supabase
        .from("likes")
        .select("*")
        .eq("from_user", id)
        .eq("to_user", user.id)
        .maybeSingle();

      if (match) {
        console.log("MATCH!");
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
    <div className="min-h-screen pb-28">
      {mode === 0 && (
        <div className="grid grid-cols-1 gap-4 p-3">
          {profiles.map((p) => (
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
          {profiles.map((p) => (
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

          {profiles.slice(swipeIndex, swipeIndex + 1).map((p) => (
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
