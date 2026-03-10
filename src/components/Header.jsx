import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Header() {
  const location = useLocation();
  const [mode, setMode] = useState(0);

  useEffect(() => {
    setMode(0);
  }, [location.pathname]);

  const exploreModes = ["grid_view", "favorite", "view_agenda"];
  const simpleModes = ["grid_view", "view_agenda"];

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
    } else {
      return simpleModes[mode];
    }
  }

  function getTitle() {
    switch (location.pathname) {
      case "/":
        return "Explorar";
      case "/likes":
        return "Intereses";
      case "/matches":
        return "Matches";
      case "/profile":
        return "Perfil";
      default:
        return "";
    }
  }

  if (location.pathname === "/profile") return null;

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold">{getTitle()}</h1>

        <button
          onClick={nextMode}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:scale-110 transition"
        >
          <span className="material-symbols-outlined">{getNextIcon()}</span>
        </button>
      </div>
    </header>
  );
}
