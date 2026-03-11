import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function BottomNav() {
  const location = useLocation();

  const base =
    "relative flex flex-col items-center justify-center gap-1 text-xs transition active:scale-90";

  const [matchCount, setMatchCount] = useState(0);

  /* Cargar contador guardado */

  useEffect(() => {
    const saved = localStorage.getItem("new_matches");

    if (saved) {
      setMatchCount(parseInt(saved));
    }
  }, []);

  /* Reset cuando se entra a matches */

  useEffect(() => {
    if (location.pathname === "/matches") {
      setMatchCount(0);
      localStorage.setItem("new_matches", 0);
    }
  }, [location.pathname]);

  /* Detectar nuevos matches */

  useEffect(() => {
    async function checkMatches() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const userId = session.user.id;

      /* likes que yo hice */

      const { data: myLikes } = await supabase
        .from("likes")
        .select("to_user")
        .eq("from_user", userId);

      if (!myLikes) return;

      const ids = myLikes.map((l) => l.to_user);

      if (ids.length === 0) return;

      /* likes recíprocos */

      const { data: matches } = await supabase
        .from("likes")
        .select("from_user")
        .in("from_user", ids)
        .eq("to_user", userId);

      if (!matches) return;

      const newCount = matches.length;

      const stored = parseInt(localStorage.getItem("new_matches") || "0");

      if (newCount > stored) {
        setMatchCount(newCount);
        localStorage.setItem("new_matches", newCount);
      }
    }

    checkMatches();

    /* escuchar evento global */

    function handleUpdate() {
      checkMatches();
    }

    window.addEventListener("likesUpdated", handleUpdate);

    return () => {
      window.removeEventListener("likesUpdated", handleUpdate);
    };
  }, []);

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 px-4 pb-6">
      <div className="flex h-16 items-center justify-around rounded-full bg-white/95 shadow-xl backdrop-blur-xl border border-gray-200">
        {/* EXPLORE */}

        <NavLink
          to="/"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined text-2xl">explore</span>
          <span>Explorar</span>
        </NavLink>

        {/* INTERESES */}

        <NavLink
          to="/likes"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined text-2xl">star</span>
          <span>Intereses</span>
        </NavLink>

        {/* MATCHES */}

        <NavLink
          to="/matches"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <div className="relative">
            <span className="material-symbols-outlined text-2xl">forum</span>

            {matchCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full min-w-[16px] text-center">
                {matchCount}
              </span>
            )}
          </div>

          <span>Matches</span>
        </NavLink>

        {/* PERFIL */}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined text-2xl">person</span>
          <span>Perfil</span>
        </NavLink>
      </div>
    </nav>
  );
}
