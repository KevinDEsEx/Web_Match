import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import UserCard from "../components/UserCard";

export default function Matches({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [mode, setMode] = useState(0);

  useEffect(() => {
    loadMatches();
  }, []);

  // escuchar cambio de modo
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

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel("likes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
        },
        () => {
          loadMatches();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMatches() {
    const { data: myLikes } = await supabase
      .from("likes")
      .select("to_user")
      .eq("from_user", user.id);

    if (!myLikes || myLikes.length === 0) {
      setProfiles([]);
      return;
    }

    const ids = myLikes.map((l) => l.to_user);

    const { data: mutualLikes } = await supabase
      .from("likes")
      .select("from_user")
      .in("from_user", ids)
      .eq("to_user", user.id);

    const matchIds = mutualLikes?.map((l) => l.from_user) || [];

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .in("id", ids);

    if (!users) return;

    const enriched = users.map((u) => ({
      ...u,
      matchActive: matchIds.includes(u.id),
    }));

    setProfiles(enriched);
  }

  function openWhatsapp(profile) {
    if (!profile.phone) {
      alert("Este usuario no tiene teléfono registrado.");
      return;
    }

    const message =
      `Hola ${profile.name} 👋\n` +
      `Hicimos match en TENEX ❤️\n\n` +
      `Quería saludarte y romper el hielo 😊`;

    const url = `https://wa.me/${profile.phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen pb-28">
      {profiles.length === 0 && (
        <div className="text-center mt-20 text-gray-500">
          <p className="text-lg font-semibold">Aún no tienes matches</p>

          <p className="text-sm mt-2">
            Cuando dos personas se interesan mutuamente aparecerán aquí ❤️
          </p>
        </div>
      )}

      {/* TARJETAS GRANDES */}
      {mode === 0 && (
        <div className="grid grid-cols-1 gap-6 p-3 max-w-md mx-auto">
          {profiles.map((p) => (
            <div key={p.id} className="flex flex-col items-center w-full">
              {/* 🔥 FIX: w-full */}
              <div className="w-full">
                <UserCard
                  user={p}
                  liked={true}
                  onLike={() => {}}
                  grid={false}
                  isMe={false}
                />
              </div>

              {p.matchActive ? (
                <button
                  onClick={() => openWhatsapp(p)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl 
                  bg-green-500 text-white font-semibold shadow-lg
                  hover:scale-105 active:scale-95 transition animate-pulse"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Enviar WhatsApp
                </button>
              ) : (
                <div
                  className="mt-3 w-full px-6 py-3 rounded-xl 
                  bg-gray-200 text-gray-600 text-center font-semibold"
                >
                  Tuvieron match pero ya no
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GRID */}
      {mode === 1 && (
        <div className="grid grid-cols-2 gap-4 p-3 max-w-md mx-auto">
          {profiles.map((p) => (
            <div key={p.id} className="flex flex-col items-center w-full">
              {/* 🔥 FIX */}
              <div className="w-full">
                <UserCard
                  user={p}
                  liked={true}
                  onLike={() => {}}
                  grid={true}
                  isMe={false}
                />
              </div>

              {p.matchActive ? (
                <button
                  onClick={() => openWhatsapp(p)}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2
                  rounded-lg bg-green-500 text-white text-sm
                  shadow hover:scale-105 active:scale-95 transition"
                >
                  <span className="material-symbols-outlined text-sm">
                    chat
                  </span>
                  WhatsApp
                </button>
              ) : (
                <div
                  className="mt-2 w-full px-3 py-2 rounded-lg 
                  bg-gray-200 text-gray-600 text-center text-xs font-semibold"
                >
                  Match finalizado
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
