import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import SwipeCard from "../components/SwipeCard";

const PAGE_SIZE = 6;

export default function Explore({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(0);

  const [swipeIndex, setSwipeIndex] = useState(0);

  const loader = useRef(null);

  useEffect(() => {
    function handleMode(e) {
      setMode(e.detail);
      setSwipeIndex(0);
    }

    window.addEventListener("changeMode", handleMode);

    return () => window.removeEventListener("changeMode", handleMode);
  }, []);

  useEffect(() => {
    loadLikes();
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [page]);

  useEffect(() => {
    if (mode === 2) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        setPage((p) => p + 1);
      }
    });

    if (loader.current) observer.observe(loader.current);
  }, [loading, mode]);

  async function loadLikes() {
    const { data } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (data) {
      setLikes(new Set(data.map((l) => l.to_user)));
    }
  }

  async function loadProfiles() {
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase.from("users").select("*").range(from, to);

    if (data) {
      const filtered = data.filter((p) => p.id !== user.id);
      const shuffled = filtered.sort(() => Math.random() - 0.5);

      setProfiles((prev) => [...prev, ...shuffled]);
    }

    setLoading(false);
  }

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
    }

    window.dispatchEvent(new Event("likesUpdated"));
  }

  function handleSwipeLike(id) {
    toggleLike(id);
    setSwipeIndex((i) => i + 1);
  }

  function handleSwipeSkip() {
    setSwipeIndex((i) => i + 1);
  }

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
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
