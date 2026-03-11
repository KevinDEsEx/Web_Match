import { useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

export default function Header() {
  const location = useLocation();
  const [mode, setMode] = useState(0);

  useEffect(() => {
    setMode(0);
  }, [location.pathname]);

  const exploreModes = useMemo(
    () => ["grid_view", "favorite", "view_agenda"],
    [],
  );

  const simpleModes = useMemo(() => ["grid_view", "view_agenda"], []);

  function nextMode() {
    let next;

    if (location.pathname === "/") {
      next = (mode + 1) % 3;
    } else {
      next = (mode + 1) % 2;
    }

    setMode(next);

    window.dispatchEvent(new CustomEvent("changeMode", { detail: next }));
  }

  function getNextIcon() {
    if (location.pathname === "/") {
      return exploreModes[mode];
    }

    return simpleModes[mode];
  }

  const title = useMemo(() => {
    switch (location.pathname) {
      case "/":
        return "Explorar";
      case "/likes":
        return "Intereses";
      case "/matches":
        return "Matches";
      default:
        return "";
    }
  }, [location.pathname]);

  if (location.pathname === "/profile") return null;

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold tracking-wide">{title}</h1>

        <button
          onClick={nextMode}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition active:scale-90"
        >
          <span className="material-symbols-outlined text-[22px]">
            {getNextIcon()}
          </span>
        </button>
      </div>
    </header>
  );
}
