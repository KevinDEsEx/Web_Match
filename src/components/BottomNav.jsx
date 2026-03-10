import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const base =
    "flex flex-col items-center justify-center gap-1 text-xs transition active:scale-90";

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 px-4 pb-6">
      <div className="flex h-16 items-center justify-around rounded-full bg-white/95 shadow-xl backdrop-blur-xl border border-gray-200">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined">explore</span>
          <span>Explorar</span>
        </NavLink>

        <NavLink
          to="/likes"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined">star</span>
          <span>Intereses</span>
        </NavLink>

        <NavLink
          to="/matches"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined">forum</span>
          <span>Matches</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-pink-500" : "text-gray-500"}`
          }
        >
          <span className="material-symbols-outlined">person</span>
          <span>Perfil</span>
        </NavLink>
      </div>
    </nav>
  );
}
