import { useState, useEffect } from "react";

const genders = ["Todos", "Hombre", "Mujer", "Otro"];

export default function SearchFilters({ onChange, results }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("Todos");

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ search: search.trim(), gender });
    }, 250);

    return () => clearTimeout(timer);
  }, [search, gender, onChange]); // ← AÑADIDO onChange

  return (
    <div className="sticky top-[56px] z-30 backdrop-blur-md bg-white/90 px-3 pt-3 pb-2 space-y-3 border-b border-gray-100">
      {/* BUSCADOR */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
        />
      </div>

      {/* PÍLDORAS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {genders.map((g) => {
          const isActive = gender === g;
          return (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-pink-500 text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {results !== undefined && (
        <p className="text-xs text-gray-500 pl-1">
          {results} resultado{results !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
