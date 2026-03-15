import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";
import SearchFilterBar from "../components/SearchFilterBar";

const CACHE_KEY = "likes_profiles";
const RENDER_LIMIT = 40;

export default function Likes({ user }) {
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

  /* ---------- ESCUCHAR CAMBIOS DE OTRAS PÁGINAS ---------- */

  useEffect(() => {
    function handleLikesUpdate() {
      loadLikes();
    }

    window.addEventListener("likesUpdated", handleLikesUpdate);

    return () => window.removeEventListener("likesUpdated", handleLikesUpdate);
  }, []);

  /* ---------- CARGAR LIKES ---------- */

  async function loadLikes() {
    const { data: likeRows } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (!likeRows) {
      setProfiles([]);
      setLikes(new Set());
      setLoading(false);
      return;
    }

    const likedIds = likeRows.map((l) => l.to_user);

    setLikes(new Set(likedIds));

    if (likedIds.length === 0) {
      setProfiles([]);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify([]));
      setLoading(false);
      return;
    }

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .in("id", likedIds);

    if (users) {
      setProfiles(users);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(users));
    }

    setLoading(false);
  }

  /* ---------- REALTIME ---------- */

  useEffect(() => {
    const channel = supabase
      .channel("likes-page-realtime")
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

  /* ---------- LIKE / UNLIKE ---------- */

  async function toggleLike(id) {
    const liked = likes.has(id);

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("from_user", user.id)
        .eq("to_user", id);

      /* eliminar instantáneamente de la UI */

      setProfiles((prev) => prev.filter((p) => p.id !== id));

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

      await loadLikes();
    }

    window.dispatchEvent(new Event("likesUpdated"));
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
          <p className="text-lg font-semibold">No has dado likes aún</p>

          <p className="text-sm mt-2">
            Los perfiles que te gusten aparecerán aquí ❤️
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

      {mode === 0 && (
        <div className="grid grid-cols-1 gap-4 p-3">
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
    </div>
  );
}
